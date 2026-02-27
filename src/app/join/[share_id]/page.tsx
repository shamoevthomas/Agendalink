import { supabase } from '@/lib/supabase';
import { Calendar, Clock, Video, CheckCircle2, MapPin, ExternalLink } from 'lucide-react';
import { notFound } from 'next/navigation';
import JoinForm from './JoinForm';

async function getMeetingData(shareId: string) {
    const { data: meeting, error: mError } = await supabase
        .from('al_meetings')
        .select('*')
        .eq('share_id', shareId)
        .single();

    if (mError || !meeting) return null;

    const { data: host } = await supabase
        .from('al_admin_settings')
        .select('first_name, last_name, bio, profile_image, social_links')
        .eq('email', meeting.host_email)
        .single();

    // Record view event
    await supabase
        .from('al_meeting_analytics')
        .insert({
            meeting_id: meeting.id,
            event_type: 'view'
        });

    return { meeting, host };
}

export default async function JoinPage({ params }: { params: Promise<{ share_id: string }> }) {
    const { share_id } = await params;
    const data = await getMeetingData(share_id);

    if (!data) {
        notFound();
    }

    const { meeting, host } = data;
    const meetingDate = new Date(meeting.meeting_date);
    const formattedDate = meetingDate.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    const startTime = meeting.meeting_time.substring(0, 5);
    const hostName = host?.first_name ? `${host.first_name} ${host.last_name || ''}` : meeting.host_email;

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-lg bg-[#111] border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-blue-500/5">
                <div className="p-6 text-center border-b border-white/5 bg-gradient-to-b from-blue-500/5 to-transparent">
                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xl border border-white/10 overflow-hidden">
                        {host?.profile_image ? (
                            <img src={host.profile_image} alt={hostName} className="w-full h-full object-cover transition-transform hover:scale-110 duration-500" />
                        ) : (
                            <div className="w-8 h-8 bg-blue-500 rounded-lg" />
                        )}
                    </div>
                    <h1 className="text-xl font-bold mb-0.5">{hostName}</h1>
                    {host?.bio && <p className="text-gray-500 text-xs max-w-[280px] mx-auto mb-2 line-clamp-2">{host.bio}</p>}

                    {/* Social Links */}
                    {host?.social_links && (host.social_links as any[]).length > 0 && (
                        <div className="flex items-center justify-center gap-2 mt-3">
                            {(host.social_links as any[]).map((link, i) => (
                                <a
                                    key={i}
                                    href={link.url}
                                    target="_blank"
                                    className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold hover:bg-white/10 transition-all text-gray-400 hover:text-white uppercase tracking-wider"
                                >
                                    {link.title}
                                </a>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-6 md:p-8 space-y-6">
                    <div className="text-center">
                        <p className="text-blue-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2 opcity-80">Invitation</p>
                        <h2 className="text-3xl font-extrabold mb-2 tracking-tight line-clamp-2">{meeting.title}</h2>
                        {meeting.description && (
                            <p className="text-gray-400 text-sm leading-relaxed max-w-xs mx-auto mb-2">
                                {meeting.description}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-3 p-3.5 bg-white/5 rounded-xl border border-white/10 group hover:border-blue-500/30 transition-colors">
                            <div className="w-8 h-8 bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center shrink-0">
                                <Calendar size={16} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Date</p>
                                <p className="text-sm font-semibold truncate capitalize">{meetingDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3.5 bg-white/5 rounded-xl border border-white/10 group hover:border-purple-500/30 transition-colors">
                            <div className="w-8 h-8 bg-purple-500/20 text-purple-400 rounded-lg flex items-center justify-center shrink-0">
                                <Clock size={16} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Heure</p>
                                <p className="text-sm font-semibold truncate">{startTime}</p>
                            </div>
                        </div>
                    </div>

                    {meeting.google_meet_link && (
                        <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
                                    <Video size={16} />
                                </div>
                                <div>
                                    <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider italic">Visio</p>
                                    <p className="text-sm font-semibold text-blue-100 italic">Google Meet inclus</p>
                                </div>
                            </div>
                            <a
                                href={meeting.google_meet_link}
                                target="_blank"
                                className="text-blue-400 hover:text-white transition-colors p-1"
                            >
                                <ExternalLink size={18} />
                            </a>
                        </div>
                    )}

                    <JoinForm meeting={meeting} shareId={share_id} />
                </div>
            </div>

            <p className="mt-6 text-gray-600 text-xs font-medium">
                Propulsé par <span className="text-gray-400">AgendaLink</span> &copy; 2026
            </p>
        </div>
    );
}
