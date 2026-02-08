'use client';

import { useState, useEffect, use, useMemo } from 'react';
import { Moment } from '@/types';
import { getUserMoments, getLikedMoments, getProfileData } from '../../actions';
import VideoGroupCard from '@/components/VideoGroupCard';
import UserAvatar from '@/components/UserAvatar';
import { Music, Heart, Sparkles, LayoutGrid } from 'lucide-react';
import { useFilter } from '@/context/FilterContext';

// Helper to group moments by video source
function groupMomentsByVideo(moments: Moment[]): Map<string, Moment[]> {
    const grouped = new Map<string, Moment[]>();
    moments.forEach(moment => {
        const videoId = moment.trackSource?.id || moment.sourceUrl || moment.id;
        if (!grouped.has(videoId)) {
            grouped.set(videoId, []);
        }
        grouped.get(videoId)!.push(moment);
    });
    return grouped;
}

interface ProfilePageProps {
    params: Promise<{ id: string }>;
}

export default function PublicProfile({ params }: ProfilePageProps) {
    const { id: userId } = use(params);
    const { showSpotify } = useFilter();

    const [profile, setProfile] = useState<{ name: string; image: string | null; momentCount: number } | null>(null);
    const [capturedMoments, setCapturedMoments] = useState<Moment[]>([]);
    const [likedMoments, setLikedMoments] = useState<Moment[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'captured' | 'liked'>('captured');

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                const [profileData, capturedData, likedData] = await Promise.all([
                    getProfileData(userId),
                    getUserMoments(userId, !showSpotify),
                    getLikedMoments(userId, !showSpotify)
                ]);

                setProfile(profileData);
                setCapturedMoments(capturedData);
                setLikedMoments(likedData);
            } catch (error) {
                console.error('Failed to load profile:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [userId, showSpotify]);

    // Grouping
    const groupedCaptured = useMemo(() => groupMomentsByVideo(capturedMoments), [capturedMoments]);
    const groupedLiked = useMemo(() => groupMomentsByVideo(likedMoments), [likedMoments]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-white/40">
                <p className="text-xl font-medium">Profile not found</p>
            </div>
        );
    }

    return (
        <main className="min-h-screen max-w-4xl mx-auto px-4 py-6 space-y-4 animate-in fade-in duration-500">
            {/* Compact Header */}
            <header className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
                <UserAvatar
                    name={profile.name}
                    image={profile.image}
                    size="w-14 h-14 shadow-xl ring-2 ring-white/5"
                />
                <div className="flex-1 min-w-0">
                    <h1 className="text-xl font-bold tracking-tight truncate">{profile.name}</h1>
                    <div className="flex items-center gap-3 text-white/50 text-xs">
                        <div className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                            <Sparkles size={12} className="text-purple-400" />
                            <span className="font-medium text-white/80">{profile.momentCount}</span>
                            <span>Moments</span>
                        </div>
                    </div>
                </div>

                {/* Follow Placeholder */}
                <div className="flex flex-col items-end gap-1">
                    <button disabled className="px-4 py-1.5 rounded-xl bg-white/5 text-white/40 text-sm font-bold border border-white/5 cursor-not-allowed">
                        Follow
                    </button>
                    <span className="text-[10px] text-white/20 font-medium uppercase tracking-widest mr-1">Coming Soon</span>
                </div>
            </header>

            {/* Tab Navigation */}
            <div className="flex items-center justify-center p-1 rounded-2xl bg-white/5 border border-white/10 w-fit mx-auto">
                <button
                    onClick={() => setActiveTab('captured')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'captured'
                        ? 'bg-white/10 text-white shadow-lg'
                        : 'text-white/40 hover:text-white/80'
                        }`}
                >
                    <LayoutGrid size={16} />
                    Captured
                </button>
                <button
                    onClick={() => setActiveTab('liked')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'liked'
                        ? 'bg-white/10 text-white shadow-lg'
                        : 'text-white/40 hover:text-white/80'
                        }`}
                >
                    <Heart size={16} className={activeTab === 'liked' ? 'fill-red-500 text-red-500' : ''} />
                    Liked
                </button>
            </div>

            {/* Centered Feed View - Plaza Style */}
            <section className="animate-in slide-in-from-bottom-4 duration-500 flex flex-col items-center pb-24">
                <div className="w-full max-w-2xl space-y-3">
                    {activeTab === 'captured' ? (
                        groupedCaptured.size > 0 ? (
                            Array.from(groupedCaptured.entries()).map(([videoId, videoMoments]) => (
                                <VideoGroupCard key={videoId} moments={videoMoments} />
                            ))
                        ) : (
                            <div className="py-20 text-center space-y-3">
                                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/5">
                                    <Music className="text-white/20" />
                                </div>
                                <p className="text-white/40 font-medium whitespace-nowrap">No moments captured yet</p>
                            </div>
                        )
                    ) : (
                        groupedLiked.size > 0 ? (
                            Array.from(groupedLiked.entries()).map(([videoId, videoMoments]) => (
                                <VideoGroupCard key={videoId} moments={videoMoments} />
                            ))
                        ) : (
                            <div className="py-20 text-center space-y-3">
                                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/5">
                                    <Heart className="text-white/20" />
                                </div>
                                <p className="text-white/40 font-medium whitespace-nowrap">No liked moments yet</p>
                            </div>
                        )
                    )}
                </div>
            </section>
        </main>
    );
}
