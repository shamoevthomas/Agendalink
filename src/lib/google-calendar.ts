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

export async function insertMeetingIntoGoogleCalendar(refreshToken: string, meeting: any) {
    const calendar = await getCalendarClient(refreshToken);
    
    // Build local datetime strings without UTC conversion so Google Calendar
    // interprets them in Europe/Paris timezone (avoids the +1h offset bug)
    const duration = meeting.duration || 30;
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

    return await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        conferenceDataVersion: 1,
    });
}

export async function fetchUpcomingMeetings(refreshToken: string, hostEmail: string) {
    const calendar = await getCalendarClient(refreshToken);
    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Next 24 hours

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
