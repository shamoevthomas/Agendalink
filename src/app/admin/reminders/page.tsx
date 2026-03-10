'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Calendar, Mail, Settings, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';

export default function RemindersPage() {
    const [settings, setSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('al_admin_settings')
            .select('*')
            .single();

        if (data) setSettings(data);
        setLoading(false);
    };

    const handleSave = async () => {
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
            setMessage({ type: 'success', text: 'Settings saved successfully!' });
            setTimeout(() => setMessage(null), 3000);
        }
        setSaving(false);
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="max-w-4xl mx-auto p-8">
            <Link href="/admin/dashboard" className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors mb-6 font-medium">
                <ArrowLeft className="w-4 h-4" />
                Retour au Dashboard
            </Link>
            
            <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <Settings className="w-8 h-8 text-blue-600" />
                Configuration des Rappels Google Meet
            </h1>

            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                <div className="space-y-8">
                    {/* Google OAuth Status */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-4">
                            <Calendar className="w-6 h-6 text-gray-600" />
                            <div>
                                <p className="font-semibold">Connexion Google Agenda</p>
                                <p className="text-sm text-gray-500">{settings?.email || 'Non connecté'}</p>
                            </div>
                        </div>
                        {settings?.google_refresh_token ? (
                            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Connecté
                            </span>
                        ) : (
                            <button 
                                onClick={() => window.location.href = '/api/auth/google'}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
                            >
                                Connecter Google
                            </button>
                        )}
                    </div>

                    {/* Enable/Disable Reminders */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold">Activer les rappels automatiques</p>
                            <p className="text-sm text-gray-500">Envoyer des emails de rappel aux participants avant la réunion.</p>
                        </div>
                        <button
                            onClick={() => setSettings({ ...settings, reminders_enabled: !settings.reminders_enabled })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings?.reminders_enabled ? 'bg-blue-600' : 'bg-gray-200'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings?.reminders_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    {/* Reminder Timing */}
                    <div>
                        <label className="block font-semibold mb-2">Délai du rappel (minutes avant l'appel)</label>
                        <div className="flex items-center gap-4">
                            <input
                                type="number"
                                value={settings?.reminder_minutes_before || 15}
                                onChange={(e) => setSettings({ ...settings, reminder_minutes_before: parseInt(e.target.value) })}
                                className="w-24 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <span className="text-gray-500">minutes</span>
                        </div>
                    </div>

                    {/* Info Box */}
                    <div className="p-4 bg-blue-50 rounded-xl flex gap-3 text-blue-800">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p className="text-sm">
                            Les rappels seront envoyés via <strong>Brevo (support@closeos.fr)</strong> pour tous les appels Google Meet détectés dans votre agenda avec au moins un invité.
                        </p>
                    </div>

                    {/* Email Preview Info */}
                    <div className="border-t pt-8">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                            <Mail className="w-5 h-5 text-gray-600" />
                            Aperçu de l'Email Envoyé
                        </h3>
                        <div className="bg-gray-50 p-6 rounded-xl border border-dashed border-gray-300">
                            <p className="text-xs text-uppercase text-gray-400 mb-2 font-bold tracking-wider">MODÈLE HTML</p>
                            <div className="text-sm space-y-2 text-gray-600 italic">
                                &lt;div style="..."&gt;<br/>
                                &nbsp;&nbsp;&lt;h2&gt;Rappel : Nom de la réunion&lt;/h2&gt;<br/>
                                &nbsp;&nbsp;&lt;p&gt;Bonjour [Nom],&lt;/p&gt;<br/>
                                &nbsp;&nbsp;&lt;p&gt;Lien Meet : [Google Meet Link]&lt;/p&gt;<br/>
                                &nbsp;&nbsp;...<br/>
                                &lt;/div&gt;
                            </div>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="pt-4 flex items-center gap-4">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50"
                        >
                            {saving ? 'Enregistrement...' : 'Enregistrer la configuration'}
                        </button>
                        {message && (
                            <span className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'} font-medium`}>
                                {message.text}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
