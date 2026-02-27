import { LayoutDashboard, Settings, LogOut } from 'lucide-react';
import Link from 'next/link';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-[#0a0a0a] text-white">
            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <header className="h-20 border-b border-white/10 flex items-center px-6 md:px-10 justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain rounded-lg" />
                        <h2 className="text-xl font-semibold tracking-tight hidden sm:block">AgendaLink Admin</h2>
                    </div>
                </header>
                <div className="max-w-6xl mx-auto p-4 md:p-10">
                    {children}
                </div>
            </main>
        </div>
    );
}
