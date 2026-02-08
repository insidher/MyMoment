'use client';

import { useState, useEffect, useMemo } from 'react';
import { Play, TrendingUp, Music, Heart, User, ArrowLeft, Clock, Check } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import SongCard from '@/components/SongCard';
import MomentCard from '@/components/MomentCard';
import MomentFeedCard from '@/components/MomentFeedCard';
import VideoGroupCard from '@/components/VideoGroupCard';
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

import { CATEGORY_name_BY_ID } from '@/lib/constants';
import { X } from 'lucide-react';

export default function HomePage() {
    const { user } = useAuth();
    const { showSpotify, isLoading: filterLoading } = useFilter();
    const searchParams = useSearchParams();
    const router = useRouter();

    // Get filter params
    const artistFilter = searchParams.get('artist');
    const categoryFilter = searchParams.get('category');
    const sortParam = searchParams.get('sort') as 'newest' | 'oldest' | 'shortest' | 'longest' | null;

    const [songs, setSongs] = useState<SongGroup[]>([]);
    const [moments, setMoments] = useState<Moment[]>([]);
    const [artistStats, setArtistStats] = useState<ArtistStats[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!filterLoading) {
            fetchData();
        }
    }, [artistFilter, categoryFilter, sortParam, user, showSpotify, filterLoading]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (artistFilter) {
                const songsData = await getArtistSongs(user?.id || '', artistFilter, !showSpotify);
                setSongs(songsData);
            } else {
                // Pass category and sort options
                const momentsData = await getRecentMoments({
                    limit: 50,
                    excludeSpotify: !showSpotify,
                    category: categoryFilter || undefined,
                    sort: sortParam || 'newest'
                });
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
    if (filterLoading || (loading && !moments.length && !songs.length)) {
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

    // Resolve category name for display
    let activeCategoryName = '';
    if (categoryFilter) {
        const catId = parseInt(categoryFilter);
        activeCategoryName = CATEGORY_name_BY_ID[catId] || categoryFilter.charAt(0).toUpperCase() + categoryFilter.slice(1);
    }

    // Helper to clear specific filter
    const clearFilter = (type: 'category' | 'sort') => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete(type);
        router.push(`/?${params.toString()}`);
    };

    return (
        <div className="flex flex-col gap-4 md:gap-6 min-h-[calc(100vh-80px)] p-4 md:p-6 pb-32 relative">

            {/* Content Grid */}
            <section className="space-y-6 relative">

                {/* Redesigned Active Filter Pills - Positioned to not take vertical space */}
                {(categoryFilter || sortParam) && (
                    <div className="absolute -top-1 md:-top-2 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center justify-center gap-2">
                        {categoryFilter && (
                            <div
                                onClick={() => clearFilter('category')}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 backdrop-blur-md border border-orange-500/20 text-orange-500 text-[10px] font-bold uppercase tracking-wider cursor-pointer hover:bg-orange-500/20 transition-all group shadow-2xl"
                            >
                                <Check size={10} className="group-hover:hidden" />
                                <X size={10} className="hidden group-hover:block" />
                                <span>Category: {activeCategoryName}</span>
                            </div>
                        )}
                        {sortParam && (
                            <div
                                onClick={() => clearFilter('sort')}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 backdrop-blur-md border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider cursor-pointer hover:bg-blue-500/20 transition-all group shadow-2xl"
                            >
                                <Check size={10} className="group-hover:hidden" />
                                <X size={10} className="hidden group-hover:block" />
                                <span>Sort: {sortParam}</span>
                            </div>
                        )}
                    </div>
                )}

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
                                    <p>No moments found{categoryFilter ? ` for ${activeCategoryName}` : ''}.</p>
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
