'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { 
    Calendar, Mail, Settings, CheckCircle2, AlertCircle, 
    ArrowLeft, Video, Send, Loader2, Bell, Clock, 
    ExternalLink, CheckCircle 
} from 'lucide-react';

export default function RemindersPage() {
    const [settings, setSettings] = useState<any>(null);
    const [meetings, setMeetings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showConfig, setShowConfig] = useState(false);
    const [sendingReminder, setSendingReminder] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchSettingsAndMeetings();
    }, []);

    const fetchSettingsAndMeetings = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('al_admin_settings')
            .select('*')
            .single();

        if (data) {
            setSettings(data);
            if (data.google_refresh_token) {
                await fetchUpcomingMeetings(data.email);
            }
        }
        setLoading(false);
    };

    const fetchUpcomingMeetings = async (email: string) => {
        setSyncing(true);
        try {
            const res = await fetch(`/api/cron/reminders/sync?email=${email}`);
            const data = await res.json();
            if (data.success) {
                setMeetings(data.meetings);
            }
        } catch (err) {
            console.error('Sync error:', err);
        } finally {
            setSyncing(false);
        }
    };

    const handleSaveConfig = async () => {
        setSaving(true);
        const { error } = await supabase
            .from('al_admin_settings')
            .update({
                reminders_enabled: settings.reminders_enabled,
                reminder_minutes_before: settings.reminder_minutes_before,
            })
            .eq('id', settings.id);

        if (error) {
            setMessage({ type: 'error', text: 'Error saving settings: ' + error.message });
        } else {
            setMessage({ type: 'success', text: 'Configuration enregistrée !' });
            setTimeout(() => {
                setMessage(null);
                setShowConfig(false);
            }, 2000);
        }
        setSaving(false);
    };

    const sendManualReminder = async (eventId: string) => {
        setSendingReminder(eventId);
        try {
            const res = await fetch('/api/cron/reminders/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId, hostEmail: settings.email }),
            });
            const data = await res.json();
            if (data.success) {
                alert('Rappel envoyé avec succès !');
            } else {
                alert('Erreur: ' + data.error);
            }
        } catch (err) {
            alert('Une erreur est survenue.');
        } finally {
            setSendingReminder(null);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-10">
            <div className="max-w-5xl mx-auto space-y-10">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <Link href="/admin/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors mb-4 text-sm font-medium w-fit">
                            <ArrowLeft className="w-4 h-4" />
                            Retour au Dashboard
                        </Link>
                        <h1 className="text-4xl font-black flex items-center gap-4">
                            <Bell className="w-10 h-10 text-blue-500" />
                            Mes Rappels Meet
                        </h1>
                        <p className="text-gray-500 mt-2">Gérez et automatisez vos rappels de réunion</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setShowConfig(true)}
                            className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl font-bold hover:bg-white/10 transition-all flex items-center gap-2"
                        >
                            <Settings className="w-5 h-5" />
                            Configurer
                        </button>
                        <button 
                            onClick={() => fetchUpcomingMeetings(settings.email)}
                            disabled={syncing}
                            className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50"
                        >
                            {syncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calendar className="w-5 h-5" />}
                            {syncing ? 'Synchronisation...' : 'Actualiser'}
                        </button>
                    </div>
                </div>

                {/* Status Bar */}
                <div className={`p-4 rounded-2xl border flex items-center justify-between ${settings?.reminders_enabled ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-gray-500/5 border-white/5 text-gray-500'}`}>
                    <div className="flex items-center gap-3">
                        {settings?.reminders_enabled ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        <p className="font-bold text-sm">
                            {settings?.reminders_enabled 
                                ? `Automatisation active (${settings?.reminder_minutes_before} min avant)` 
                                : 'Automatisation désactivée'}
                        </p>
                    </div>
                    <div className="text-xs opacity-60">
                        Agenda: {settings?.email}
                    </div>
                </div>

                {/* Meetings List */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Video className="w-5 h-5 text-gray-400" />
                        Prochains Appels Meet
                    </h2>

                    {meetings.length === 0 ? (
                        <div className="bg-white/5 border border-dashed border-white/10 rounded-3xl p-20 text-center">
                            <Calendar className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                            <p className="text-gray-500 font-medium">Aucun appel Google Meet détecté dans les prochains 30 jours.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {meetings.map((meeting: any, idx: number) => {
                                const startTime = new Date(meeting.start_time);
                                return (
                                    <div key={idx} className="bg-[#111] border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-white/20 transition-all group">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight">{meeting.title || 'Réunion sans titre'}</h3>
                                                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 text-[10px] font-black rounded border border-blue-500/20">MEET</span>
                                            </div>
                                            <div className="flex flex-wrap gap-6 text-sm text-gray-400">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-blue-500" />
                                                    {startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Mail className="w-4 h-4 text-gray-500" />
                                                    {meeting.guest_email || 'Pas d\'invité détecté'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <a 
                                                href={meeting.google_meet_link} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="p-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                                                title="Ouvrir Meet"
                                            >
                                                <ExternalLink className="w-5 h-5" />
                                            </a>
                                            <button 
                                                onClick={() => sendManualReminder(meeting.google_event_id)}
                                                disabled={sendingReminder === meeting.google_event_id}
                                                className="px-6 py-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold rounded-xl hover:bg-blue-500/20 transition-all text-sm flex items-center gap-2"
                                            >
                                                {sendingReminder === meeting.google_event_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                                Envoyer un rappel
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Placeholder for Email Config Section */}
                <div className="pt-10 border-t border-white/10">
                    <div className="bg-gradient-to-br from-blue-600/20 to-transparent p-8 rounded-3xl border border-blue-500/20">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-3">
                            <Mail className="text-blue-400" />
                            Personnalisation de l'Email
                        </h3>
                        <p className="text-gray-400 text-sm leading-relaxed mb-6">
                            L'email est actuellement envoyé avec un design standard CloseOS. <br/>
                            <strong>Prochaine étape :</strong> Intégration de votre HTML personnalisé. <br/>
                            Variables disponibles : <code>{"{name}"}</code>, <code>{"{meet_link}"}</code>, <code>{"{time}"}</code>.
                        </p>
                        <div className="p-4 bg-black/40 rounded-xl border border-white/5 font-mono text-xs text-gray-500 italic">
                            Email HTML injecté ici...
                        </div>
                    </div>
                </div>
            </div>

            {/* Config Modal */}
            {showConfig && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#111] w-full max-w-lg border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                            <h3 className="text-xl font-bold">Automation Settings</h3>
                            <button onClick={() => setShowConfig(false)} className="p-2 text-gray-500 hover:text-white transition-colors">
                                <AlertCircle className="w-6 h-6 rotate-45" />
                            </button>
                        </div>
                        
                        <div className="p-8 space-y-8">
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                                <div>
                                    <p className="font-bold">Activer les rappels auto</p>
                                    <p className="text-xs text-gray-500">Sync & envoi automatique via Cron</p>
                                </div>
                                <button
                                    onClick={() => setSettings({ ...settings, reminders_enabled: !settings.reminders_enabled })}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings?.reminders_enabled ? 'bg-blue-600' : 'bg-gray-800'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings?.reminders_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Délai du rappel automatique</label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="number"
                                        value={settings?.reminder_minutes_before || 15}
                                        onChange={(e) => setSettings({ ...settings, reminder_minutes_before: parseInt(e.target.value) })}
                                        className="w-full px-6 py-4 bg-black border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-xl"
                                    />
                                    <span className="text-gray-500 font-bold">minutes avant</span>
                                </div>
                            </div>

                            {message && (
                                <div className={`p-4 rounded-xl text-center font-bold text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                    {message.text}
                                </div>
                            )}

                            <button
                                onClick={handleSaveConfig}
                                disabled={saving}
                                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-600/20"
                            >
                                {saving ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                                {saving ? 'Enregistrement...' : 'Sauvegarder'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
