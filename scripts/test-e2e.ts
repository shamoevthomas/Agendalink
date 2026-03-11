import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getGoogleAuth, createCalendarEvent } from '../src/lib/google-calendar';
import fetch from 'node-fetch';

async function runE2E() {
    console.log('1. Creating a fresh event in Google Calendar...');
    const auth = await getGoogleAuth('shamoevthomas@gmail.com');
    const meetingData = {
        title: 'Test Final E2E Automated Sync',
        date: new Date().toISOString().split('T')[0],
        time: new Date(Date.now() + 60 * 60 * 1000).toISOString().split('T')[1].substring(0, 5), // 1 hour from now
        duration: 30,
        description: 'Testing if the new cron fix correctly sends the at_booking email.',
        isGoogleMeet: true
    };
    
    // Create the event
    const event = await createCalendarEvent(auth, meetingData);
    console.log('Event created! ID:', event.id);

    console.log('2. Triggering the cron automation manually...');
    // We pass the secret since it is secured!
    const res = await fetch('https://agendalink.vercel.app/api/cron/reminders', {
        headers: { 'Authorization': 'Bearer CrmtIn2X5Fb+1GbbUkaWxwKmVamk8at6m7nviAD5roQ=' }
    });
    
    const text = await res.text();
    console.log('Cron response:', text);
}
runE2E();
