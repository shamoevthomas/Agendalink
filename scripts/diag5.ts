import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
    const { data: meeting } = await supabase.from('al_meetings').select('id, title, sent_reminders, guest_email').eq('share_id', 'call-nabil-thomas').single();
    if (meeting) {
        console.log('Meeting:', meeting.title);
        console.log('Guest Email:', meeting.guest_email);
        console.log('Sent Reminders:', meeting.sent_reminders);
    }
}
check();
