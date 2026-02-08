'use client';

import { useState, useEffect, useMemo } from 'react';
import { Play, TrendingUp, Music, Heart, User, ArrowLeft, Clock } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import SongCard from '@/components/SongCard';
import MomentCard from '@/components/MomentCard';
import MomentFeedCard from '@/components/MomentFeedCard';
import VideoGroupCard from '@/components/VideoGroupCard';
import ValueProp from '@/components/ValueProp';
import ArtistCard from '@/components/ArtistCard';
import { getGroupedSongs, getUserArtistStats, getArtistSongs, getRecentMoments } from './actions';
import { useAuth } from '@/context/AuthContext';
import { useFilter } from '@/context/FilterContext';
import { SongGroup, ArtistStats, Moment } from '@/types';

// Helper to group moments by video source
function groupMomentsByVideo(moments: Moment[]): Map<string, Moment[]> {
    const grouped = new Map<string, Moment[]>();

    moments.forEach(moment => {
        // Use trackSource.id as primary key, fallback to sourceUrl
        const videoId = moment.trackSource?.id || moment.sourceUrl || moment.id;

        if (!grouped.has(videoId)) {
            grouped.set(videoId, []);
        }
        grouped.get(videoId)!.push(moment);
    });

    return grouped;
}

export default function HomePage() {
    const { user } = useAuth();
    const { showSpotify, isLoading: filterLoading } = useFilter();
    const searchParams = useSearchParams();
    const router = useRouter();
    const artistFilter = searchParams.get('artist');

    const [songs, setSongs] = useState<SongGroup[]>([]);
    const [moments, setMoments] = useState<Moment[]>([]);
    const [artistStats, setArtistStats] = useState<ArtistStats[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!filterLoading) {
            fetchData();
        }
    }, [artistFilter, user, showSpotify, filterLoading]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (artistFilter) {
                const songsData = await getArtistSongs(user?.id || '', artistFilter, !showSpotify);
                setSongs(songsData);
            } else {
                const momentsData = await getRecentMoments(50, !showSpotify);
                setMoments(momentsData);
            }

            if (user && !artistFilter) {
                const stats = await getUserArtistStats(user.id);
                setArtistStats(stats);
            }
        } catch (error) {
            console.error('Failed to fetch explore data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Memoize grouped videos to prevent recalculation
    const groupedVideos = useMemo(() => {
        return groupMomentsByVideo(moments);
    }, [moments]);

    // Show skeleton loading state while filter is initializing
    if (filterLoading || loading) {
        return (
            <main className="min-h-screen p-8 pb-24">
                <div className="max-w-7xl mx-auto space-y-12">
                    <div className="space-y-2">
                        <div className="h-10 w-64 bg-white/5 rounded-lg animate-pulse" />
                        <div className="h-6 w-96 bg-white/5 rounded-lg animate-pulse" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-64 bg-white/5 rounded-xl animate-pulse" />
                        ))}
                    </div>
                </div>
            </main>
        );
    }

    return (
        <div className="flex flex-col gap-4 md:gap-6 min-h-[calc(100vh-80px)] p-4 md:p-6 pb-32 relative">
            {/* Value Prop - Only show on home feed */}
            {!artistFilter && <ValueProp />}

            {/* Content Grid */}
            <section className="space-y-6">

                {artistFilter ? (
                    // Artist View: Show grouped SongCards
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {songs.length === 0 ? (
                            <div className="col-span-full text-center py-12 text-white/40">
                                <p>No songs found for this artist.</p>
                            </div>
                        ) : (
                            songs.map((song) => (
                                <SongCard key={`${song.service}-${song.sourceUrl}`} song={song} />
                            ))
                        )}
                    </div>
                ) : (
                    // Home Feed: Show grouped VideoGroupCards
                    <div className="flex flex-col items-center pb-24">
                        <div className="w-full max-w-2xl space-y-4">
                            {groupedVideos.size === 0 ? (
                                <div className="text-center py-12 text-white/40">
                                    <p>No moments found.</p>
                                    <Link href="/about" className="text-purple-400 hover:text-purple-300 mt-2 inline-block">
                                        Learn how to capture your first moment!
                                    </Link>
                                </div>
                            ) : (
                                Array.from(groupedVideos.entries()).map(([videoId, videoMoments]) => (
                                    <VideoGroupCard
                                        key={videoId}
                                        moments={videoMoments}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                )}
            </section>

        </div>
    );
}
