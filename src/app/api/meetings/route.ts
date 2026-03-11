import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getGoogleAuth, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '@/lib/google-calendar';

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

export async function PATCH(request: Request) {
    try {
        const { id, date, time, duration, title, description } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'Missing meeting id' }, { status: 400 });
        }

        // 1. Get existing meeting
        const { data: meeting, error: fetchError } = await supabaseAdmin
            .from('al_meetings')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !meeting) {
            return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
        }

        // 2. Update DB
        const updateData: any = {};
        if (date) updateData.meeting_date = date;
        if (time) updateData.meeting_time = time;
        if (duration) updateData.duration = duration;
        if (title) updateData.title = title;
        if (description !== undefined) updateData.description = description;

        const { data: updatedMeeting, error: updateError } = await supabaseAdmin
            .from('al_meetings')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        // 3. Sync to Google Calendar if event exists
        if (meeting.google_event_id && meeting.host_email) {
            try {
                const auth = await getGoogleAuth(meeting.host_email);
                await updateCalendarEvent(auth, meeting.google_event_id, {
                    ...updatedMeeting,
                    date: updatedMeeting.meeting_date,
                    time: updatedMeeting.meeting_time
                });
            } catch (googleError) {
                console.error('Google Update Sync Error:', googleError);
            }
        }

        return NextResponse.json({ success: true, meeting: updatedMeeting });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Missing meeting id' }, { status: 400 });
        }

        // 1. Get meeting to get google_event_id
        const { data: meeting } = await supabaseAdmin
            .from('al_meetings')
            .select('*')
            .eq('id', id)
            .single();

        // 2. Delete from Google Calendar if sync exists
        if (meeting?.google_event_id && meeting?.host_email) {
            try {
                const auth = await getGoogleAuth(meeting.host_email);
                await deleteCalendarEvent(auth, meeting.google_event_id);
            } catch (googleError) {
                console.error('Google Delete Sync Error:', googleError);
            }
        }

        // 3. Delete from Supabase
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
