'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useFilter } from '@/context/FilterContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Play, Music, Calendar, Youtube, Settings } from 'lucide-react';
import { Moment } from '@/types';
import MomentCard from '@/components/MomentCard';
// ... imports
import { getUserMoments, getLikedMoments, getUserFeedback } from '../explore/actions';
import SettingsSidebar from '@/components/SettingsSidebar';
import FeedbackDetailModal from '@/components/FeedbackDetailModal';

export default function Profile() {
    const { user, isLoading } = useAuth();
    const { showSpotify, isLoading: filterLoading } = useFilter();
    const router = useRouter();
    const [moments, setMoments] = useState<Moment[]>([]);
    const [likedMoments, setLikedMoments] = useState<Moment[]>([]);
    const [feedbackList, setFeedbackList] = useState<any[]>([]); // Using any for now or define Feedback type
    const [loading, setLoading] = useState(true);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Feedback Detail State
    const [selectedFeedback, setSelectedFeedback] = useState<any | null>(null);

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        } else if (user?.id && !filterLoading) {
            fetchData(user.id);
        }
    }, [user, isLoading, router, showSpotify, filterLoading]);

    const fetchData = async (userId: string) => {
        setLoading(true);
        try {
            const [userData, likedData, feedbackData] = await Promise.all([
                getUserMoments(userId, !showSpotify),
                getLikedMoments(userId, !showSpotify),
                getUserFeedback(userId)
            ]);
            setMoments(userData);
            setLikedMoments(likedData);
            setFeedbackList(feedbackData);
        } catch (error) {
            console.error('Failed to fetch user data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        // Confirmation is handled in MomentCard to allow animation

        try {
            const supabase = createClient();
            const { error } = await supabase
                .from('moments')
                .delete()
                .eq('id', id);

            if (!error) {
                // Smart Cleanup: Remove all moments that match the deleted one (duplicates)
                const cleanup = (prev: Moment[]) => {
                    const target = prev.find(m => m.id === id);
                    if (!target) return prev.filter(m => m.id !== id);

                    return prev.filter(m =>
                        // Removing the exact ID OR any strict duplicate
                        !(m.id === id || (
                            m.sourceUrl === target.sourceUrl &&
                            m.startSec === target.startSec &&
                            m.endSec === target.endSec
                        ))
                    );
                };

                setMoments(prev => cleanup(prev));
                setLikedMoments(prev => cleanup(prev));
            } else {
                console.error('Failed to delete moment:', error);
            }
        } catch (error) {
            console.error('Failed to delete moment', error);
        }
    };

    if (isLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
            </div>
        );
    }

    return (
        <main className="min-h-screen p-8 pb-24">
            <SettingsSidebar
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                userEmail={user?.email}
            />

            <FeedbackDetailModal
                isOpen={!!selectedFeedback}
                onClose={() => setSelectedFeedback(null)}
                feedback={selectedFeedback}
            />

            <div className="max-w-7xl mx-auto space-y-12">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-4xl font-bold">
                            {user?.user_metadata?.avatar_url ? (
                                <img src={user.user_metadata.avatar_url} alt={user.email || 'User'} className="w-full h-full rounded-full" />
                            ) : (
                                (user?.email?.[0]?.toUpperCase() || 'U')
                            )}
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold">{user?.email?.split('@')[0] || 'User'}</h1>
                            <p className="text-white/60">{user?.email}</p>
                            <p className="text-white/40 text-sm mt-1">Joined {new Date().toLocaleDateString()}</p>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white"
                        title="Settings"
                    >
                        <Settings size={24} />
                    </button>
                </div>

                {/* My Moments */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-bold border-b border-white/10 pb-4">My Moments</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {moments.length === 0 ? (
                            <div className="col-span-full text-center py-12 text-white/40">
                                <p>You haven't saved any moments yet.</p>
                                <Link href="/" className="text-purple-400 hover:text-purple-300 mt-2 inline-block">
                                    Go capture some!
                                </Link>
                            </div>
                        ) : (
                            moments.map((moment) => (
                                <MomentCard
                                    key={moment.id}
                                    moment={moment}
                                    onDelete={moment.userId === user?.id ? handleDelete : undefined}
                                    // Pass track duration to enable visual timeline
                                    trackDuration={moment.trackSource?.durationSec}
                                    onPlayFull={(m) => router.push(`/room/view?url=${encodeURIComponent(m.sourceUrl)}`)}
                                    // Use start/end params to trigger "Moment Mode" (auto-stop/fade) in Room
                                    onPlayMoment={(m) => router.push(`/room/view?url=${encodeURIComponent(m.sourceUrl)}&start=${m.startSec}&end=${m.endSec}`)}
                                />
                            ))
                        )}
                    </div>
                </section>

                {/* Liked Moments */}
                {likedMoments.length > 0 && (
                    <section className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500 delay-100">
                        <h2 className="text-2xl font-bold border-b border-white/10 pb-4 text-pink-400">Liked Moments</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {likedMoments.map((moment) => (
                                <MomentCard
                                    key={moment.id}
                                    moment={moment}
                                    onDelete={handleDelete} // Logic handles strict deletion. For Likes, we probably want "Unlike"?
                                    // For now, allow deletion if owner? MomentCard handles owner check ideally.
                                    trackDuration={moment.trackSource?.durationSec}
                                    onPlayFull={(m) => router.push(`/room/view?url=${encodeURIComponent(m.sourceUrl)}`)}
                                    onPlayMoment={(m) => router.push(`/room/view?url=${encodeURIComponent(m.sourceUrl)}&start=${m.startSec}&end=${m.endSec}`)}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* User Feedback History */}
                {feedbackList.length > 0 && (
                    <section className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500 delay-200">
                        <h2 className="text-2xl font-bold border-b border-white/10 pb-4 text-purple-400">My Feedback</h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {feedbackList.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setSelectedFeedback(item)}
                                    className="bg-zinc-900/50 hover:bg-zinc-900 border border-white/5 hover:border-purple-500/30 rounded-xl p-4 text-left transition-all hover:scale-[1.02] group"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                                            {item.category || 'Feedback'}
                                        </span>
                                        <span className="text-xs text-white/30">
                                            {new Date(item.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-sm text-white/80 line-clamp-2">
                                        {item.content}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </section>
                )}

            </div>
        </main>
    );
}
