'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { 
    Calendar, Mail, Settings, CheckCircle2, AlertCircle, 
    ArrowLeft, Video, Send, Loader2, Bell, Clock, 
    ExternalLink, CheckCircle, Plus, Trash2, ChevronDown, 
    Code, Info
} from 'lucide-react';

type ReminderType = 'at_booking' | 'before_event' | 'at_event';

interface ReminderConfig {
    id: string;
    type: ReminderType;
    value?: number;
    unit?: 'minutes' | 'hours';
    html_template: string;
}

const DEFAULT_TEMPLATE = `
<div style="font-family: 'Inter', sans-serif; padding: 40px; background: #f9fafb; border-radius: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 16px; border: 1px solid #e5e7eb; shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
        <h2 style="color: #1d4ed8; margin-top: 0; font-size: 24px;">Rappel de réunion</h2>
        <p>Bonjour {{name}},</p>
        <p>Ceci est un rappel pour votre réunion à venir :</p>
        <div style="background: #eff6ff; padding: 20px; border-radius: 12px; margin: 24px 0;">
            <p style="margin: 0; font-weight: bold; color: #1e40af;">Heure : {{time}}</p>
            <p style="margin: 10px 0 0 0;">
                <a href="{{meet_link}}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Rejoindre la réunion</a>
            </p>
        </div>
        <p style="color: #6b7280; font-size: 14px;">À tout de suite !</p>
    </div>
</div>
`;

export default function RemindersPage() {
    const [settings, setSettings] = useState<any>(null);
    const [meetings, setMeetings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showConfig, setShowConfig] = useState(false);
    const [sendingReminder, setSendingReminder] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    
    // Config editing state
    const [reminders, setReminders] = useState<ReminderConfig[]>([]);

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
            setReminders(data.reminders_config || []);
            console.log("Settings loaded:", data);
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
                reminders_config: reminders,
            })
            .eq('id', settings.id);

        if (error) {
            setMessage({ type: 'error', text: 'Error saving: ' + error.message });
        } else {
            setMessage({ type: 'success', text: 'Configuration enregistrée !' });
            setTimeout(() => {
                setMessage(null);
                setShowConfig(false);
            }, 2000);
        }
        setSaving(false);
    };

    const addReminder = () => {
        const newReminder: ReminderConfig = {
            id: crypto.randomUUID(),
            type: 'before_event',
            value: 15,
            unit: 'minutes',
            html_template: DEFAULT_TEMPLATE,
        };
        setReminders([...reminders, newReminder]);
    };

    const updateReminder = (id: string, updates: Partial<ReminderConfig>) => {
        setReminders(reminders.map(r => r.id === id ? { ...r, ...updates } : r));
    };

    const removeReminder = (id: string) => {
        setReminders(reminders.filter(r => r.id !== id));
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
                                ? `Automatisation active (${reminders.length} rappels configurés)` 
                                : 'Automatisation désactivée'}
                        </p>
                    </div>
                </div>

                {/* Meetings List */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Video className="w-5 h-5 text-gray-400" />
                        Prochains Appels Meet (30 jours)
                    </h2>

                    {meetings.length === 0 ? (
                        <div className="bg-white/5 border border-dashed border-white/10 rounded-3xl p-20 text-center">
                            <Calendar className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                            <p className="text-gray-500 font-medium">Aucun appel Google Meet détecté.</p>
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
                                                    {startTime.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} • {startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
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
                                                Rappel manuel
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ADVANCED CONFIG MODAL */}
            {showConfig && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
                    <div className="bg-[#0f0f0f] w-full max-w-5xl h-[90vh] border border-white/10 rounded-[40px] shadow-3xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                            <div>
                                <h3 className="text-2xl font-black flex items-center gap-3 italic uppercase tracking-tighter">
                                    <Settings className="w-8 h-8 text-blue-500" />
                                    Advanced Configuration
                                </h3>
                                <p className="text-gray-500 text-sm">Configurez vos automates de rappels personnalisés</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-full border border-white/10">
                                    <span className="text-xs font-bold text-gray-400 uppercase">Status</span>
                                    <button
                                        onClick={() => setSettings({ ...settings, reminders_enabled: !settings.reminders_enabled })}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings?.reminders_enabled ? 'bg-blue-600' : 'bg-gray-800'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings?.reminders_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                                
                                {/* Profile Card Snippet Button */}
                                <div className="group relative">
                                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 text-blue-500 border border-blue-500/20 rounded-full font-bold text-xs hover:bg-blue-600/20 transition-all">
                                        <Code size={14} />
                                        Profile Card HTML
                                    </button>
                                    <div className="absolute top-full right-0 mt-3 w-80 p-5 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-3">Copy this snippet</p>
                                        <div className="bg-black p-3 rounded-xl border border-white/5 font-mono text-[10px] text-gray-400 break-all select-all leading-relaxed">
                                            {`<div style="display:flex;align-items:center;gap:12px;padding:16px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0"><img src="{{profile_img}}" style="width:48px;height:48px;border-radius:50%"/><div><b style="display:block;color:#0f172a">{{name}}</b><span style="font-size:12px;color:#64748b">Directeur CloseOS</span></div></div>`}
                                        </div>
                                        <p className="mt-3 text-[9px] text-gray-500 italic">Injectez ce code dans vos templates pour afficher votre profil.</p>
                                    </div>
                                </div>

                                <button onClick={() => setShowConfig(false)} className="p-3 bg-white/5 rounded-2xl text-gray-500 hover:text-white transition-all border border-white/10">
                                    <AlertCircle className="w-6 h-6 rotate-45" />
                                </button>
                            </div>
                        </div>
                        
                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-10 space-y-12">
                            {/* Reminders List */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-lg font-bold flex items-center gap-3">
                                        <Bell className="text-blue-500" size={20} />
                                        Mes Automates ({reminders.length})
                                    </h4>
                                    <button 
                                        onClick={addReminder}
                                        className="px-4 py-2 bg-blue-600/10 text-blue-500 border border-blue-500/20 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-600/20 transition-all text-sm"
                                    >
                                        <Plus size={16} />
                                        Ajouter un rappel
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {reminders.map((reminder) => (
                                        <div key={reminder.id} className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 space-y-6 relative group hover:border-blue-500/30 transition-all">
                                            <button 
                                                onClick={() => removeReminder(reminder.id)}
                                                className="absolute top-6 right-6 p-2 text-gray-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={20} />
                                            </button>

                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                                {/* Logic Config */}
                                                <div className="space-y-6">
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Type de déclencheur</label>
                                                        <div className="relative">
                                                            <select 
                                                                value={reminder.type}
                                                                onChange={(e) => updateReminder(reminder.id, { type: e.target.value as ReminderType })}
                                                                className="w-full appearance-none px-6 py-4 bg-black border border-white/10 rounded-2xl text-white font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                                            >
                                                                <option value="at_booking">Au moment de la prise de RDV</option>
                                                                <option value="before_event">X temps avant l'appel</option>
                                                                <option value="at_event">À l'heure exacte de l'appel</option>
                                                            </select>
                                                            <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={18} />
                                                        </div>
                                                    </div>

                                                    {reminder.type === 'before_event' && (
                                                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Valeur</label>
                                                                <input 
                                                                    type="number"
                                                                    value={reminder.value}
                                                                    onChange={(e) => updateReminder(reminder.id, { value: parseInt(e.target.value) })}
                                                                    className="w-full px-6 py-4 bg-black border border-white/10 rounded-2xl text-white font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Unité</label>
                                                                <div className="relative">
                                                                    <select 
                                                                        value={reminder.unit}
                                                                        onChange={(e) => updateReminder(reminder.id, { unit: e.target.value as any })}
                                                                        className="w-full appearance-none px-6 py-4 bg-black border border-white/10 rounded-2xl text-white font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                                                    >
                                                                        <option value="minutes">Minutes</option>
                                                                        <option value="hours">Heures</option>
                                                                    </select>
                                                                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={18} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Template Editor */}
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                                            <Code size={14} />
                                                            Contenu HTML du Mail
                                                        </label>
                                                        <div className="group relative">
                                                            <Info size={14} className="text-blue-500 cursor-help" />
                                                            <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-blue-900 border border-blue-500 rounded-xl text-[10px] text-blue-100 hidden group-hover:block z-10 shadow-2xl">
                                                                Variables: {"{{name}}"}, {"{{time}}"}, {"{{meet_link}}"}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <textarea 
                                                        value={reminder.html_template}
                                                        onChange={(e) => updateReminder(reminder.id, { html_template: e.target.value })}
                                                        placeholder="Collez votre HTML ici..."
                                                        className="w-full h-48 px-6 py-4 bg-black border border-white/10 rounded-2xl text-xs font-mono text-blue-100/60 focus:ring-2 focus:ring-blue-500 outline-none resize-none leading-relaxed"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {reminders.length === 0 && (
                                        <div className="px-10 py-20 bg-white/5 border border-dashed border-white/10 rounded-[32px] text-center">
                                            <Bell className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                                            <p className="text-gray-500 font-medium italic">Aucun rappel configuré. Ajoutez votre premier automate !</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-8 border-t border-white/5 bg-white/[0.02] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {message && (
                                    <div className={`px-6 py-3 rounded-full font-bold text-sm animate-in fade-in slide-in-from-left-2 ${message.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                        {message.text}
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setShowConfig(false)}
                                    className="px-8 py-4 text-gray-400 font-bold hover:text-white transition-all"
                                >
                                    Fermer
                                </button>
                                <button
                                    onClick={handleSaveConfig}
                                    disabled={saving}
                                    className="px-12 py-4 bg-blue-600 text-white rounded-3xl font-black hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-blue-600/30 disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />}
                                    {saving ? 'Synchronisation...' : 'Tout Sauvegarder'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
