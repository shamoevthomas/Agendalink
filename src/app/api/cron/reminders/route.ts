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

        let totalProcessed = 0;

        for (const user of users) {
            if (!user.google_refresh_token || !user.reminders_config || user.reminders_config.length === 0) continue;

            try {
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

                if (!events) continue;

                for (const event of events) {
                    if (!event.hangoutLink) continue;

                    const startTime = new Date(event.start?.dateTime || event.start?.date || '');
                    const diffMins = Math.floor((startTime.getTime() - now.getTime()) / (1000 * 60));

                    // Get meeting record to track sent reminders
                    let { data: meeting } = await supabaseAdmin
                        .from('al_meetings')
                        .select('*')
                        .eq('google_event_id', event.id)
                        .single();

                    if (!meeting) {
                        const guestEmail = event.attendees?.find(a => !a.self)?.email;
                        const { data: newMeeting } = await supabaseAdmin
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
                        meeting = newMeeting;
                    }

                    const sentReminders = meeting?.sent_reminders || [];
                    const isNewMeeting = !meeting;

                    // 3. Process each configured reminder
                    for (const config of user.reminders_config) {
                        if (sentReminders.includes(config.id)) continue;

                        let shouldSend = false;

                        if (config.type === 'at_event') {
                            // Send if event starts within +/- 5 minutes
                            if (diffMins <= 5 && diffMins >= -5) {
                                shouldSend = true;
                            }
                        } else if (config.type === 'before_event') {
                            const configMins = config.unit === 'hours' ? config.value * 60 : config.value;
                            // Check window of 15 minutes
                            if (diffMins <= configMins && diffMins >= configMins - 15) {
                                shouldSend = true;
                            }
                        } else if (config.type === 'at_booking') {
                            // Only send 'at_booking' if this is the first time we see this meeting 
                            // OR if it's an existing meeting but this specific reminder hasn't been sent.
                            shouldSend = true;
                        }

                        if (shouldSend) {
                            const guestEmail = event.attendees?.find(a => !a.self)?.email;
                            const vars = {
                                name: 'Invité',
                                time: startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                                meet_link: event.hangoutLink,
                            };

                            const finalHtml = config.html_template
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

                            // Update tracking
                            sentReminders.push(config.id);
                            await supabaseAdmin
                                .from('al_meetings')
                                .update({ sent_reminders: sentReminders })
                                .eq('id', meeting.id);
                            
                            totalProcessed++;
                        }
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
