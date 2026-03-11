'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Settings, User, Calendar, Clock, Menu, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [profile, setProfile] = useState<any>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch('/api/admin/settings');
                if (res.ok) {
                    const data = await res.json();
                    setProfile(data);
                }
            } catch (err) {
                console.error('Failed to fetch profile', err);
            }
        };
        fetchProfile();
    }, []);

    const navItems = [
        { href: '/admin/main', icon: LayoutDashboard, label: 'Tableau de bord' },
        { href: '/admin/meetings', icon: Calendar, label: 'Mes Rendez-vous' },
        { href: '/admin/reminders', icon: Clock, label: 'Rappels' },
        { href: '/admin/dashboard', icon: Settings, label: 'Configuration' },
    ];

    return (
        <div className="flex h-screen bg-[#050505] text-white overflow-hidden font-sans">
            {/* Desktop Sidebar */}
            <aside className="group w-[88px] hover:w-[280px] transition-all duration-300 ease-in-out border-r border-[#1a1a1a] bg-[#0a0a0a] hidden lg:flex flex-col shrink-0 overflow-hidden">
                <div className="flex items-center gap-4 p-6 mb-4 whitespace-nowrap">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
                        <CalendarIcon />
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <h2 className="font-bold text-[16px] leading-tight text-white tracking-wide">AgendaLink Admin</h2>
                        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Administration</p>
                    </div>
                </div>
                
                <nav className="flex-1 px-4 space-y-2 overflow-hidden">
                    {navItems.map((item, idx) => {
                        const Icon = item.icon;
                        const isReallyActive = pathname === item.href && (idx !== 3);

                        return (
                            <Link 
                                key={idx} 
                                href={item.href}
                                className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all font-bold text-sm whitespace-nowrap overflow-hidden ${
                                    isReallyActive 
                                    ? 'bg-[#141414] text-white border border-[#222] shadow-sm' 
                                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.02]'
                                }`}
                                title={item.label}
                            >
                                <div className="shrink-0 flex items-center justify-center w-6">
                                    <Icon size={18} className={isReallyActive ? "text-blue-500" : "text-gray-500"} />
                                </div>
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-[#1a1a1a] whitespace-nowrap overflow-hidden">
                    <p className="text-center text-[10px] uppercase tracking-widest text-gray-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        AgendaLink System &copy; 2026
                    </p>
                </div>
            </aside>

            {/* Mobile Sidebar (Drawer) */}
            <div 
                className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsSidebarOpen(false)}
            >
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                <aside 
                    className={`absolute inset-y-0 left-0 w-[280px] bg-[#0a0a0a] border-r border-[#1a1a1a] transition-transform duration-300 ease-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <CalendarIcon />
                            </div>
                            <div>
                                <h2 className="font-bold text-[16px] text-white tracking-wide">AgendaLink</h2>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Admin</p>
                            </div>
                        </div>
                        <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-gray-400 hover:text-white">
                            <X size={24} />
                        </button>
                    </div>

                    <nav className="flex-1 px-4 space-y-2 mt-4">
                        {navItems.map((item, idx) => {
                            const Icon = item.icon;
                            const isReallyActive = pathname === item.href;

                            return (
                                <Link 
                                    key={idx} 
                                    href={item.href}
                                    onClick={() => setIsSidebarOpen(false)}
                                    className={`flex items-center gap-4 px-4 py-4 rounded-xl transition-all font-bold text-sm ${
                                        isReallyActive 
                                        ? 'bg-blue-600/10 text-white border border-blue-600/20' 
                                        : 'text-gray-400 hover:text-gray-200'
                                    }`}
                                >
                                    <Icon size={20} className={isReallyActive ? "text-blue-500" : "text-gray-500"} />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="p-6 border-t border-[#1a1a1a]">
                        <p className="text-[10px] uppercase tracking-widest text-gray-600 font-bold text-center">
                            AgendaLink &copy; 2026
                        </p>
                    </div>
                </aside>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300">
                {/* Top Header */}
                <header className="h-[70px] md:h-[80px] border-b border-[#1a1a1a] bg-[#0a0a0a]/90 backdrop-blur-xl flex items-center px-4 md:px-10 justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
                        >
                            <Menu size={24} />
                        </button>
                        <div className="lg:hidden flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <CalendarIcon />
                            </div>
                            <span className="font-bold text-sm tracking-tight">AgendaLink</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3 md:bg-[#111] md:p-1.5 md:pr-4 md:rounded-full md:border md:border-white/5">
                            <div className="w-9 h-9 rounded-full bg-white/10 overflow-hidden shrink-0 border border-white/10">
                                {profile?.profile_image ? (
                                    <img src={profile.profile_image} className="w-full h-full object-cover" alt="Profile" />
                                ) : (
                                    <User size={18} className="m-auto h-full text-gray-400" />
                                )}
                            </div>
                            <div className="hidden md:block">
                                <p className="text-sm font-bold text-white leading-tight">
                                    {profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Admin User' : 'Admin User'}
                                </p>
                                <p className="text-[11px] text-gray-500 font-medium mt-0.5">Propriétaire</p>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto w-full p-6 md:p-10">
                    <div className="max-w-7xl mx-auto w-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}

function CalendarIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
    )
}
