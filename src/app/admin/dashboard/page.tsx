'use client';

import { useState, useEffect, useRef } from 'react';
import { Camera, Upload, Send, Loader2, User, Clock, Settings, LogOut, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ImageCropper from './ImageCropper';

export default function DashboardConfigPage() {
    const [formLoading, setFormLoading] = useState(false);
    const [initialProfile, setInitialProfile] = useState<any>(null);

    const searchParams = useSearchParams();
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    // Profile State
    const [profile, setProfile] = useState<any>({
        first_name: '',
        last_name: '',
        email: '',
        bio: '',
        profile_image: '',
        social_links: [] as any[],
        google_refresh_token: null,
        password: ''
    });
    const [confirmPassword, setConfirmPassword] = useState('');

    const [showBanner, setShowBanner] = useState(true);

    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    // Also sync on mount if email is available
    useEffect(() => {
        if (profile.google_refresh_token && profile.email) {
            syncMeetings(profile.email);
        }
    }, [profile.google_refresh_token, profile.email]);

    const syncMeetings = async (email: string) => {
        try {
            await fetch(`/api/cron/reminders/sync?email=${email}`);
        } catch (err) {
            console.error('Sync error:', err);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/admin/settings');
            if (res.ok) {
                const data = await res.json();
                const profileData = { ...data, password: '' };
                setProfile(profileData);
                setInitialProfile(profileData);
            }
        } catch (err) {
            console.error('Fetch settings error:', err);
        }
    };

    const handleUpdateSettings = async (e: React.FormEvent) => {
        e.preventDefault();

        if (profile.password && profile.password !== confirmPassword) {
            alert('Les mots de passe ne correspondent pas');
            return;
        }

        setFormLoading(true);
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profile),
            });
            if (res.ok) {
                const updatedData = await res.json();
                const profileData = { ...updatedData, password: '' };
                setProfile(profileData);
                setInitialProfile(profileData);
                setConfirmPassword('');
                alert('Paramètres enregistrés !');
            }
        } catch (err) {
            alert('Erreur lors de la sauvegarde');
        } finally {
            setFormLoading(false);
        }
    };

    const disconnectGoogle = async () => {
        if (!confirm('Voulez-vous vraiment déconnecter votre compte Google ?')) return;
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ disconnect_google: true }),
            });
            if (res.ok) {
                setProfile((prev: any) => ({ ...prev, google_refresh_token: null }));
                setInitialProfile((prev: any) => ({ ...prev, google_refresh_token: null }));
                alert('Compte Google déconnecté');
            }
        } catch (err) {
            alert('Erreur lors de la déconnexion');
        }
    };

    const addSocialLink = (platform: string) => {
        let url = '';
        if (platform === 'WhatsApp') url = 'https://wa.me/';
        setProfile((prev: any) => ({
            ...prev,
            social_links: [...(prev.social_links || []), { platform, url, title: platform }]
        }));
    };

    const updateSocialLink = (index: number, field: string, value: string) => {
        const newLinks = [...(profile.social_links || [])];
        newLinks[index] = { ...newLinks[index], [field]: value };
        setProfile((prev: any) => ({ ...prev, social_links: newLinks }));
    };

    const removeSocialLink = (index: number) => {
        setProfile((prev: any) => ({
            ...prev,
            social_links: prev.social_links.filter((_: any, i: number) => i !== index)
        }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setImageToCrop(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCropComplete = async (croppedBlob: Blob) => {
        setUploading(true);
        setImageToCrop(null);
        try {
            const fileName = `profile_${Date.now()}.jpg`;
            const { error: uploadError } = await supabase.storage
                .from('profile-images')
                .upload(fileName, croppedBlob, {
                    contentType: 'image/jpeg',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage
                .from('profile-images')
                .getPublicUrl(fileName);

            setProfile((prev: any) => ({ ...prev, profile_image: publicUrlData.publicUrl }));
        } catch (err: any) {
            alert(`Erreur lors de l'upload : ${err.message}`);
        } finally {
            setUploading(false);
        }
    };

    const hasChanges = JSON.stringify(profile) !== JSON.stringify(initialProfile) || confirmPassword !== '';

    return (
        <div className="space-y-10 animate-in fade-in duration-500 pb-20">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <Settings className="text-blue-500" size={28} />
                    Configuration & Profil
                </h1>
                <p className="text-gray-500 text-sm mt-1">Personnalisez votre identité et vos paramètres de sécurité</p>
            </div>

            {/* Notifications */}
            {showBanner && success === 'google_connected' && (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-between gap-3 text-green-500">
                    <div className="flex items-center gap-3">
                        <CheckCircle2 size={20} />
                        <p className="font-medium">Google Agenda connecté avec succès !</p>
                    </div>
                    <button onClick={() => setShowBanner(false)} className="p-1 hover:bg-green-500/10 rounded-lg transition-colors">
                        <X size={18} />
                    </button>
                </div>
            )}
            {showBanner && error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between gap-3 text-red-500">
                    <div className="flex items-center gap-3">
                        <AlertCircle size={20} />
                        <p className="font-medium">Erreur : {error}</p>
                    </div>
                    <button onClick={() => setShowBanner(false)} className="p-1 hover:bg-red-500/10 rounded-lg transition-colors">
                        <X size={18} />
                    </button>
                </div>
            )}

            <form onSubmit={handleUpdateSettings} className="space-y-8">
                {/* Profil Section */}
                <div id="profile" className="bg-[#111] border border-white/10 rounded-3xl p-6 md:p-8 space-y-6">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <User size={20} className="text-blue-500" />
                        Mon Profil Public
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Prénom</label>
                            <input
                                type="text"
                                value={profile.first_name || ''}
                                onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                                className="w-full px-4 py-3 bg-black border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Jean"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Nom</label>
                            <input
                                type="text"
                                value={profile.last_name || ''}
                                onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                                className="w-full px-4 py-3 bg-black border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Dupont"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Bio / Description (sous le nom)</label>
                        <textarea
                            value={profile.bio || ''}
                            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                            className="w-full px-4 py-3 bg-black border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none text-sm"
                            placeholder="Expert en closing et stratégie de vente..."
                        />
                    </div>

                    <div className="space-y-4">
                        <label className="text-sm font-medium text-gray-400">Photo de Profil</label>
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                            <div className="relative group">
                                <div className="w-24 h-24 bg-white/5 rounded-full border-2 border-white/10 overflow-hidden flex items-center justify-center relative">
                                    {profile.profile_image ? (
                                        <img src={profile.profile_image} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={32} className="text-gray-600" />
                                    )}
                                    {uploading && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                            <Loader2 className="text-white animate-spin" size={24} />
                                        </div>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition-all border-2 border-black"
                                >
                                    <Camera size={14} />
                                </button>
                            </div>
                            <div className="flex-1 space-y-2">
                                <input
                                    type="text"
                                    value={profile.profile_image || ''}
                                    onChange={(e) => setProfile({ ...profile, profile_image: e.target.value })}
                                    className="w-full px-4 py-2 bg-black border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    placeholder="URL de l'image ou importez-en une..."
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-2"
                                >
                                    <Upload size={12} />
                                    Importer depuis mon PC
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept="image/*"
                                    className="hidden"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Social Links Section */}
                <div className="bg-[#111] border border-white/10 rounded-3xl p-6 md:p-8 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                            Réseaux Sociaux
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {['LinkedIn', 'Instagram', 'WhatsApp'].map(p => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => addSocialLink(p)}
                                    className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-bold hover:bg-white/10 transition-all"
                                >
                                    + {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        {(profile.social_links || []).map((link: any, idx: number) => (
                            <div key={idx} className="flex flex-col md:flex-row gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl relative group">
                                <button
                                    type="button"
                                    onClick={() => removeSocialLink(idx)}
                                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X size={14} />
                                </button>
                                <div className="md:w-1/4">
                                    <input
                                        type="text"
                                        value={link.title}
                                        onChange={(e) => updateSocialLink(idx, 'title', e.target.value)}
                                        className="w-full px-3 py-2 bg-black border border-white/10 rounded-lg text-sm text-white"
                                        placeholder="Titre (ex: LinkedIn)"
                                    />
                                </div>
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        value={link.url}
                                        onChange={(e) => updateSocialLink(idx, 'url', e.target.value)}
                                        className="w-full px-3 py-2 bg-black border border-white/10 rounded-lg text-sm text-white"
                                        placeholder="URL ou lien wa.me/"
                                    />
                                </div>
                            </div>
                        ))}
                        {(!profile.social_links || profile.social_links.length === 0) && (
                            <p className="text-gray-600 text-sm italic py-4">Aucun lien social ajouté.</p>
                        )}
                    </div>
                </div>

                {/* Password Section */}
                <div className="bg-[#111] border border-white/10 rounded-3xl p-6 md:p-8 space-y-6">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <Clock size={20} className="text-blue-500" />
                        Sécurité
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Nouveau mot de passe</label>
                            <input
                                type="password"
                                value={profile.password || ''}
                                onChange={(e) => setProfile({ ...profile, password: e.target.value })}
                                className="w-full px-4 py-3 bg-black border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="••••••"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Confirmer le mot de passe</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-black border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="••••••"
                            />
                        </div>
                    </div>
                </div>

                {/* Google Integrations */}
                <div className="bg-[#111] border border-white/10 rounded-3xl p-6 md:p-8 space-y-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 shrink-0">
                                <Settings className={`${profile.google_refresh_token ? 'text-blue-500' : 'text-gray-500'}`} size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">Google Calendar</h3>
                                <p className="text-gray-500 text-sm font-medium">
                                    Status: {profile.google_refresh_token ? 'Connecté ✅' : 'Non connecté ❌'}
                                </p>
                            </div>
                        </div>

                        {profile.google_refresh_token ? (
                            <button
                                type="button"
                                onClick={disconnectGoogle}
                                className="px-6 py-3 bg-red-500/10 border border-red-500/20 text-red-500 font-bold rounded-xl hover:bg-red-500/20 transition-all text-sm"
                            >
                                Déconnecter mon Google
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => { window.location.href = '/api/auth/google'; }}
                                className="px-8 py-4 bg-white text-black font-bold rounded-2xl hover:scale-[1.02] transition-all"
                            >
                                Connecter mon Google Agenda
                            </button>
                        )}
                    </div>

                    <div className="pt-8 border-t border-white/10">
                        <button
                            type="button"
                            onClick={() => { window.location.href = '/admin'; }}
                            className="w-full md:w-auto flex items-center justify-center gap-3 px-6 py-3 rounded-xl text-red-500 hover:bg-red-500/10 transition-all font-bold"
                        >
                            <LogOut size={20} />
                            Déconnexion
                        </button>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={!hasChanges || formLoading}
                        className={`flex items-center justify-center gap-3 px-10 py-4 rounded-2xl font-bold transition-all shadow-xl ${hasChanges
                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/20'
                            : 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'
                            }`}
                    >
                        {formLoading ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                        Enregistrer les modifications
                    </button>
                </div>
            </form>

            {imageToCrop && (
                <ImageCropper
                    image={imageToCrop}
                    onCropComplete={handleCropComplete}
                    onCancel={() => setImageToCrop(null)}
                />
            )}
        </div>
    );
}
