import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
    const { data: admin } = await supabase.from('al_admin_settings').select('reminders_config').single();
    if (admin) {
        console.log('Reminders config:', JSON.stringify(admin.reminders_config));
    }
}
check();
