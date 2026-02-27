import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getGoogleAuth, createCalendarEvent } from '@/lib/google-calendar';

export async function POST(request: Request) {
    try {
        const meetingData = await request.json();
        const { title, description, date, time, isGoogleMeet, custom_slug, request_phone, duration } = meetingData;

        // 1. Get the admin settings (for the email and refresh token)
        const { data: adminSettings, error: adminError } = await supabaseAdmin
            .from('al_admin_settings')
            .select('email')
            .limit(1)
            .single();

        if (adminError || !adminSettings) {
            return NextResponse.json({ error: 'Admin non configuré (Google not connected)' }, { status: 400 });
        }

        // 2. Generate unique share_id (slug) if not provided or even if provided (to ensure uniqueness)
        let shareId = custom_slug?.trim();

        if (!shareId || shareId === '') {
            // Slugify title
            shareId = title.toLowerCase()
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');

            if (!shareId) shareId = 'meeting';
        }

        // Check for uniqueness and append suffix if needed
        let finalShareId = shareId;
        let counter = 1;
        let isUnique = false;

        while (!isUnique) {
            const { data: existing } = await supabaseAdmin
                .from('al_meetings')
                .select('share_id')
                .eq('share_id', finalShareId)
                .maybeSingle();

            if (!existing) {
                isUnique = true;
            } else {
                finalShareId = `${shareId}-${counter}`;
                counter++;
            }
        }

        // 3. Insert into Supabase first to get id
        const insertData: any = {
            title,
            description,
            meeting_date: date,
            meeting_time: time,
            is_google_meet: isGoogleMeet,
            host_email: adminSettings.email,
            request_phone: !!request_phone,
            duration: duration || 60,
            share_id: finalShareId
        };

        const { data: newMeeting, error: insertError } = await supabaseAdmin
            .from('al_meetings')
            .insert(insertData)
            .select()
            .single();

        if (insertError) {
            return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        // 4. Sync to Google Calendar
        try {
            const auth = await getGoogleAuth(adminSettings.email);
            const googleEvent = await createCalendarEvent(auth, { ...meetingData, duration: duration || 60 });

            // 4. Update Supabase with Google Event ID and Meet Link
            await supabaseAdmin
                .from('al_meetings')
                .update({
                    google_event_id: googleEvent.id,
                    google_meet_link: googleEvent.meetLink
                })
                .eq('id', newMeeting.id);

            return NextResponse.json({
                success: true,
                meeting: { ...newMeeting, google_meet_link: googleEvent.meetLink }
            });
        } catch (googleError: any) {
            console.error('Google Sync Error:', googleError);
            // We still return success but maybe with a warning?
            // For Phase 1, let's keep it simple.
            return NextResponse.json({
                success: true,
                meeting: newMeeting,
                warning: 'Synchronisation Google échouée: ' + googleError.message
            });
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET() {
    const { data, error } = await supabaseAdmin
        .from('al_meetings')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Missing meeting id' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('al_meetings')
            .delete()
            .eq('id', id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
