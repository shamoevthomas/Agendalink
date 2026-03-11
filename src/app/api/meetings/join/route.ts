import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { addAttendee } from '@/lib/google-calendar';
import { sendEmail } from '@/lib/brevo';

export async function POST(req: Request) {
    try {
        const { shareId, email, phone } = await req.json();

        if (!shareId || !email) {
            return NextResponse.json({ error: 'Missing shareId or email' }, { status: 400 });
        }

        // 1. Get meeting details from shareId
        const { data: meeting, error: meetingError } = await supabaseAdmin
            .from('al_meetings')
            .select('*')
            .eq('share_id', shareId)
            .single();

        if (meetingError || !meeting) {
            return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
        }

        // 2. Record join event in analytics (DO THIS FIRST so it always records even if sync fails)
        const { error: analyticsError } = await supabaseAdmin
            .from('al_meeting_analytics')
            .insert({
                meeting_id: meeting.id,
                event_type: 'join',
                email: email,
                phone: phone
            });

        if (analyticsError) {
            console.error('Analytics record error:', analyticsError);
            // We continue even if analytics fails, as joins are critical
        }

        // 2b. Update guest_email on the meeting record
        await supabaseAdmin
            .from('al_meetings')
            .update({ guest_email: email })
            .eq('id', meeting.id);

        // 3. Check if sync is even possible (requires host_email and google_event_id)
        if (!meeting.host_email || !meeting.google_event_id) {
            return NextResponse.json({ success: true, message: 'Joined but no Google sync available' });
        }

        // 4. Get host's full settings (for refresh token AND reminder config)
        const { data: admin, error: adminError } = await supabaseAdmin
            .from('al_admin_settings')
            .select('*')
            .eq('email', meeting.host_email)
            .single();

        if (adminError || !admin?.google_refresh_token) {
            return NextResponse.json({ error: 'Host not connected to Google' }, { status: 500 });
        }

        // 5. Add attendee to Google Calendar
        try {
            await addAttendee(admin.google_refresh_token, meeting.google_event_id, email);
        } catch (err: any) {
            console.error('Google Auth/API error:', err);
            // Don't return here — still try to send the email
        }

        // 6. Send at_booking reminder emails immediately
        try {
            const remindersConfig = admin.reminders_config || [];
            const atBookingReminders = remindersConfig.filter((r: any) => r.type === 'at_booking');

            if (atBookingReminders.length > 0 && admin.reminders_enabled) {
                console.log(`[Join] Sending ${atBookingReminders.length} at_booking reminder(s) for meeting ${meeting.title}`);

                const hostName = `${admin.first_name || ''} ${admin.last_name || ''}`.trim() || 'Votre hôte';
                const socialLinks = admin.social_links || [];
                const socialHtml = socialLinks.length > 0
                    ? `<table cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto;"><tr>${socialLinks.map((s: any) => `
                        <td style="padding: 0 5px;">
                            <a href="${s.url}" style="display: inline-block; padding: 8px 16px; background-color: #262626; border: 1px solid #333; border-radius: 12px; color: #ffffff; text-decoration: none; font-size: 10px; font-weight: bold; font-family: sans-serif; text-transform: uppercase; letter-spacing: 0.5px;">
                                ${s.platform}
                            </a>
                        </td>
                      `).join('')}</tr></table>`
                    : '';

                const meetingTime = meeting.meeting_time ? meeting.meeting_time.slice(0, 5) : '';

                for (const config of atBookingReminders) {
                    const htmlTemplate = config.html_template || '';
                    if (!htmlTemplate) continue;

                    const rawSubject = config.subject || `Confirmation : ${meeting.title}`;
                    const guestName = email.split('@')[0] || 'Invité';
                    
                    const finalHtmlHost = htmlTemplate
                        .replace(/{{name}}/g, guestName)
                        .replace(/{{host_name}}/g, hostName)
                        .replace(/{{host_bio}}/g, admin.bio || '')
                        .replace(/{{profile_img}}/g, admin.profile_image || '')
                        .replace(/{{social_links}}/g, socialHtml)
                        .replace(/{{time}}/g, meetingTime)
                        .replace(/{{meet_link}}/g, meeting.google_meet_link || '');
                        
                    // For the host copy, we could use hostName instead of guestName if we wanted, 
                    // but guestName is better to know who booked it.
                    const finalHtmlGuest = finalHtmlHost;

                    const finalSubjectHost = rawSubject
                        .replace(/{{name}}/g, guestName)
                        .replace(/{{host_name}}/g, hostName)
                        .replace(/{{time}}/g, meetingTime);
                        
                    const finalSubjectGuest = rawSubject
                        .replace(/{{name}}/g, guestName)
                        .replace(/{{host_name}}/g, hostName)
                        .replace(/{{time}}/g, meetingTime);

                    // Send to the guest who just booked
                    await sendEmail({
                        to: [{ email: email }],
                        subject: finalSubjectGuest,
                        htmlContent: finalHtmlGuest,
                        sender: { name: hostName, email: 'support@closeos.fr' }
                    });

                    // Also send to the host
                    await sendEmail({
                        to: [{ email: admin.email }],
                        subject: finalSubjectHost,
                        htmlContent: finalHtmlHost,
                        sender: { name: hostName, email: 'support@closeos.fr' }
                    });

                    console.log(`[Join] at_booking email sent for ${meeting.title} to ${email} and ${admin.email}`);
                }

                // Mark at_booking reminders as sent for this meeting
                const currentSent = meeting.sent_reminders || [];
                const newSent = [
                    ...currentSent,
                    ...atBookingReminders.map((r: any) => r.id || `at_booking_${r.type}`)
                ];
                await supabaseAdmin
                    .from('al_meetings')
                    .update({ sent_reminders: newSent })
                    .eq('id', meeting.id);
            }
        } catch (emailErr) {
            console.error('[Join] Error sending at_booking email:', emailErr);
            // Don't fail the join just because email failed
        }

        return NextResponse.json({ success: true });

    } catch (err) {
        console.error('Join error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
