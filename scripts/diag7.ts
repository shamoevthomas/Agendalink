import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
    console.log('Fetching admin...');
    const { data: admin, error } = await supabase.from('al_admin_settings').select('manual_reminder_template').limit(1);
    console.log(error ? error : admin);
}
check();
