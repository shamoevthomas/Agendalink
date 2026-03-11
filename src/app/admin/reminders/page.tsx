'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { 
    Calendar, Mail, Settings, CheckCircle2, AlertCircle, 
    ArrowLeft, Video, Send, Loader2, Bell, Clock, 
    ExternalLink, CheckCircle, Plus, Trash2, ChevronDown, 
    Code, Info, MoreVertical
} from 'lucide-react';

type ReminderType = 'at_booking' | 'before_event' | 'at_event';

interface ReminderConfig {
    id: string;
    type: ReminderType;
    value?: number;
    unit?: 'minutes' | 'hours';
    html_template: string;
    subject?: string;
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
    const [manualTemplate, setManualTemplate] = useState(DEFAULT_TEMPLATE);
    const [manualSubject, setManualSubject] = useState('');
    const [previewContent, setPreviewContent] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
    
    // Editor State
    const [activeReminderId, setActiveReminderId] = useState<string | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    
    // Test Email State
    const [showTestMenu, setShowTestMenu] = useState(false);
    const [testEmail, setTestEmail] = useState('');
    const [sendingTest, setSendingTest] = useState(false);

    useEffect(() => {
        fetchSettingsAndMeetings();
        
        // Auto-refresh every 30 seconds
        const interval = setInterval(() => {
            if (settings?.email) {
                fetchUpcomingMeetings(settings.email);
            }
        }, 30000);
        
        return () => clearInterval(interval);
    }, [settings?.email]);

    const fetchSettingsAndMeetings = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('al_admin_settings')
            .select('*')
            .single();

        if (data) {
            setSettings(data);
            setReminders(data.reminders_config || []);
            setManualTemplate(data.manual_reminder_template || DEFAULT_TEMPLATE);
            setManualSubject(data.manual_reminder_subject || 'Rappel de votre réunion avec {{host_name}}');
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
                // Trigger immediate reminder check for this user
                await fetch(`/api/cron/reminders?user_email=${email}`, {
                    headers: {
                        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET}`
                    }
                });
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
                manual_reminder_template: manualTemplate,
                manual_reminder_subject: manualSubject,
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
            subject: 'Rappel pour votre appel avec {{host_name}}',
        };
        setReminders([...reminders, newReminder]);
        setActiveReminderId(newReminder.id);
        setIsEditorOpen(true);
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

    const renderPreview = (content: string) => {
        const previewVars = {
            name: "Jean Dupont",
            host_name: `${settings.first_name || ''} ${settings.last_name || ''}`.trim() || 'Thomas Shamoev',
            host_bio: settings.bio || 'Closer & Dev | CEO de CloseOS',
            profile_img: settings.profile_image || 'https://via.placeholder.com/150',
            time: "14:30",
            meet_link: "https://meet.google.com/abc-defg-hij",
            social_links: `
                <table cellpadding="0" cellspacing="0" border="0" style="margin-top: 10px;">
                    <tr>
                        <td style="padding-right: 10px;">
                            <a href="#" style="display: inline-block; padding: 6px 12px; background-color: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; color: #475569; text-decoration: none; font-size: 11px; font-weight: bold;">LINKEDIN</a>
                        </td>
                        <td style="padding-right: 10px;">
                            <a href="#" style="display: inline-block; padding: 6px 12px; background-color: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; color: #475569; text-decoration: none; font-size: 11px; font-weight: bold;">WHATSAPP</a>
                        </td>
                    </tr>
                </table>
            `
        };
        const finalHtml = content
            .replace(/{{name}}/g, previewVars.name)
            .replace(/{{host_name}}/g, previewVars.host_name)
            .replace(/{{host_bio}}/g, previewVars.host_bio)
            .replace(/{{profile_img}}/g, previewVars.profile_img)
            .replace(/{{social_links}}/g, previewVars.social_links)
            .replace(/{{time}}/g, previewVars.time)
            .replace(/{{meet_link}}/g, previewVars.meet_link);
        
        setPreviewContent(finalHtml);
    };

// This entire section (lines 209-229) is moved down, conditional rendering is added

// List view rendering logic has moved further down in RemindersPage.

    const activeReminder = reminders.find(r => r.id === activeReminderId);

    const renderEditorView = () => (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center">
            {/* Split Screen Container */}
            <div className="flex flex-col lg:flex-row w-full max-w-[1400px] h-screen bg-[#050505]">
                
                {/* LEFT PANEL: CONFIGURATION */}
                <div className="w-full lg:w-[45%] lg:min-w-[500px] lg:border-r border-[#1a1a1a] h-full flex flex-col overflow-y-auto">
                    {/* Header Controls */}
                    <div className="p-6 md:p-8 flex items-center justify-between border-b border-[#1a1a1a] sticky top-0 bg-[#050505]/90 backdrop-blur-md z-10">
                        <button 
                            onClick={() => {
                                setIsEditorOpen(false);
                                setActiveReminderId(null);
                            }}
                            className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm font-medium group"
                        >
                            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                            Retour
                        </button>

                        <div className="flex items-center gap-4">
                            {message && (
                                <span className={`text-xs font-bold px-3 py-1.5 rounded-md ${message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                    {message.text}
                                </span>
                            )}
                            <button
                                onClick={handleSaveConfig}
                                disabled={saving}
                                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50"
                            >
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Settings size={16} />}
                                Sauvegarder
                            </button>
                        </div>
                    </div>

                    <div className="p-6 md:p-8 space-y-12">
                        {/* Variables Bubble */}
                        <div className="bg-blue-600/10 border border-blue-500/20 rounded-[24px] p-6 space-y-4">
                            <h3 className="text-blue-500 font-black flex items-center gap-2 text-sm uppercase tracking-widest">
                                <Code size={16} /> Variables Disponibles
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {['{{name}}', '{{time}}', '{{meet_link}}', '{{host_name}}', '{{host_bio}}', '{{profile_img}}', '{{social_links}}'].map(v => (
                                    <span key={v} className="px-2.5 py-1 bg-black border border-blue-500/30 text-blue-400 text-xs font-mono rounded cursor-pointer hover:bg-blue-500/10 transition-colors" title="Copier" onClick={() => navigator.clipboard.writeText(v)}>
                                        {v}
                                    </span>
                                ))}
                            </div>
                            <p className="text-[11px] text-blue-400/60 leading-relaxed">
                                Cliquez sur une variable pour la copier. Elles seront automatiquement remplacées par les vraies données lors de l'envoi.
                            </p>
                        </div>

                        {activeReminder && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Trigger Logic */}
                                <div className="space-y-4">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block">Type de déclencheur</label>
                                    <div className="relative">
                                        <select 
                                            value={activeReminder.type}
                                            onChange={(e) => updateReminder(activeReminder.id, { type: e.target.value as ReminderType })}
                                            className="w-full appearance-none px-5 py-4 bg-[#0f0f0f] border border-[#222] rounded-2xl text-white font-medium hover:border-[#444] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all cursor-pointer"
                                        >
                                            <option value="at_booking">Au moment de la réservation</option>
                                            <option value="before_event">Délai avant l'appel</option>
                                            <option value="at_event">À l'heure exacte de l'appel</option>
                                        </select>
                                        <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={18} />
                                    </div>
                                </div>

                                {/* conditional Timing Logic */}
                                {activeReminder.type === 'before_event' && (
                                    <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in-95 duration-300">
                                        <div className="space-y-4">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block">Valeur</label>
                                            <input 
                                                type="number"
                                                value={activeReminder.value}
                                                onChange={(e) => updateReminder(activeReminder.id, { value: parseInt(e.target.value) })}
                                                className="w-full px-5 py-4 bg-[#0f0f0f] border border-[#222] rounded-2xl text-white font-medium hover:border-[#444] focus:border-blue-500 outline-none transition-all"
                                            />
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block">Unité</label>
                                            <div className="relative">
                                                <select 
                                                    value={activeReminder.unit}
                                                    onChange={(e) => updateReminder(activeReminder.id, { unit: e.target.value as 'minutes'|'hours' })}
                                                    className="w-full appearance-none px-5 py-4 bg-[#0f0f0f] border border-[#222] rounded-2xl text-white font-medium hover:border-[#444] focus:border-blue-500 outline-none transition-all cursor-pointer"
                                                >
                                                    <option value="minutes">Minutes</option>
                                                    <option value="hours">Heures</option>
                                                </select>
                                                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={18} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Email Subject */}
                                <div className="space-y-4">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block">Objet du Mail</label>
                                    <input 
                                        type="text"
                                        value={activeReminder.subject || ''}
                                        onChange={(e) => updateReminder(activeReminder.id, { subject: e.target.value })}
                                        placeholder="Rappel : Rendez-vous avec {{host_name}}"
                                        className="w-full px-5 py-4 bg-[#0f0f0f] border border-[#222] rounded-2xl text-white font-medium hover:border-[#444] focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>

                                {/* HTML Content Input */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block">Contenu HTML</label>
                                        
                                        <div className="relative">
                                            <button 
                                                onClick={() => setShowTestMenu(!showTestMenu)}
                                                className="text-xs font-bold text-blue-500 hover:text-blue-400 uppercase tracking-widest flex items-center gap-1.5"
                                            >
                                                <Send size={12} /> Test Mail
                                            </button>
                                            
                                            {showTestMenu && (
                                                <div className="absolute right-0 bottom-full mb-2 w-64 bg-[#111] border border-[#333] rounded-2xl p-4 shadow-2xl z-20 animate-in fade-in zoom-in-95">
                                                    <label className="text-[10px] uppercase font-bold text-gray-500 block mb-2">Envoyer vers :</label>
                                                    <div className="flex gap-2">
                                                        <input 
                                                            type="email"
                                                            value={testEmail}
                                                            onChange={(e) => setTestEmail(e.target.value)}
                                                            placeholder="ton@email.com"
                                                            className="flex-1 bg-black border border-[#333] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500 outline-none"
                                                        />
                                                        <button 
                                                            onClick={async () => {
                                                                if(!testEmail) return;
                                                                setSendingTest(true);
                                                                try {
                                                                    // Mock test endpoint call
                                                                    await new Promise(r => setTimeout(r, 1000));
                                                                    alert('Test envoyé ! (Mock)');
                                                                } finally {
                                                                    setSendingTest(false);
                                                                    setShowTestMenu(false);
                                                                }
                                                            }}
                                                            disabled={!testEmail || sendingTest}
                                                            className="p-2 bg-blue-600 rounded-lg disabled:opacity-50"
                                                        >
                                                            {sendingTest ? <Loader2 size={14} className="animate-spin text-white" /> : <Send size={14} className="text-white" />}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <textarea 
                                        value={activeReminder.html_template}
                                        onChange={(e) => {
                                            updateReminder(activeReminder.id, { html_template: e.target.value });
                                            renderPreview(e.target.value);
                                        }}
                                        spellCheck={false}
                                        className="w-full h-[400px] px-5 py-4 bg-[#0a0a0a] border border-[#222] rounded-2xl text-[13px] font-mono text-gray-300 focus:border-blue-500 outline-none transition-all resize-y leading-relaxed"
                                    />
                                </div>
                            </div>
                        )}
                        
                        {!activeReminder && (
                            <div className="h-64 flex flex-col items-center justify-center text-gray-500 border border-dashed border-[#222] rounded-[24px]">
                                <AlertCircle size={32} className="mb-4 text-gray-600" />
                                <p>Sélectionnez un rappel pour le configurer</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT PANEL: LIVE PREVIEW */}
                <div className="hidden lg:flex flex-1 flex-col bg-[#000000]">
                    <div className="p-6 md:p-8 flex items-center justify-between border-b border-[#1a1a1a]">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                           <Info size={20} className="text-gray-500" /> Aperçu en direct
                        </h2>
                        
                        <div className="flex bg-[#111] p-1 rounded-xl border border-[#222]">
                            <button 
                                onClick={() => setViewMode('mobile')}
                                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${viewMode === 'mobile' ? 'bg-white text-black shadow-md' : 'text-gray-500 hover:text-white'}`}
                            >
                                Mobile
                            </button>
                            <button 
                                onClick={() => setViewMode('desktop')}
                                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${viewMode === 'desktop' ? 'bg-white text-black shadow-md' : 'text-gray-500 hover:text-white'}`}
                            >
                                PC
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-auto p-10 flex justify-center items-start bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-5">
                       <div 
                           className={`bg-white rounded-3xl overflow-hidden shadow-2xl origin-top transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${viewMode === 'mobile' ? 'w-[375px]' : 'w-full max-w-[800px]'}`}
                           style={{ minHeight: '600px', border: '8px solid #1a1a1a' }}
                       >
                           {/* Decorative fake browser bar for PC view */}
                           {viewMode === 'desktop' && (
                               <div className="h-10 bg-[#f1f5f9] border-b border-[#e2e8f0] flex items-center px-4 gap-2">
                                   <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                   <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                   <div className="w-3 h-3 rounded-full bg-green-400"></div>
                               </div>
                           )}
                           
                           <div className="w-full h-full bg-[#f9fafb]">
                               {previewContent ? (
                                   <div dangerouslySetInnerHTML={{ __html: previewContent }} />
                               ) : (
                                   <div className="text-gray-400 flex flex-col items-center justify-center p-20 text-sm font-medium">
                                       Commencez à taper du HTML pour voir l'aperçu.
                                   </div>
                               )}
                           </div>
                       </div>
                    </div>
                </div>

            </div>
    if (loading) return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
    );

    return isEditorOpen ? renderEditorView() : (
        <div className="min-h-screen bg-[#050505] text-white p-6 md:p-10">
            <div className="max-w-5xl mx-auto space-y-10">
                {/* Header Section */}
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Bell className="text-blue-500 w-6 h-6" /> {/* Using Bell here, you might need to import it if not already */}
                        Prochains Rappels Meet
                    </h1>
                    
                    <div className="flex items-center gap-4">
                        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider ${settings?.reminders_enabled ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-white/5 text-gray-500 border border-white/10'}`}>
                            {settings?.reminders_enabled ? <div className="w-2 h-2 rounded-full bg-green-500 mr-1" /> : <div className="w-2 h-2 rounded-full bg-gray-500 mr-1" />}
                            {settings?.reminders_enabled ? `Automatisation active (${reminders.length})` : 'Automatisation désactivée'}
                        </div>
                    </div>
                </div>

                {/* Removed Navigation Tabs - wait, it's not in the screenshot! */}



                {/* Automations List (Bulles) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {reminders.map((reminder) => (
                        <div key={reminder.id} className="bg-[#0f0f0f] border-none rounded-[16px] p-6 flex flex-col justify-between transition-all group min-h-[220px]">
                            <div>
                                <div className="flex items-start justify-between mb-6">
                                    <div className="w-10 h-10 bg-[#1f1f1f] rounded-xl flex items-center justify-center text-gray-400">
                                        {reminder.type === 'at_event' ? <Video size={18} /> : <Calendar size={18} />}
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            // TODO: implement individual toggle if needed
                                        }}
                                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors bg-blue-600`}
                                    >
                                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform translate-x-[18px]`} />
                                    </button>
                                </div>
                                
                                <div className="mb-6">
                                    <h3 className="font-bold text-white text-[15px] mb-2">
                                        {reminder.type === 'at_booking' ? 'À la réservation' : 
                                         reminder.type === 'at_event' ? "Au moment de l'appel" : 
                                         `${reminder.value} ${reminder.unit === 'minutes' ? 'Minutes' : 'Heures'} avant`}
                                    </h3>
                                    <p className="text-[13px] text-gray-400 leading-relaxed font-medium">
                                        {reminder.type === 'at_booking' ? "Votre entretien avec {{host_name}} a été confirmé avec succès." :
                                         reminder.type === 'at_event' ? "Votre entretien avec {{host_name}} a commencé" :
                                         `Votre entretien avec {{host_name}} est prévu dans {{time}}.`}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="pt-2">
                                <button 
                                    onClick={() => {
                                        setActiveReminderId(reminder.id);
                                        setIsEditorOpen(true);
                                    }}
                                    className="text-blue-500 text-[11px] font-bold hover:text-blue-400 transition-colors uppercase tracking-widest"
                                >
                                    Configurer
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* Add Reminder Card */}
                    <button 
                        onClick={addReminder}
                        className="bg-black border border-dashed border-[#222] rounded-[16px] p-6 flex flex-col items-center justify-center hover:border-[#444] transition-all hover:bg-white/[0.02] min-h-[220px]"
                    >
                        <Plus className="w-6 h-6 text-gray-500 mb-3" />
                        <span className="text-gray-500 text-[11px] font-bold uppercase tracking-widest text-center">Ajouter un rappel</span>
                    </button>
                </div>
                </div>
            </div>
        </div>
    );
}
