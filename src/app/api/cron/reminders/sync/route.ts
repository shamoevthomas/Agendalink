import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { fetchUpcomingMeetings } from '@/lib/google-calendar';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');

        if (!email) {
            return NextResponse.json({ error: 'Missing email' }, { status: 400 });
        }

        // 1. Get admin settings
        const { data: user, error: userError } = await supabaseAdmin
            .from('al_admin_settings')
            .select('*')
            .eq('email', email)
            .single();

        if (userError || !user?.google_refresh_token) {
            throw new Error('User not found or Google not connected');
        }

        // 2. Fetch upcoming meetings
        const meetings = await fetchUpcomingMeetings(user.google_refresh_token, email);

        return NextResponse.json({ success: true, meetings });
    } catch (error: any) {
        console.error('Fetch upcoming error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
