import { google } from 'googleapis';
import { supabaseAdmin } from './supabase';

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

export async function getCalendarClient(refreshToken: string) {
    oauth2Client.setCredentials({
        refresh_token: refreshToken,
    });
    return google.calendar({ version: 'v3', auth: oauth2Client });
}

export async function getGoogleAuth(email: string) {
    const { data: adminSettings, error } = await supabaseAdmin
        .from('al_admin_settings')
        .select('google_refresh_token')
        .eq('email', email)
        .single();

    if (error || !adminSettings?.google_refresh_token) {
        throw new Error('Google account not connected or refresh token missing');
    }

    oauth2Client.setCredentials({
        refresh_token: adminSettings.google_refresh_token,
    });

    return oauth2Client;
}

export async function createCalendarEvent(auth: any, meeting: any) {
    const calendar = google.calendar({ version: 'v3', auth });

    // Build local datetime strings without UTC conversion so Google Calendar
    // interprets them in Europe/Paris timezone (avoids the +1h offset bug)
    const duration = meeting.duration || 60;
    const date = meeting.meeting_date || meeting.date;
    const time = meeting.meeting_time || meeting.time;
    
    const startLocal = `${date}T${time}:00`;

    const [h, m] = time.split(':').map(Number);
    const totalMinutes = h * 60 + m + duration;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    const dayOverflow = totalMinutes >= 24 * 60;
    const endDate = dayOverflow
        ? new Date(new Date(date).getTime() + 86400000).toISOString().split('T')[0]
        : date;
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

    if (meeting.is_google_meet || meeting.isGoogleMeet) {
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

    return {
        id: res.data.id,
        meetLink: res.data.hangoutLink
    };
}

export async function insertMeetingIntoGoogleCalendar(refreshToken: string, meeting: any) {
    const auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );
    auth.setCredentials({ refresh_token: refreshToken });
    return createCalendarEvent(auth, meeting);
}

export async function addAttendee(refreshToken: string, eventId: string, email: string) {
    const calendar = await getCalendarClient(refreshToken);

    const event = await calendar.events.get({
        calendarId: 'primary',
        eventId: eventId,
    });

    const attendees = event.data.attendees || [];
    if (!attendees.find(a => a.email === email)) {
        attendees.push({ email });
    }

    return await calendar.events.patch({
        calendarId: 'primary',
        eventId: eventId,
        requestBody: {
            attendees: attendees,
        },
    });
}

export async function fetchUpcomingMeetings(refreshToken: string, hostEmail: string) {
    const calendar = await getCalendarClient(refreshToken);
    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // Next 30 days

    const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
    });

    const events = response.data.items || [];
    
    // Filter for Google Meet events
    return events.filter(event => event.hangoutLink).map(event => ({
        google_event_id: event.id,
        title: event.summary,
        google_meet_link: event.hangoutLink,
        start_time: event.start?.dateTime || event.start?.date,
        host_email: hostEmail,
        guest_email: event.attendees?.find(a => !a.self)?.email, // Get the first guest
    }));
}
