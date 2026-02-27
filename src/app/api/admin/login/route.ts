import { NextResponse } from 'next/server';
import { serialize } from 'cookie';

export async function POST(request: Request) {
    try {
        const { password: inputPassword } = await request.json();
        const { supabaseAdmin } = await import('@/lib/supabase');

        const { data: adminSettings, error: adminError } = await supabaseAdmin
            .from('al_admin_settings')
            .select('password')
            .limit(1)
            .single();

        if (adminError || !adminSettings) {
            return NextResponse.json({ success: false, message: 'Admin non configuré' }, { status: 500 });
        }

        if (inputPassword === adminSettings.password) {
            const cookie = serialize('admin_session', 'true', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 60 * 60 * 24 * 7, // 1 week
            });

            const response = NextResponse.json({ success: true });
            response.headers.set('Set-Cookie', cookie);
            return response;
        }

        return NextResponse.json({ success: false, message: 'Mot de passe incorrect' }, { status: 401 });
    } catch (error) {
        return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 });
    }
}
