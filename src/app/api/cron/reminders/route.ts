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

        for (const user of users) {
            if (!user.google_refresh_token) continue;

            const calendar = await getCalendarClient(user.google_refresh_token);
            const now = new Date();
            const timeMin = now.toISOString();
            const timeMax = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

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
                const diffMinutes = Math.floor((startTime.getTime() - now.getTime()) / (1000 * 60));

                // 3. Check if it's within the reminder window (e.g., 15 +/- 5 minutes)
                const window = user.reminder_minutes_before;
                if (diffMinutes > 0 && diffMinutes <= window) {
                    
                    // Check if reminder was already sent for this event
                    const { data: existingMeeting } = await supabaseAdmin
                        .from('al_meetings')
                        .select('reminder_sent')
                        .eq('google_event_id', event.id)
                        .single();

                    if (existingMeeting?.reminder_sent) continue;

                    // 4. Send reminders via Brevo
                    const guestEmail = event.attendees?.find(a => !a.self)?.email;
                    const hostEmail = user.email;

                    const htmlTemplate = (name: string, meetLink: string, time: string) => `
                        <div style="font-family: Arial, sans-serif; padding: 20px;">
                            <h2>Rappel de réunion Google Meet</h2>
                            <p>Bonjour ${name},</p>
                            <p>Votre réunion commence bientôt :</p>
                            <ul>
                                <li><strong>Sujet :</strong> ${event.summary}</li>
                                <li><strong>Heure :</strong> ${time}</li>
                                <li><strong>Lien Meet :</strong> <a href="${meetLink}">${meetLink}</a></li>
                            </ul>
                            <p>À tout de suite !</p>
                            <br/>
                            <p>Support CloseOS</p>
                        </div>
                    `;

                    const meetingTimeStr = startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

                    // Send to Host
                    await sendEmail({
                        to: [{ email: hostEmail }],
                        subject: `Rappel : ${event.summary} dans ${diffMinutes} min`,
                        htmlContent: htmlTemplate('Host', event.hangoutLink, meetingTimeStr),
                    });

                    // Send to Guest if available
                    if (guestEmail) {
                        await sendEmail({
                            to: [{ email: guestEmail }],
                            subject: `Rappel : ${event.summary} dans ${diffMinutes} min`,
                            htmlContent: htmlTemplate('Invité', event.hangoutLink, meetingTimeStr),
                        });
                    }

                    // 5. Update or Upsert meeting as reminded
                    await supabaseAdmin
                        .from('al_meetings')
                        .upsert({
                            google_event_id: event.id,
                            title: event.summary,
                            google_meet_link: event.hangoutLink,
                            host_email: hostEmail,
                            guest_email: guestEmail,
                            reminder_sent: true,
                            meeting_date: startTime.toISOString().split('T')[0],
                            meeting_time: startTime.toISOString().split('T')[1].split('.')[0],
                        }, { onConflict: 'google_event_id' });
                }
            }

            // Update last sync
            await supabaseAdmin
                .from('al_admin_settings')
                .update({ last_sync_at: new Date().toISOString() })
                .eq('email', user.email);
        }

        return NextResponse.json({ success: true, processed_users: users.length });
    } catch (error) {
        console.error('Cron error:', error);
        return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
    }
}
