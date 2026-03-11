import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testFix() {
    // 1. Find a recent meeting
    const { data: meeting } = await supabase.from('al_meetings').select('*').order('created_at', { ascending: false }).limit(1).single();
    
    if (!meeting) {
        console.log('No meetings found.');
        return;
    }

    console.log(`Resetting sent_reminders for meeting: ${meeting.title}`);
    
    // 2. Clear sent_reminders
    await supabase.from('al_meetings').update({ sent_reminders: [] }).eq('id', meeting.id);

    console.log('3. Triggering cron automation manually...');
    const res = await fetch('https://agendalink.vercel.app/api/cron/reminders', {
        headers: { 'Authorization': 'Bearer CrmtIn2X5Fb+1GbbUkaWxwKmVamk8at6m7nviAD5roQ=' }
    });
    
    const text = await res.text();
    console.log('Cron response:', text);
}
testFix();
