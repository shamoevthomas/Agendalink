import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getCalendarClient } from '@/lib/google-calendar';
import { sendEmail } from '@/lib/brevo';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const forceUserEmail = searchParams.get('user_email');

        // 1. Fetch users with reminders enabled
        let query = supabaseAdmin
            .from('al_admin_settings')
            .select('*');
        
        if (forceUserEmail) {
            query = query.eq('email', forceUserEmail);
        } else {
            query = query.eq('reminders_enabled', true);
        }

        const { data: users, error: usersError } = await query;

        if (usersError) throw usersError;
        console.log(`[Cron] Found ${users?.length || 0} users with reminders enabled`);

        let totalProcessed = 0;

        for (const user of users) {
            if (!user.google_refresh_token || !user.reminders_config || user.reminders_config.length === 0) {
                console.log(`[Cron] Skipping user ${user.email}: Missing token or config`);
                continue;
            }

            try {
                console.log(`[Cron] Processing user ${user.email}`);
                const calendar = await getCalendarClient(user.google_refresh_token);
                const now = new Date();
                const timeMin = now.toISOString();
                const timeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

                // 2. Sync Google Calendar events
                const { data: { items: events } } = await calendar.events.list({
                    calendarId: 'primary',
                    timeMin,
                    timeMax,
                    singleEvents: true,
                    orderBy: 'startTime',
                });

                if (!events || events.length === 0) {
                    console.log(`[Cron] No upcoming events found for ${user.email}`);
                    continue;
                }

                console.log(`[Cron] Found ${events.length} events for ${user.email}`);

                for (const event of events) {
                    if (!event.hangoutLink) continue;

                    const startTime = new Date(event.start?.dateTime || event.start?.date || '');
                    const diffMins = Math.floor((startTime.getTime() - now.getTime()) / (1000 * 60));
                    console.log(`[Cron] Event: ${event.summary}, starts in ${diffMins} mins`);

                    // Get or create meeting record
                    let { data: meeting } = await supabaseAdmin
                        .from('al_meetings')
                        .select('*')
                        .eq('google_event_id', event.id)
                        .single();

                    if (!meeting) {
                        console.log(`[Cron] Local meeting record not found for ${event.id}, creating...`);
                        const guestEmail = event.attendees?.find(a => !a.self)?.email;
                        const { data: newMeeting, error: insertError } = await supabaseAdmin
                            .from('al_meetings')
                            .insert({
                                google_event_id: event.id,
                                title: event.summary,
                                google_meet_link: event.hangoutLink,
                                host_email: user.email,
                                guest_email: guestEmail,
                                meeting_date: startTime.toISOString().split('T')[0],
                                meeting_time: startTime.toISOString().split('T')[1].split('.')[0],
                                sent_reminders: [],
                            })
                            .select()
                            .single();
                        
                        if (insertError) {
                            console.error(`[Cron] Failed to create meeting record:`, insertError);
                            continue;
                        }
                        meeting = newMeeting;
                    }

                    if (!meeting) continue;

                    const currentSentReminders = meeting.sent_reminders || [];
                    const newSentReminders = [...currentSentReminders];
                    let meetingUpdated = false;

                    // 3. Process each configured reminder
                    for (let i = 0; i < user.reminders_config.length; i++) {
                        const config = user.reminders_config[i];
                        const reminderId = config.id || `${config.type}_${config.value}_${i}`; // Fallback ID

                        if (newSentReminders.includes(reminderId)) {
                            continue;
                        }

                        let shouldSend = false;

                        if (config.type === 'at_event') {
                            if (diffMins <= 5 && diffMins >= -5) shouldSend = true;
                        } else if (config.type === 'before_event') {
                            const configMins = config.unit === 'hours' ? config.value * 60 : config.value;
                            if (diffMins <= configMins && diffMins >= configMins - 15) shouldSend = true;
                        } else if (config.type === 'at_booking') {
                            shouldSend = true;
                        }

                        if (shouldSend) {
                            try {
                                console.log(`[Cron] Triggering ${config.type} reminder for ${event.summary}`);
                                const guestEmail = event.attendees?.find(a => !a.self)?.email;
                                const hostName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Votre hôte';
                                const socialLinks = user.social_links || [];
                                const socialHtml = socialLinks.length > 0 
                                    ? `<table cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto;"><tr>${socialLinks.map((s: any) => `
                                        <td style="padding: 0 5px;">
                                            <a href="${s.url}" style="display: inline-block; padding: 8px 16px; background-color: #262626; border: 1px solid #333; border-radius: 12px; color: #ffffff; text-decoration: none; font-size: 10px; font-weight: bold; font-family: sans-serif; text-transform: uppercase; letter-spacing: 0.5px;">
                                                ${s.platform}
                                            </a>
                                        </td>
                                      `).join('')}</tr></table>`
                                    : '';

                                const guest = event.attendees?.find(a => !a.self);
                                const guestName = guest?.displayName || 'Invité';

                                const vars = {
                                    name: guestName,
                                    host_name: hostName,
                                    host_bio: user.bio || '',
                                    profile_img: user.profile_image || '',
                                    social_links: socialHtml,
                                    time: startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }),
                                    meet_link: event.hangoutLink,
                                };

                                const finalHtmlHost = (config.html_template || '')
                                    .replace(/{{name}}/g, hostName) // Name defaults to host for host email if we wanted, but we will use guestName realistically
                                    .replace(/{{host_name}}/g, vars.host_name)
                                    .replace(/{{host_bio}}/g, vars.host_bio)
                                    .replace(/{{profile_img}}/g, vars.profile_img)
                                    .replace(/{{social_links}}/g, vars.social_links)
                                    .replace(/{{time}}/g, vars.time)
                                    .replace(/{{meet_link}}/g, vars.meet_link);

                                const finalHtmlGuest = (config.html_template || '')
                                    .replace(/{{name}}/g, vars.name)
                                    .replace(/{{host_name}}/g, vars.host_name)
                                    .replace(/{{host_bio}}/g, vars.host_bio)
                                    .replace(/{{profile_img}}/g, vars.profile_img)
                                    .replace(/{{social_links}}/g, vars.social_links)
                                    .replace(/{{time}}/g, vars.time)
                                    .replace(/{{meet_link}}/g, vars.meet_link);

                                const rawSubject = config.subject || `Rappel : ${event.summary}`;
                                const finalSubjectHost = rawSubject
                                    .replace(/{{name}}/g, hostName)
                                    .replace(/{{host_name}}/g, vars.host_name)
                                    .replace(/{{time}}/g, vars.time);
                                
                                const finalSubjectGuest = rawSubject
                                    .replace(/{{name}}/g, vars.name)
                                    .replace(/{{host_name}}/g, vars.host_name)
                                    .replace(/{{time}}/g, vars.time);

                                // Send to host
                                await sendEmail({
                                    to: [{ email: user.email }],
                                    subject: finalSubjectHost,
                                    htmlContent: finalHtmlHost,
                                });

                                // Send to guest if available
                                if (guestEmail) {
                                    await sendEmail({
                                        to: [{ email: guestEmail }],
                                        subject: finalSubjectGuest,
                                        htmlContent: finalHtmlGuest,
                                    });
                                }

                                newSentReminders.push(reminderId);
                                meetingUpdated = true;
                                totalProcessed++;
                                console.log(`[Cron] Successfully sent reminder for ${event.summary}`);
                            } catch (remErr) {
                                console.error(`[Cron] Error sending specific reminder:`, remErr);
                            }
                        }
                    }

                    if (meetingUpdated) {
                        await supabaseAdmin
                            .from('al_meetings')
                            .update({ sent_reminders: newSentReminders })
                            .eq('id', meeting.id);
                    }
                }

                // Update last sync
                await supabaseAdmin
                    .from('al_admin_settings')
                    .update({ last_sync_at: now.toISOString() })
                    .eq('email', user.email);

            } catch (err) {
                console.error(`Error processing user ${user.email}:`, err);
            }
        }

        return NextResponse.json({ success: true, total_reminders_sent: totalProcessed });
    } catch (error) {
        console.error('Cron error:', error);
        return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
    }
}
