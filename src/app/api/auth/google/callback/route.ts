import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
        return NextResponse.redirect(new URL('/admin/dashboard?error=no_code', request.url));
    }

    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // Get user info to get the email
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        const email = userInfo.data.email;

        if (!tokens.refresh_token) {
            // If no refresh token, we might need to prompt consent again, 
            // but we forced it in the previous step.
            console.error('No refresh token received');
        }

        // Upsert into al_admin_settings
        const { error } = await supabaseAdmin
            .from('al_admin_settings')
            .upsert({
                email: email,
                google_refresh_token: tokens.refresh_token,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'email' });

        if (error) {
            console.error('Supabase error:', error);
            return NextResponse.redirect(new URL('/admin/dashboard?error=db_error', request.url));
        }

        return NextResponse.redirect(new URL('/admin/dashboard?success=google_connected', request.url));
    } catch (error) {
        console.error('OAuth error:', error);
        return NextResponse.redirect(new URL('/admin/dashboard?error=auth_failed', request.url));
    }
}
