import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { addAttendee } from '@/lib/google-calendar';

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

        // 3. Check if sync is even possible (requires host_email and google_event_id)
        if (!meeting.host_email || !meeting.google_event_id) {
            return NextResponse.json({ success: true, message: 'Joined but no Google sync available' });
        }

        // 4. Get host's refresh token
        const { data: admin, error: adminError } = await supabaseAdmin
            .from('al_admin_settings')
            .select('google_refresh_token')
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
            return NextResponse.json({ error: 'Failed to sync with Google Calendar' }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (err) {
        console.error('Join error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
