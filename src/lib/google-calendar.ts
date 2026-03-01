import { google } from 'googleapis';
import { supabaseAdmin } from './supabase';

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

export async function getGoogleAuth(email: string) {
    // 1. Get refresh token from Supabase
    const { data, error } = await supabaseAdmin
        .from('al_admin_settings')
        .select('google_refresh_token')
        .eq('email', email)
        .single();

    if (error || !data?.google_refresh_token) {
        throw new Error('No refresh token found for this email');
    }

    // 2. Set credentials
    oauth2Client.setCredentials({
        refresh_token: data.google_refresh_token,
    });

    return oauth2Client;
}

export async function createCalendarEvent(auth: any, meeting: {
    title: string;
    description: string;
    date: string;
    time: string;
    isGoogleMeet: boolean;
}) {
    const calendar = google.calendar({ version: 'v3', auth });

    // Build local datetime strings without UTC conversion so Google Calendar
    // interprets them in Europe/Paris timezone (avoids the +1h offset bug)
    const duration = (meeting as any).duration || 30;
    const startLocal = `${meeting.date}T${meeting.time}:00`;

    const [h, m] = meeting.time.split(':').map(Number);
    const totalMinutes = h * 60 + m + duration;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    const dayOverflow = totalMinutes >= 24 * 60;
    const endDate = dayOverflow
        ? new Date(new Date(meeting.date).getTime() + 86400000).toISOString().split('T')[0]
        : meeting.date;
    const endLocal = `${endDate}T${endTime}:00`;

    const event: any = {
        summary: meeting.title,
        description: meeting.description,
        start: {
            dateTime: startLocal,
            timeZone: 'Europe/Paris',
        },
        end: {
            dateTime: endLocal,
            timeZone: 'Europe/Paris',
        },
    };

    if (meeting.isGoogleMeet) {
        event.conferenceData = {
            createRequest: {
                requestId: Math.random().toString(36).substring(7),
                conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
        };
    }

    const res = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        conferenceDataVersion: 1,
    });

    const eventData = res.data;

    return {
        id: eventData.id,
        meetLink: eventData.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === 'video')?.uri,
        htmlLink: eventData.htmlLink,
    };
}

export async function addAttendee(refreshToken: string, eventId: string, attendeeEmail: string) {
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // 1. Get current event to preserve existing attendees
    const event = await calendar.events.get({
        calendarId: 'primary',
        eventId: eventId,
    });

    const currentAttendees = event.data.attendees || [];

    // 2. check if already there
    if (currentAttendees.find((a: any) => a.email === attendeeEmail)) {
        return event.data;
    }

    // 3. Patch the event with the new attendee
    const res = await calendar.events.patch({
        calendarId: 'primary',
        eventId: eventId,
        sendUpdates: 'all',
        requestBody: {
            attendees: [...currentAttendees, { email: attendeeEmail }],
        },
    });

    return res.data;
}
