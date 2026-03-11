'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, Calendar, Clock, Video, BarChart2, Bell, Plus } from 'lucide-react';


export default function MainDashboardPage() {
    const [meetings, setMeetings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [reminders, setReminders] = useState<any[]>([]);
    const [remindersLoading, setRemindersLoading] = useState(true);

    useEffect(() => {
        fetchMeetings();
        fetchReminders();

        // Auto-refresh every 30 seconds
        const interval = setInterval(() => {
            fetchMeetings();
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchMeetings = async () => {
        try {
            const res = await fetch('/api/meetings');
            if (res.ok) {
                const data = await res.json();
                setMeetings(data);
            }
        } catch (err) {
            console.error('Fetch meetings error:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchReminders = async () => {
        try {
            const res = await fetch('/api/admin/settings');
            if (res.ok) {
                const data = await res.json();
                if (data.reminders_config) {
                    setReminders(data.reminders_config);
                }
            }
        } catch (err) {
            console.error('Fetch reminders error:', err);
        } finally {
            setRemindersLoading(false);
        }
    };

    const handleSync = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/settings');
            if (res.ok) {
                const profile = await res.json();
                if (profile.email) {
                    await fetch(`/api/cron/reminders/sync?email=${profile.email}`);
                }
            }
            await fetchMeetings();
        } catch (err) {
            console.error('Sync error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-500 pb-20">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <Sparkles className="text-blue-500" size={28} />
                    Vue d'ensemble
                </h1>
            </div>

            {/* Top Section: Meetings List */}
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold">Mes Rendez-vous</h2>
                        <p className="text-gray-500 text-sm mt-1">Gérez vos synchronisations et vos prochains appels Meet.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/admin/dashboard" className="px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl font-bold text-sm transition-all flex items-center gap-2">
                            <BarChart2 size={16} />
                            Stats
                        </Link>
                        <button onClick={handleSync} disabled={loading} className="px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl font-bold text-sm transition-all flex items-center gap-2 disabled:opacity-50">
                            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            Actualiser
                        </button>
                    </div>
                </div>

                <div className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-4 sm:grid-cols-5 p-4 border-b border-white/5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                        <div>Date</div>
                        <div>Heure</div>
                        <div className="col-span-2 sm:col-span-1">Participant</div>
                        <div className="hidden sm:block">Statut</div>
                        <div className="text-right">Actions</div>
                    </div>

                    {/* Table Body */}
                    {loading ? (
                        <div className="p-12 text-center text-gray-500">Chargement...</div>
                    ) : meetings.length === 0 ? (
                        <div className="p-12 text-center">
                            <Calendar className="mx-auto mb-3 text-gray-600" size={32} />
                            <p className="text-gray-500 font-medium">Aucun rendez-vous à venir.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {meetings.slice(0, 5).map((meeting: any) => (
                                <div key={meeting.id} className="grid grid-cols-4 sm:grid-cols-5 p-4 items-center text-sm hover:bg-white/[0.02] transition-colors">
                                    <div className="text-gray-400">
                                        {new Date(meeting.meeting_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </div>
                                    <div className="text-gray-400">
                                        {meeting.meeting_time.substring(0, 5)}
                                    </div>
                                    <div className="col-span-2 sm:col-span-1 font-bold text-white truncate pr-4">
                                        {meeting.title}
                                    </div>
                                    <div className="hidden sm:block">
                                        {meeting.google_event_id ? (
                                            <span className="px-2 py-1 bg-blue-500/10 text-blue-500 text-[10px] font-bold rounded border border-blue-500/20">Synchronisé</span>
                                        ) : (
                                            <span className="px-2 py-1 bg-gray-500/10 text-gray-400 text-[10px] font-bold rounded border border-white/10">En attente</span>
                                        )}
                                    </div>
                                    <div className="text-right text-gray-500 font-medium text-xs flex items-center justify-end gap-3">
                                        <Link href="/admin/dashboard" className="hover:text-white transition-colors">Détails</Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {meetings.length > 5 && (
                    <div className="text-center mt-2">
                        <Link href="/admin/dashboard" className="text-blue-500 text-sm font-bold hover:text-blue-400">
                            Voir tous les rendez-vous →
                        </Link>
                    </div>
                )}
            </div>

            {/* Bottom Section: Reminders list */}
            <div className="space-y-6 pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-3">
                            <Bell className="text-blue-500" size={24} />
                            Prochains Rappels Meet
                        </h2>
                    </div>
                    <div>
                        <span className="px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-500 text-[11px] font-bold uppercase tracking-widest rounded-lg flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            Automatisation active ({reminders.length})
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {remindersLoading ? (
                        <div className="col-span-full p-12 text-center text-gray-500">Chargement des rappels...</div>
                    ) : (
                        <>
                            {reminders.map((reminder) => (
                                <div key={reminder.id} className="bg-[#111] border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all flex flex-col justify-between">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-gray-400 border border-white/10">
                                            {reminder.type === 'at_event' ? <Video size={20} /> : <Calendar size={20} />}
                                        </div>
                                        <div className="w-8 h-4 bg-blue-600 rounded-full relative">
                                            <div className="absolute right-1 top-1 bottom-1 w-2 bg-white rounded-full" />
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white mb-1">
                                            {reminder.type === 'at_booking' ? 'À la réservation' : 
                                             reminder.type === 'at_event' ? "Au moment de l'appel" : 
                                             `${reminder.value} ${reminder.unit === 'minutes' ? 'Minutes' : 'Heures'} avant`}
                                        </h3>
                                        <p className="text-sm text-gray-500 line-clamp-2">
                                            {reminder.subject || 'Rappel: Votre rendez-vous approche'}
                                        </p>
                                    </div>
                                    <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                                        <Link href="/admin/reminders" className="text-blue-500 text-xs font-bold uppercase tracking-wider hover:text-blue-400 flex items-center gap-1">
                                            Configurer
                                        </Link>
                                    </div>
                                </div>
                            ))}
                            
                            <Link href="/admin/reminders" className="border-2 border-dashed border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center text-gray-500 hover:text-white hover:border-white/20 hover:bg-white/[0.02] transition-all min-h-[160px] group">
                                <Plus size={24} className="mb-2 group-hover:scale-110 transition-transform" />
                                <span className="font-bold text-xs uppercase tracking-widest">Ajouter un rappel</span>
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
