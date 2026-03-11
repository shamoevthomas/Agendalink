import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getCalendarClient } from '@/lib/google-calendar';
import { sendEmail } from '@/lib/brevo';

export async function GET(request: Request) {
    try {
        // 1. Fetch users with reminders enabled
        const { data: users, error: usersError } = await supabaseAdmin
            .from('al_admin_settings')
            .select('*')
            .eq('reminders_enabled', true);

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
                                const vars = {
                                    name: 'Invité',
                                    time: startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                                    meet_link: event.hangoutLink,
                                };

                                const finalHtml = (config.html_template || '')
                                    .replace(/{{name}}/g, vars.name)
                                    .replace(/{{time}}/g, vars.time)
                                    .replace(/{{meet_link}}/g, vars.meet_link);

                                // Send to host
                                await sendEmail({
                                    to: [{ email: user.email }],
                                    subject: `Rappel : ${event.summary}`,
                                    htmlContent: finalHtml,
                                });

                                // Send to guest if available
                                if (guestEmail) {
                                    await sendEmail({
                                        to: [{ email: guestEmail }],
                                        subject: `Rappel : ${event.summary}`,
                                        htmlContent: finalHtml,
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
