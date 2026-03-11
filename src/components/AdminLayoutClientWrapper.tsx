'use client';

import { usePathname } from 'next/navigation';
import AdminLayoutClient from './AdminLayoutClient';

export default function AdminLayoutClientWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Do not show the sidebar on the login page
    if (pathname === '/admin') {
        return <>{children}</>;
    }

    return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
