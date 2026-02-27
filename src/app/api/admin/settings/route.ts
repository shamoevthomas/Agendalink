import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

async function getAdminEmail() {
    const cookieStore = await cookies();
    const session = cookieStore.get('admin_session');
    if (!session) return null;

    // For now we get the first admin since it's a single-user app
    const { data } = await supabaseAdmin.from('al_admin_settings').select('email').single();
    return data?.email;
}

export async function GET() {
    const email = await getAdminEmail();
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabaseAdmin
        .from('al_admin_settings')
        .select('*')
        .eq('email', email)
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function PATCH(req: Request) {
    const email = await getAdminEmail();
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();
        const { first_name, last_name, bio, profile_image, social_links, password, disconnect_google } = body;

        const updateData: any = {};
        if (first_name !== undefined) updateData.first_name = first_name;
        if (last_name !== undefined) updateData.last_name = last_name;
        if (bio !== undefined) updateData.bio = bio;
        if (profile_image !== undefined) updateData.profile_image = profile_image;
        if (social_links !== undefined) updateData.social_links = social_links;
        if (password !== undefined && password !== '') updateData.password = password;

        if (disconnect_google) {
            updateData.google_refresh_token = null;
        }

        const { data, error } = await supabaseAdmin
            .from('al_admin_settings')
            .update(updateData)
            .eq('email', email)
            .select()
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
}
