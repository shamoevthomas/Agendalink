'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { Plus, Copy, ExternalLink, Calendar, Clock, Video, CheckCircle2, AlertCircle, Trash2, LogOut, Settings, User, X, Loader2, Send, Camera, Upload, BarChart2, Phone } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import ImageCropper from './ImageCropper';
import { supabase } from '@/lib/supabase';

function DashboardContent() {
    const [activeTab, setActiveTab] = useState<'meetings' | 'config'>('meetings');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [meetings, setMeetings] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [formLoading, setFormLoading] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [description, setDescription] = useState('');
    const [isGoogleMeet, setIsGoogleMeet] = useState(true);
    const [requestPhone, setRequestPhone] = useState(false);
    const [duration, setDuration] = useState(60);
    const [customSlug, setCustomSlug] = useState('');
    const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
    const [initialProfile, setInitialProfile] = useState<any>(null);

    const searchParams = useSearchParams();
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    // Profile State
    const [profile, setProfile] = useState({
        first_name: '',
        last_name: '',
        bio: '',
        profile_image: '',
        social_links: [] as any[],
        google_refresh_token: null,
        password: ''
    });
    const [confirmPassword, setConfirmPassword] = useState('');

    const [showBanner, setShowBanner] = useState(true);
    const [analyticsMeeting, setAnalyticsMeeting] = useState<any>(null);
    const [analyticsData, setAnalyticsData] = useState<{ views: number, joins: any[] } | null>(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);

    useEffect(() => {
        fetchMeetings();
        fetchSettings();
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
        setLoading(true);
        try {
            const res = await fetch('/api/meetings');
            if (res.ok) {
                const data = await res.json();
                setMeetings(data);
            } else {
                const errorData = await res.json();
                console.error('Fetch error:', errorData);
                alert('Failed to fetch meetings: ' + (errorData.message || JSON.stringify(errorData)));
            }
        } catch (err) {
            console.error('Fetch error:', err);
            alert('An unexpected error occurred while fetching meetings.');
        } finally {
            setLoading(false);
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

    const handleDeleteMeeting = async (id: string) => {
        if (!confirm('Voulez-vous vraiment supprimer ce rendez-vous ?')) return;
        try {
            const res = await fetch(`/api/meetings?id=${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setMeetings(meetings.filter(m => m.id !== id));
            } else {
                alert('Erreur lors de la suppression');
            }
        } catch (err) {
            alert('Erreur lors de la suppression');
        }
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

    const addSocialLink = (platform: string) => {
        let url = '';
        if (platform === 'WhatsApp') url = 'https://wa.me/';
        setProfile((prev: any) => ({
            ...prev,
            social_links: [...prev.social_links, { platform, url, title: platform }]
        }));
    };

    const updateSocialLink = (index: number, field: string, value: string) => {
        const newLinks = [...profile.social_links];
        newLinks[index] = { ...newLinks[index], [field]: value };
        setProfile(prev => ({ ...prev, social_links: newLinks }));
    };

    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const removeSocialLink = (index: number) => {
        setProfile(prev => ({
            ...prev,
            social_links: prev.social_links.filter((_, i) => i !== index)
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
            const { data, error } = await supabase.storage
                .from('profile-images')
                .upload(fileName, croppedBlob, {
                    contentType: 'image/jpeg',
                    upsert: true
                });

            if (error) throw error;

            const { data: publicUrlData } = supabase.storage
                .from('profile-images')
                .getPublicUrl(fileName);

            setProfile(prev => ({ ...prev, profile_image: publicUrlData.publicUrl }));
        } catch (err: any) {
            alert('Erreur lors de l\'upload : ' + err.message);
        } finally {
            setUploading(false);
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

    const connectGoogle = () => {
        window.location.href = '/api/auth/google';
    };

    const hasChanges = JSON.stringify(profile) !== JSON.stringify(initialProfile) || confirmPassword !== '';

    return (
        <div className="max-w-5xl mx-auto">
            {/* Notifications */}
            {showBanner && success === 'google_connected' && (
                <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-between gap-3 text-green-500 animate-in fade-in duration-500">
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
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between gap-3 text-red-500">
                    <div className="flex items-center gap-3">
                        <AlertCircle size={20} />
                        <p className="font-medium">Erreur : {error}</p>
                    </div>
                    <button onClick={() => setShowBanner(false)} className="p-1 hover:bg-red-500/10 rounded-lg transition-colors">
                        <X size={18} />
                    </button>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-4 mb-8 p-1 bg-white/5 w-fit rounded-xl border border-white/10">
                <button
                    onClick={() => setActiveTab('meetings')}
                    className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'meetings' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'
                        }`}
                >
                    Rendez-vous
                </button>
                <button
                    onClick={() => setActiveTab('config')}
                    className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'config' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'
                        }`}
                >
                    Configuration
                </button>
            </div>

            {activeTab === 'meetings' ? (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                        <div>
                            <h3 className="text-2xl font-bold">Mes Rendez-vous</h3>
                            <p className="text-gray-500 text-sm">Gérez vos invitations et votre synchronisation</p>
                        </div>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                        >
                            <Plus size={20} />
                            Nouveau Lien
                        </button>
                    </div>

                    {loading ? (
                        <div className="p-20 text-center text-gray-500">Chargement...</div>
                    ) : meetings.length === 0 ? (
                        <div className="bg-[#111] border border-white/10 rounded-2xl p-12 text-center">
                            <Calendar className="mx-auto mb-4 text-gray-700" size={48} />
                            <p className="text-gray-500 font-medium text-lg">Aucun rendez-vous pour le moment.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {meetings.map((meeting) => (
                                <div key={meeting.id} className="bg-[#111] border border-white/10 rounded-2xl p-5 md:p-6 hover:border-white/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h4 className="text-xl font-bold text-white">{meeting.title}</h4>
                                            {meeting.google_event_id && (
                                                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 text-[10px] font-bold uppercase tracking-wider rounded border border-blue-500/20">Synced</span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar size={14} />
                                                {new Date(meeting.meeting_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Clock size={14} />
                                                {meeting.meeting_time.substring(0, 5)}
                                            </div>
                                            {meeting.duration && (
                                                <div className="flex items-center gap-1.5">
                                                    <Clock size={14} className="text-gray-500" />
                                                    {meeting.duration >= 60
                                                        ? `${Math.floor(meeting.duration / 60)}h${meeting.duration % 60 > 0 ? ` ${meeting.duration % 60}m` : ''}`
                                                        : `${meeting.duration} min`
                                                    }
                                                </div>
                                            )}

                                            {meeting.is_google_meet && (
                                                <div className="flex items-center gap-1.5 text-blue-400">
                                                    <Video size={14} />
                                                    Google Meet
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
                                        <button
                                            onClick={() => openAnalytics(meeting)}
                                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 hover:bg-blue-500/20 transition-all font-bold text-sm"
                                        >
                                            <BarChart2 size={18} />
                                            Stats
                                        </button>
                                        <button
                                            onClick={() => copyLink(meeting.share_id)}
                                            className="flex-1 md:flex-none flex items-center justify-center p-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                                        >
                                            <Copy size={20} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteMeeting(meeting.id)}
                                            className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 hover:text-white hover:bg-red-500 transition-all group"
                                            title="Supprimer"
                                        >
                                            <Trash2 size={20} className="group-hover:scale-110 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <form onSubmit={handleUpdateSettings} className="space-y-8 pb-20">
                        {/* Profil Section */}
                        <div className="bg-[#111] border border-white/10 rounded-3xl p-6 md:p-8 space-y-6">
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
                                {profile.social_links.map((link, idx) => (
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
                                {profile.social_links.length === 0 && (
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

                        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0a0a0a]/80 backdrop-blur-md border-t border-white/10 z-30 sm:relative sm:bg-transparent sm:border-none sm:p-0 sm:mt-8">
                            <button
                                type="submit"
                                disabled={!hasChanges || formLoading}
                                className={`w-full sm:w-auto sm:ml-auto flex items-center justify-center gap-3 px-10 py-4 rounded-2xl font-bold transition-all shadow-xl ${hasChanges
                                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/20'
                                    : 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'
                                    }`}
                            >
                                {formLoading ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                                Enregistrer les modifications
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Create Meeting Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
                    <div className="bg-[#111] w-full sm:max-w-xl h-full sm:h-auto sm:max-h-[90vh] sm:border sm:border-white/10 sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <h3 className="text-xl font-bold">Nouveau Rendez-vous</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-500 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="max-h-[80vh] overflow-y-auto overflow-x-hidden">
                            <form onSubmit={handleCreateMeeting} className="p-6 space-y-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400">Titre</label>
                                    <input
                                        required
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full px-4 py-3 bg-black border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Appel de découverte"
                                    />
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-white flex items-center gap-2 px-1">
                                            <Calendar size={14} /> Date
                                        </label>
                                        <input
                                            required
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="w-full px-3 py-3 bg-black border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-white flex items-center gap-2 px-1">
                                            <Clock size={14} /> Heure
                                        </label>
                                        <input
                                            required
                                            type="time"
                                            value={time}
                                            onChange={(e) => setTime(e.target.value)}
                                            className="w-full px-3 py-3 bg-black border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-white flex items-center gap-2 px-1">
                                            <Clock size={14} /> Durée
                                        </label>
                                        <select
                                            value={duration}
                                            onChange={(e) => setDuration(Number(e.target.value))}
                                            className="w-full px-4 py-3 bg-black border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        >
                                            {Array.from({ length: 12 }, (_, i) => (i + 1) * 10).map((min) => {
                                                const h = Math.floor(min / 60);
                                                const m = min % 60;
                                                const label = h > 0
                                                    ? m > 0 ? `${h}h ${m}min` : `${h}h`
                                                    : `${m} min`;
                                                return <option key={min} value={min}>{label}</option>;
                                            })}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400">Description (Optionnel)</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full px-4 py-3 bg-black border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                                        placeholder="Sujet de la réunion..."
                                    />
                                </div>

                                <div
                                    className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all cursor-pointer group"
                                    onClick={() => setIsGoogleMeet(!isGoogleMeet)}
                                >
                                    <div className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors ${isGoogleMeet ? 'bg-blue-600' : 'bg-white/20'}`}>
                                        <span className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${isGoogleMeet ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </div>
                                    <label className="font-medium cursor-pointer flex-1">
                                        Générer un lien Google Meet
                                    </label>
                                    <Video size={20} className={`${isGoogleMeet ? 'text-blue-500' : 'text-gray-500'} transition-colors`} />
                                </div>

                                <div
                                    className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all cursor-pointer group"
                                    onClick={() => setRequestPhone(!requestPhone)}
                                >
                                    <div className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors ${requestPhone ? 'bg-blue-600' : 'bg-white/20'}`}>
                                        <span className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${requestPhone ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </div>
                                    <label className="font-medium cursor-pointer flex-1">
                                        Demander le numéro de téléphone <span className="text-gray-500 font-normal text-xs">(Optionnel)</span>
                                    </label>
                                    <Phone size={20} className={`${requestPhone ? 'text-blue-500' : 'text-gray-500'} transition-colors`} />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400">Lien personnalisé (Optionnel)</label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-500 text-sm whitespace-nowrap">/join/</span>
                                        <input
                                            type="text"
                                            value={customSlug}
                                            onChange={(e) => {
                                                setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
                                                setIsSlugManuallyEdited(true);
                                            }}
                                            className="w-full px-4 py-3 bg-black border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="mon-appel-perso"
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-500 italic">Si vide, un lien unique sera généré automatiquement.</p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                                >
                                    {formLoading ? 'Création...' : 'Créer et Synchroniser'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {imageToCrop && (
                <ImageCropper
                    image={imageToCrop}
                    onCropComplete={handleCropComplete}
                    onCancel={() => setImageToCrop(null)}
                />
            )}

            {/* Analytics Modal */}
            {analyticsMeeting && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
                    <div className="bg-[#111] w-full sm:max-w-2xl h-full sm:h-auto sm:max-h-[90vh] sm:border sm:border-white/10 sm:rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="p-6 md:p-8 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-blue-500/5 to-transparent">
                            <div>
                                <h3 className="text-2xl font-bold flex items-center gap-3">
                                    <BarChart2 className="text-blue-500" size={24} />
                                    Statistiques
                                </h3>
                                <p className="text-gray-500 text-sm mt-1">{analyticsMeeting.title}</p>
                            </div>
                            <button onClick={() => setAnalyticsMeeting(null)} className="p-2 bg-white/5 rounded-xl text-gray-400 hover:text-white transition-all border border-white/10">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 md:p-8 max-h-[calc(100vh-160px)] sm:max-h-[70vh] overflow-y-auto space-y-8">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Ouvertures du lien</p>
                                    <p className="text-4xl font-black text-white">{analyticsLoading ? '...' : analyticsData?.views || 0}</p>
                                </div>
                                <div className="p-6 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                                    <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-1">Inscriptions (Emails)</p>
                                    <p className="text-4xl font-black text-blue-500">{analyticsLoading ? '...' : analyticsData?.joins.length || 0}</p>
                                </div>
                            </div>

                            {/* Guest List */}
                            <div className="space-y-4">
                                <h4 className="text-lg font-bold flex items-center gap-2">
                                    <Plus size={18} className="text-gray-500" />
                                    Liste des participants
                                </h4>

                                {analyticsLoading ? (
                                    <div className="flex justify-center py-10">
                                        <Loader2 className="animate-spin text-blue-500" size={32} />
                                    </div>
                                ) : analyticsData?.joins.length === 0 ? (
                                    <div className="text-center py-10 bg-white/5 rounded-2xl border border-dashed border-white/10">
                                        <p className="text-gray-500 text-sm">Aucun participant n'a encore entré son email.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {analyticsData?.joins.map((join: any, i: number) => {
                                            const date = new Date(join.created_at);
                                            return (
                                                <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-all">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 font-bold text-xs">
                                                            {join.email[0].toUpperCase()}
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                                            <p className="font-medium text-blue-100">{join.email}</p>
                                                            {join.phone && (
                                                                <p className="text-sm text-blue-400/80 flex items-center gap-1.5 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20">
                                                                    <Phone size={10} />
                                                                    {join.phone}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs font-bold text-white tracking-tight">
                                                            {date.toLocaleDateString('fr-FR')}
                                                        </p>
                                                        <p className="text-[10px] text-gray-500">
                                                            {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-white/10 bg-white/5">
                            <button
                                onClick={() => setAnalyticsMeeting(null)}
                                className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-all"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
        }>
            <DashboardContent />
        </Suspense>
    );
}
