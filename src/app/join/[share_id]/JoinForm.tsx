'use client';

import { useState } from 'react';
import { Calendar, Clock, Video, CheckCircle2, User, Send, Loader2, Phone } from 'lucide-react';
import { generateICS } from '@/lib/ics-helper';

interface JoinFormProps {
    meeting: any;
    shareId: string;
}

export default function JoinForm({ meeting, shareId }: JoinFormProps) {
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [joined, setJoined] = useState(false);
    const [error, setError] = useState('');

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/meetings/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shareId, email, phone }),
            });

            if (res.ok) {
                setJoined(true);
            } else {
                const data = await res.json();
                setError(data.error || 'Erreur lors de l\'inscription');
            }
        } catch (err) {
            setError('Une erreur est survenue');
        } finally {
            setLoading(false);
        }
    };


    const handleAppleClick = () => {
        generateICS({
            title: meeting.title,
            description: meeting.description,
            date: meeting.meeting_date,
            time: meeting.meeting_time,
        });
    };

    if (joined) {
        return (
            <div className="bg-green-500/10 border border-green-500/20 rounded-3xl p-8 text-center animate-in fade-in zoom-in duration-300">
                <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/20">
                    <CheckCircle2 size={32} />
                </div>
                <h3 className="text-2xl font-bold mb-2">C'est confirmé !</h3>
                <p className="text-gray-400 mb-6">
                    Vous avez été ajouté à la réunion. Google va vous envoyer une invitation par mail d'ici quelques instants.
                </p>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-sm text-gray-400">
                    Pensez à vérifier vos spams si vous ne recevez rien.
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-10">
            {/* Email Form */}
            <div className="space-y-6">
                <form onSubmit={handleJoin} className="space-y-4">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-500 group-focus-within:text-blue-500 transition-colors">
                            <User size={20} />
                        </div>
                        <input
                            required
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Votre adresse email"
                            className="w-full pl-14 pr-5 py-5 bg-white/5 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-600"
                        />
                    </div>

                    {meeting.request_phone && (
                        <div className="space-y-2">
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-500 group-focus-within:text-blue-500 transition-colors">
                                    <Phone size={20} />
                                </div>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="Numéro de téléphone (Facultatif)"
                                    className="w-full pl-14 pr-5 py-5 bg-white/5 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-600"
                                />
                            </div>
                            <p className="px-2 text-[10px] text-gray-500 italic leading-relaxed">
                                Facultatif : pour vous contacter plus facilement en cas d'imprévu.
                            </p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-5 bg-white text-black font-bold rounded-2xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2 disabled:bg-gray-500 shadow-xl shadow-white/5"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                        Confirmer ma présence
                    </button>
                </form>
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            </div>

            {/* Alternative */}
            <div className="space-y-4 pt-4">
                <div className="relative">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                    <div className="relative flex justify-center text-xs uppercase tracking-widest text-gray-600 bg-[#111] px-4">Ou ajouter manuellement</div>
                </div>
                <div className="flex flex-col gap-3 pt-2">
                    <button
                        onClick={handleAppleClick}
                        className="w-full py-4 bg-white/5 border border-white/10 text-white font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-white/10 transition-all group"
                    >
                        <Calendar size={20} className="text-gray-400 group-hover:text-white transition-colors" />
                        Télécharger le fichier .ics (Apple / Outlook)
                    </button>
                </div>
            </div>
        </div>
    );
}
