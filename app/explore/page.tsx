'use client';

import { useState, useEffect } from 'react';
import { Play, TrendingUp, Music, Heart, User, ArrowLeft, Clock } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import SongCard from '@/components/SongCard';
import MomentCard from '@/components/MomentCard';
import MomentFeedCard from '@/components/MomentFeedCard';
import ArtistCard from '@/components/ArtistCard';
import { getGroupedSongs, getUserArtistStats, getArtistSongs, getRecentMoments } from './actions';
import { useAuth } from '@/context/AuthContext';
import { useFilter } from '@/context/FilterContext';
import { SongGroup, ArtistStats, Moment } from '@/types';

export default function ExplorePage() {
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

    const vibes = [
        { id: 'chill', label: 'Chill', color: 'from-blue-500 to-cyan-500' },
        { id: 'hype', label: 'Hype', color: 'from-orange-500 to-red-500' },
        { id: 'focus', label: 'Focus', color: 'from-purple-500 to-pink-500' },
        { id: 'party', label: 'Party', color: 'from-green-500 to-emerald-500' },
    ];

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
        <div className="flex flex-col gap-6 md:gap-8 min-h-[calc(100vh-80px)] p-6 md:p-8 pb-32 relative">


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
                    // Plaza View: Show individual MomentFeedCards in vertical feed
                    <div className="flex flex-col space-y-12 pb-24">
                        {moments.length === 0 ? (
                            <div className="text-center py-12 text-white/40">
                                <p>No moments found.</p>
                                <Link href="/" className="text-purple-400 hover:text-purple-300 mt-2 inline-block">
                                    Be the first to capture one!
                                </Link>
                            </div>
                        ) : (
                            moments.map((moment) => (
                                <MomentFeedCard
                                    key={moment.id}
                                    moment={moment}
                                />
                            ))
                        )}
                    </div>
                )}
            </section>

        </div>
    );
}
