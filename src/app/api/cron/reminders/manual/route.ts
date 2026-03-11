import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getCalendarClient } from '@/lib/google-calendar';
import { sendEmail } from '@/lib/brevo';

export async function POST(request: Request) {
    try {
        const { eventId, hostEmail } = await request.json();

        if (!eventId || !hostEmail) {
            return NextResponse.json({ error: 'Missing eventId or hostEmail' }, { status: 400 });
        }

        // 1. Get admin settings
        const { data: user, error: userError } = await supabaseAdmin
            .from('al_admin_settings')
            .select('*')
            .eq('email', hostEmail)
            .single();

        if (userError || !user?.google_refresh_token) {
            throw new Error('User not found or Google not connected');
        }

        // 2. Fetch event details from Google
        const calendar = await getCalendarClient(user.google_refresh_token);
        const { data: event } = await calendar.events.get({
            calendarId: 'primary',
            eventId: eventId,
        });

        if (!event || !event.hangoutLink) {
            throw new Error('Event not found or has no Meet link');
        }

        const startTime = new Date(event.start?.dateTime || event.start?.date || '');
        const guestEmail = event.attendees?.find(a => !a.self)?.email;
        const meetingTimeStr = startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

        // Use the manual template from settings or a default
        const htmlTemplate = user.manual_reminder_template || `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #2563eb;">Rappel de votre réunion</h2>
                <p>Bonjour {{name}},</p>
                <p>Ceci est un rappel manuel pour votre réunion :</p>
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Sujet :</strong> ${event.summary}</p>
                    <p style="margin: 5px 0;"><strong>Heure :</strong> {{time}}</p>
                    <p style="margin: 5px 0;"><strong>Lien Meet :</strong> <a href="{{meet_link}}">{{meet_link}}</a></p>
                </div>
                <p>À tout de suite !</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 12px; color: #94a3b8;">Support CloseOS</p>
            </div>
        `;

        const hostName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Votre hôte';
        const profileImg = user.profile_image || '';
        const hostBio = user.bio || '';
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

        const replaceVars = (html: string, name: string) => {
            return html
                .replace(/{{name}}/g, name)
                .replace(/{{host_name}}/g, hostName)
                .replace(/{{host_bio}}/g, hostBio)
                .replace(/{{profile_img}}/g, profileImg)
                .replace(/{{social_links}}/g, socialHtml)
                .replace(/{{time}}/g, meetingTimeStr)
                .replace(/{{meet_link}}/g, event.hangoutLink!);
        };

        // 3. Send Emails
        await sendEmail({
            to: [{ email: hostEmail }],
            subject: `Rappel Manuel : ${event.summary}`,
            htmlContent: replaceVars(htmlTemplate, 'Hôte'),
        });

        if (guestEmail) {
            await sendEmail({
                to: [{ email: guestEmail }],
                subject: `Rappel Manuel : ${event.summary}`,
                htmlContent: replaceVars(htmlTemplate, 'Invité'),
            });
        }

        // 4. Update tracking
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

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Manual reminder error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
