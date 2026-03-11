import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
    const { data: admin } = await supabase.from('al_admin_settings').select('reminders_enabled, reminders_config').single();
    if (admin) {
        console.log('Reminders enabled:', admin.reminders_enabled);
        if (admin.reminders_config) {
            console.log('Reminder types config:', admin.reminders_config.map((r: any) => ({ type: r.type, unit: r.unit, value: r.value })));
        } else {
            console.log('No reminders_config found');
        }
    } else {
        console.log('No admin found');
    }
}
check();
