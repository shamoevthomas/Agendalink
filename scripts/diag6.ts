import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
    const { data: admin } = await supabase.from('al_admin_settings').select('reminders_config').single();
    if (admin && admin.reminders_config) {
        console.log('--- Reminder Configs ---');
        for (const config of admin.reminders_config) {
            console.log(`ID: ${config.id} | Type: ${config.type} | Value: ${config.value} ${config.unit}`);
        }
    }

    const { data: meetings } = await supabase.from('al_meetings').select('title, sent_reminders, guest_email').order('created_at', { ascending: false }).limit(3);
    console.log('\n--- Recent Meetings ---');
    console.log(JSON.stringify(meetings, null, 2));
}
check();
