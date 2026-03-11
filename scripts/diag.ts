import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
    console.log('Fetching admin settings...');
    const { data: admin } = await supabase.from('al_admin_settings').select('*').single();
    if (admin) {
        console.log('Reminders enabled:', admin.reminders_enabled);
        console.log('Reminders config:', JSON.stringify(admin.reminders_config, null, 2));
    }

    console.log('Fetching recent meetings...');
    const { data: meetings } = await supabase.from('al_meetings').select('*').order('created_at', { ascending: false }).limit(2);
    if (meetings) {
        console.log('Recent meetings:', JSON.stringify(meetings, null, 2));
    }
}
check();
