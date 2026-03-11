import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Protect all admin routes except the main /admin login page
    if (pathname.startsWith('/admin') && pathname !== '/admin') {
        const adminSession = request.cookies.get('admin_session');

        if (!adminSession || adminSession.value !== 'true') {
            return NextResponse.redirect(new URL('/admin', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*'],
};
