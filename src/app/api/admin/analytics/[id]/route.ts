import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: 'Missing meeting id' }, { status: 400 });
        }

        // Fetch view count
        const { count: viewCount, error: viewError } = await supabaseAdmin
            .from('al_meeting_analytics')
            .select('*', { count: 'exact', head: true })
            .eq('meeting_id', id)
            .eq('event_type', 'view');

        if (viewError) throw viewError;

        // Fetch joins (guest emails and timestamps)
        const { data: joins, error: joinError } = await supabaseAdmin
            .from('al_meeting_analytics')
            .select('email, phone, created_at')
            .eq('meeting_id', id)
            .eq('event_type', 'join')
            .order('created_at', { ascending: false });

        if (joinError) throw joinError;

        return NextResponse.json({
            views: viewCount || 0,
            joins: joins || []
        });
    } catch (err) {
        console.error('Analytics fetch error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
