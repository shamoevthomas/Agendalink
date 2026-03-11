'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, Calendar, Clock, Video, BarChart2, Bell, Plus, Link as LinkIcon, Copy, X, Loader2, Phone, Pencil, Trash2, Send } from 'lucide-react';


export default function MainDashboardPage() {
    const [meetings, setMeetings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [reminders, setReminders] = useState<any[]>([]);
    const [remindersLoading, setRemindersLoading] = useState(true);

    // Meeting Creation State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [description, setDescription] = useState('');
    const [isGoogleMeet, setIsGoogleMeet] = useState(true);
    const [requestPhone, setRequestPhone] = useState(false);
    const [duration, setDuration] = useState(60);
    const [customSlug, setCustomSlug] = useState('');
    const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

    // Analytics State
    const [analyticsMeeting, setAnalyticsMeeting] = useState<any>(null);
    const [analyticsData, setAnalyticsData] = useState<{ views: number, joins: any[] } | null>(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);

    // Edit Meeting State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingMeeting, setEditingMeeting] = useState<any>(null);
    const [editDate, setEditDate] = useState('');
    const [editTime, setEditTime] = useState('');
    const [editDuration, setEditDuration] = useState(60);

    // Delete Meeting State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingMeeting, setDeletingMeeting] = useState<any>(null);

    // Manual Reminder State
    const [sendingReminder, setSendingReminder] = useState<string | null>(null);

    useEffect(() => {
        fetchMeetings();
        fetchReminders();

        // Auto-refresh every 30 seconds
        const interval = setInterval(() => {
            fetchMeetings();
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (isModalOpen) {
            // Set default date to tomorrow
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            setDate(tomorrow.toISOString().split('T')[0]);

            // Set default time to current time rounded up to nearest 10 min
            const now = new Date();
            const minutes = now.getMinutes();
            const roundedMinutes = Math.ceil(minutes / 10) * 10;
            now.setMinutes(roundedMinutes);
            now.setSeconds(0);

            // Format time as HH:MM
            const hours = String(now.getHours()).padStart(2, '0');
            const mins = String(now.getMinutes()).padStart(2, '0');
            setTime(`${hours}:${mins}`);

            // Reset slug edit state
            setIsSlugManuallyEdited(false);
        }
    }, [isModalOpen]);

    // Auto-slug generation
    useEffect(() => {
        if (!isSlugManuallyEdited && title) {
            const slug = title.toLowerCase()
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
            setCustomSlug(slug);
        }
    }, [title, isSlugManuallyEdited]);

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

    const handleCreateMeeting = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        try {
            const res = await fetch('/api/meetings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    date,
                    time,
                    description,
                    isGoogleMeet,
                    custom_slug: customSlug,
                    request_phone: requestPhone,
                    duration: duration
                }),
            });

            if (res.ok) {
                setIsModalOpen(false);
                fetchMeetings();
                // Reset form
                setTitle('');
                setDate('');
                setTime('');
                setDescription('');
                setCustomSlug('');
                setRequestPhone(false);
                setDuration(60);
                setIsSlugManuallyEdited(false);
            } else {
                const errorData = await res.json();
                alert('Erreur: ' + errorData.error);
            }
        } catch (err) {
            alert('Une erreur est survenue');
        } finally {
            setFormLoading(false);
        }
    };

    const copyLink = (shareId: string) => {
        const url = `${window.location.origin}/join/${shareId}`;
        navigator.clipboard.writeText(url);
        alert('Lien copié !');
    };

    const openAnalytics = async (meeting: any) => {
        setAnalyticsMeeting(meeting);
        setAnalyticsLoading(true);
        setAnalyticsData(null);
        try {
            const res = await fetch(`/api/admin/analytics/${meeting.id}`);
            if (res.ok) {
                const data = await res.json();
                setAnalyticsData(data);
            }
        } catch (err) {
            console.error('Analytics error:', err);
        } finally {
            setAnalyticsLoading(false);
        }
    };

    const handleUpdateMeeting = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        try {
            const res = await fetch('/api/meetings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editingMeeting.id,
                    date: editDate,
                    time: editTime,
                    duration: editDuration
                }),
            });

            if (res.ok) {
                setIsEditModalOpen(false);
                fetchMeetings();
            } else {
                const data = await res.json();
                alert(data.error || 'Erreur lors de la modification');
            }
        } catch (err) {
            console.error('Update meeting error:', err);
            alert('Une erreur est survenue');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDeleteMeeting = async () => {
        setFormLoading(true);
        try {
            const res = await fetch(`/api/meetings?id=${deletingMeeting.id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                setIsDeleteModalOpen(false);
                fetchMeetings();
            } else {
                const data = await res.json();
                alert(data.error || 'Erreur lors de la suppression');
            }
        } catch (err) {
            console.error('Delete meeting error:', err);
            alert('Une erreur est survenue');
        } finally {
            setFormLoading(false);
        }
    };

    const sendManualReminder = async (meeting: any) => {
        if (!meeting.google_event_id) {
            alert("Ce rendez-vous n'est pas synchronisé avec Google Calendar.");
            return;
        }

        setSendingReminder(meeting.id);
        try {
            const res = await fetch('/api/cron/reminders/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId: meeting.google_event_id }),
            });

            if (res.ok) {
                alert('Rappel envoyé avec succès !');
            } else {
                const data = await res.json();
                alert(data.error || "Erreur lors de l'envoi du rappel");
            }
        } catch (err) {
            console.error('Manual reminder error:', err);
            alert('Une erreur est survenue lors de l\'envoi');
        } finally {
            setSendingReminder(null);
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
                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className="px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20"
                        >
                            <Plus size={16} />
                            Nouveau Rendez-vous
                        </button>
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
                                <div 
                                    key={meeting.id} 
                                    onClick={() => openAnalytics(meeting)}
                                    className="grid grid-cols-4 sm:grid-cols-5 p-4 items-center text-sm hover:bg-white/[0.02] transition-all group cursor-pointer"
                                >
                                    <div className="text-gray-400 group-hover:text-white transition-colors">
                                        {new Date(meeting.meeting_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </div>
                                    <div className="text-gray-400 group-hover:text-white transition-colors">
                                        {meeting.meeting_time.substring(0, 5)}
                                    </div>
                                    <div className="col-span-2 sm:col-span-1 font-bold text-white truncate pr-4">
                                        {meeting.title}
                                    </div>
                                    <div className="hidden sm:block">
                                        {(() => {
                                            const now = new Date();
                                            const [hours, minutes] = meeting.meeting_time.split(':').map(Number);
                                            const start = new Date(meeting.meeting_date);
                                            start.setHours(hours, minutes, 0, 0);
                                            
                                            const end = new Date(start.getTime() + (meeting.duration || 60) * 60000);

                                            if (now >= start && now <= end) {
                                                return (
                                                    <span className="px-2 py-1 bg-green-500/10 text-green-500 text-[10px] font-bold rounded border border-green-500/20 flex items-center gap-1.5 w-fit">
                                                        <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                                                        En cours
                                                    </span>
                                                );
                                            } else if (now > end) {
                                                return (
                                                    <span className="px-2 py-1 bg-white/5 text-gray-500 text-[10px] font-bold rounded border border-white/10 w-fit">
                                                        Passé
                                                    </span>
                                                );
                                            } else {
                                                return (
                                                    <span className="px-2 py-1 bg-blue-500/10 text-blue-500 text-[10px] font-bold rounded border border-blue-500/20 w-fit">
                                                        Prévu
                                                    </span>
                                                );
                                            }
                                        })()}
                                    </div>
                                    <div className="text-right text-gray-500 font-medium text-xs flex items-center justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                                        <button 
                                            onClick={() => copyLink(meeting.share_id)}
                                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-blue-400 font-bold transition-all flex items-center gap-1.5"
                                        >
                                            <Copy size={12} />
                                            Lien
                                        </button>
                                        <button 
                                            onClick={() => sendManualReminder(meeting)}
                                            disabled={sendingReminder === meeting.id || !meeting.google_event_id}
                                            className={`px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white font-bold transition-all flex items-center gap-1.5 ${(!meeting.google_event_id || sendingReminder === meeting.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            {sendingReminder === meeting.id ? (
                                                <Loader2 size={12} className="animate-spin" />
                                            ) : (
                                                <Send size={12} />
                                            )}
                                            Rappel
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setEditingMeeting(meeting);
                                                setEditDate(meeting.meeting_date);
                                                setEditTime(meeting.meeting_time.substring(0, 5));
                                                setEditDuration(meeting.duration || 60);
                                                setIsEditModalOpen(true);
                                            }}
                                            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setDeletingMeeting(meeting);
                                                setIsDeleteModalOpen(true);
                                            }}
                                            className="p-2 bg-white/5 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-rose-500 transition-all"
                                        >
                                            <Trash2 size={14} />
                                        </button>
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
            {/* Nouveau Rendez-vous Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-[#0a0a0a] w-full max-w-lg border border-white/10 rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 pb-4 flex items-center justify-between">
                            <h3 className="text-2xl font-bold text-white">Nouveau Rendez-vous</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/5 rounded-xl text-gray-500 hover:text-white transition-all">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateMeeting} className="p-8 pt-4 space-y-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-2">
                                <label className="text-[13px] font-medium text-gray-400 ml-1">Titre</label>
                                <input
                                    required
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full px-5 py-4 bg-black border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-gray-700"
                                    placeholder="Appel de découverte"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[13px] font-medium text-gray-400 ml-1 flex items-center gap-2">
                                    <Calendar size={14} className="text-gray-500" /> Date
                                </label>
                                <input
                                    required
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full px-5 py-4 bg-black border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all [color-scheme:dark]"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[13px] font-medium text-gray-400 ml-1 flex items-center gap-2">
                                    <Clock size={14} className="text-gray-500" /> Heure
                                </label>
                                <input
                                    required
                                    type="time"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    className="w-full px-5 py-4 bg-black border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all [color-scheme:dark]"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[13px] font-medium text-gray-400 ml-1 flex items-center gap-2">
                                    <Clock size={14} className="text-gray-500" /> Durée
                                </label>
                                <select
                                    value={duration}
                                    onChange={(e) => setDuration(parseInt(e.target.value))}
                                    className="w-full px-5 py-4 bg-black border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all appearance-none cursor-pointer"
                                >
                                    <option value={15}>15 minutes</option>
                                    <option value={30}>30 minutes</option>
                                    <option value={45}>45 minutes</option>
                                    <option value={60}>1h</option>
                                    <option value={90}>1h30</option>
                                    <option value={120}>2h</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[13px] font-medium text-gray-400 ml-1">Description (Optionnel)</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full px-5 py-4 bg-black border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all min-h-[120px] resize-none placeholder:text-gray-700"
                                    placeholder="Sujet de la réunion..."
                                />
                            </div>

                            <div className="space-y-4">
                                {/* Google Meet Toggle */}
                                <div className="flex items-center justify-between p-5 bg-[#111]/50 border border-white/5 rounded-2xl hover:border-white/10 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all ${isGoogleMeet ? 'bg-blue-600/10 border-blue-600/20 text-blue-500' : 'bg-white/5 border-white/10 text-gray-500'}`}>
                                            <Video size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-white text-sm">Générer un lien Google Meet</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsGoogleMeet(!isGoogleMeet)}
                                        className={`w-14 h-7 rounded-full relative transition-all duration-300 px-1 ${isGoogleMeet ? 'bg-blue-600' : 'bg-gray-700'}`}
                                    >
                                        <div className={`w-5 h-5 bg-white rounded-full transition-all duration-300 ${isGoogleMeet ? 'translate-x-7' : 'translate-x-0'}`} />
                                    </button>
                                </div>

                                {/* Phone Request Toggle */}
                                <div className="flex items-center justify-between p-5 bg-[#111]/50 border border-white/5 rounded-2xl hover:border-white/10 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all ${requestPhone ? 'bg-blue-600/10 border-blue-600/20 text-blue-500' : 'bg-white/5 border-white/10 text-gray-500'}`}>
                                            <Phone size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-white text-sm">Demander le numéro de téléphone <span className="text-gray-600 font-medium">(Optionnel)</span></p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setRequestPhone(!requestPhone)}
                                        className={`w-14 h-7 rounded-full relative transition-all duration-300 px-1 ${requestPhone ? 'bg-blue-600' : 'bg-gray-700'}`}
                                    >
                                        <div className={`w-5 h-5 bg-white rounded-full transition-all duration-300 ${requestPhone ? 'translate-x-7' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2 pt-2">
                                <label className="text-[13px] font-medium text-gray-400 ml-1">Lien personnalisé (Optionnel)</label>
                                <div className="flex items-center gap-3 px-5 py-4 bg-black border border-white/10 rounded-2xl group focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
                                    <span className="text-gray-600 text-sm font-medium">/join/</span>
                                    <input
                                        type="text"
                                        value={customSlug}
                                        onChange={(e) => {
                                            setCustomSlug(e.target.value);
                                            setIsSlugManuallyEdited(true);
                                        }}
                                        className="flex-1 bg-transparent border-none outline-none text-white text-sm p-0 placeholder:text-gray-700 font-medium"
                                        placeholder="mon-appel-perso"
                                    />
                                </div>
                                <p className="text-[11px] text-gray-600 italic ml-1">Si vide, un lien unique sera généré automatiquement.</p>
                            </div>

                            <button
                                type="submit"
                                disabled={formLoading}
                                className="w-full py-5 bg-white text-black font-black text-lg rounded-2xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2 mt-8 shadow-2xl shadow-white/5 disabled:opacity-50"
                            >
                                {formLoading ? <Loader2 className="animate-spin" size={24} /> : 'Créer et Synchroniser'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {/* Analytics Modal */}
            {analyticsMeeting && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-[#0a0a0a] w-full max-w-2xl border border-white/10 rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 pb-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl">
                                    <BarChart2 size={24} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-white">Statistiques</h3>
                                    <p className="text-sm text-gray-500">{analyticsMeeting.title}</p>
                                </div>
                            </div>
                            <button onClick={() => setAnalyticsMeeting(null)} className="p-2 hover:bg-white/5 rounded-xl text-gray-500 hover:text-white transition-all">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-8 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
                            {analyticsLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <Loader2 className="animate-spin text-blue-500" size={40} />
                                    <p className="text-gray-500 font-medium">Chargement des données...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="p-6 bg-[#111] border border-white/5 rounded-3xl group hover:border-white/10 transition-all">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2">Ouvertures du lien</p>
                                            <p className="text-5xl font-black text-white tracking-tighter">{analyticsData?.views || 0}</p>
                                        </div>
                                        <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-3xl group hover:border-blue-500/20 transition-all">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500/70 mb-2">Inscriptions (Emails)</p>
                                            <p className="text-5xl font-black text-blue-500 tracking-tighter">{analyticsData?.joins?.length || 0}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <Plus size={18} />
                                            <h4 className="font-bold tracking-tight">Liste des participants</h4>
                                        </div>

                                        <div className="space-y-3">
                                            {analyticsData?.joins && analyticsData.joins.length > 0 ? (
                                                analyticsData.joins.map((join: any, i: number) => (
                                                    <div key={i} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl group hover:border-white/10 transition-all">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 bg-blue-600/10 text-blue-500 rounded-xl flex items-center justify-center font-bold">
                                                                {join.email[0].toUpperCase()}
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <p className="text-sm font-bold text-gray-200">{join.email}</p>
                                                                {join.phone && (
                                                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-xs font-bold border border-blue-500/20">
                                                                        <Phone size={12} />
                                                                        {join.phone}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <p className="text-[10px] text-gray-600 font-bold uppercase">
                                                            {new Date(join.created_at).toLocaleDateString()} <br/>
                                                            <span className="opacity-50">{new Date(join.created_at).toLocaleTimeString().slice(0, 5)}</span>
                                                        </p>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-10 bg-white/5 border border-dashed border-white/10 rounded-3xl">
                                                    <p className="text-gray-500 text-sm font-medium">Aucun participant pour le moment</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="p-8 pt-0">
                            <button
                                onClick={() => setAnalyticsMeeting(null)}
                                className="w-full py-5 bg-white text-black font-black text-lg rounded-2xl hover:bg-gray-200 transition-all active:scale-[0.98]"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Meeting Modal */}
            {isEditModalOpen && editingMeeting && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-[#0a0a0a] w-full max-w-lg border border-white/10 rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 pb-4 flex items-center justify-between">
                            <h3 className="text-2xl font-bold text-white">Modifier le rendez-vous</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-white/5 rounded-xl text-gray-500 hover:text-white transition-all">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateMeeting} className="p-8 pt-4 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[13px] font-medium text-gray-400 ml-1 flex items-center gap-2">
                                    <Calendar size={14} className="text-gray-500" /> Date
                                </label>
                                <input
                                    required
                                    type="date"
                                    value={editDate}
                                    onChange={(e) => setEditDate(e.target.value)}
                                    className="w-full px-5 py-4 bg-black border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all [color-scheme:dark]"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[13px] font-medium text-gray-400 ml-1 flex items-center gap-2">
                                    <Clock size={14} className="text-gray-500" /> Heure
                                </label>
                                <input
                                    required
                                    type="time"
                                    value={editTime}
                                    onChange={(e) => setEditTime(e.target.value)}
                                    className="w-full px-5 py-4 bg-black border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all [color-scheme:dark]"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[13px] font-medium text-gray-400 ml-1 flex items-center gap-2">
                                    <Clock size={14} className="text-gray-500" /> Durée
                                </label>
                                <select
                                    value={editDuration}
                                    onChange={(e) => setEditDuration(parseInt(e.target.value))}
                                    className="w-full px-5 py-4 bg-black border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all appearance-none cursor-pointer"
                                >
                                    <option value={15}>15 minutes</option>
                                    <option value={30}>30 minutes</option>
                                    <option value={45}>45 minutes</option>
                                    <option value={60}>1h</option>
                                    <option value={90}>1h30</option>
                                    <option value={120}>2h</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="flex-1 py-4 bg-white/5 text-white font-bold rounded-2xl hover:bg-white/10 transition-all"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all disabled:opacity-50"
                                >
                                    {formLoading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Enregistrer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && deletingMeeting && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-[#0a0a0a] w-full max-w-sm border border-white/10 rounded-[32px] shadow-2xl p-8 text-center animate-in zoom-in-95 duration-300">
                        <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Trash2 size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Supprimer le rendez-vous ?</h3>
                        <p className="text-gray-500 text-sm mb-8">
                            Cette action est irréversible et supprimera également l'événement sur Google Agenda.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleDeleteMeeting}
                                disabled={formLoading}
                                className="w-full py-4 bg-rose-600 text-white font-bold rounded-2xl hover:bg-rose-700 transition-all disabled:opacity-50"
                            >
                                {formLoading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Supprimer définitivement'}
                            </button>
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="w-full py-4 bg-white/5 text-white font-bold rounded-2xl hover:bg-white/10 transition-all"
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
