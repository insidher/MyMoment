import { Play, TrendingUp, Music, Heart, User, ArrowLeft, Clock } from 'lucide-react';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import SongCard from '@/components/SongCard';
import MomentCard from '@/components/MomentCard';
import ArtistCard from '@/components/ArtistCard';
import { getGroupedSongs, getUserArtistStats, getArtistSongs, getRecentMoments } from './actions';

import { SongGroup, ArtistStats, Moment } from '@/types';

export default async function Explore({ searchParams }: { searchParams: Promise<{ artist?: string }> }) {
    const session = await getServerSession(authOptions);
    const params = await searchParams;
    const artistFilter = params.artist;

    let songs: SongGroup[] = [];
    let moments: Moment[] = [];
    let artistStats: ArtistStats[] = [];

    if (artistFilter) {
        songs = await getArtistSongs(session?.user?.id || '', artistFilter);
    } else {
        // Main Plaza View: Show recent individual moments
        moments = await getRecentMoments(50);
    }

    if (session?.user?.id && !artistFilter) {
        artistStats = await getUserArtistStats(session.user.id);
    }

    const vibes = [
        { id: 'chill', label: 'Chill', color: 'from-blue-500 to-cyan-500' },
        { id: 'hype', label: 'Hype', color: 'from-orange-500 to-red-500' },
        { id: 'focus', label: 'Focus', color: 'from-purple-500 to-pink-500' },
        { id: 'party', label: 'Party', color: 'from-green-500 to-emerald-500' },
    ];

    return (
        <main className="min-h-screen p-8 pb-24">
            <div className="max-w-7xl mx-auto space-y-12">

                {/* Header */}
                <div className="space-y-2">
                    {artistFilter ? (
                        <div className="space-y-4">
                            <Link href="/explore" className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors">
                                <ArrowLeft size={20} />
                                Back to Plaza
                            </Link>
                            <h1 className="text-4xl font-bold text-white">
                                {artistFilter}
                            </h1>
                            <p className="text-white/60 text-lg">
                                {songs.length} songs · {songs.reduce((acc, s) => acc + s.momentsCount, 0)} moments
                            </p>
                        </div>
                    ) : (
                        <>
                            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                                The Plaza
                            </h1>
                            <p className="text-white/60 text-lg">Discover moments captured by the community.</p>
                        </>
                    )}
                </div>

                {/* Browse by Artist (Only on main view and if logged in) */}
                {!artistFilter && session?.user && artistStats.length > 0 && (
                    <section className="space-y-6">
                        <div className="flex items-center gap-2 text-xl font-semibold text-white/90">
                            <User size={24} className="text-blue-400" />
                            <h2>Your Top Artists</h2>
                        </div>
                        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                            {artistStats.map((stats) => (
                                <ArtistCard key={stats.artist} stats={stats} />
                            ))}
                        </div>
                    </section>
                )}

                {/* Content Grid */}
                <section className="space-y-6">
                    <div className="flex items-center gap-2 text-xl font-semibold text-white/90">
                        {artistFilter ? (
                            <>
                                <TrendingUp size={24} className="text-purple-400" />
                                <h2>Songs by {artistFilter}</h2>
                            </>
                        ) : (
                            <>
                                <Clock size={24} className="text-orange-400" />
                                <h2>Latest Moments</h2>
                            </>
                        )}
                    </div>

                    {artistFilter ? (
                        // Artist View: Show grouped SongCards
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {songs.length === 0 ? (
                                <p className="text-white/30 italic col-span-full">
                                    No songs found for {artistFilter}.
                                </p>
                            ) : (
                                songs.map((song) => (
                                    <SongCard key={song.sourceUrl} song={song} />
                                ))
                            )}
                        </div>
                    ) : (
                        // Plaza View: Show individual MomentCards
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {moments.length === 0 ? (
                                <p className="text-white/30 italic col-span-full">
                                    No moments yet. Be the first to capture one!
                                </p>
                            ) : (
                                moments.map((moment) => (
                                    <MomentCard
                                        key={moment.id}
                                        moment={moment}
                                        // No explicit handlers needed; MomentCard defaults to routing logic
                                        showDelete={false} // Don't allow delete in public feed
                                    />
                                ))
                            )}
                        </div>
                    )}
                </section>

                {/* Vibes Section (Hide in artist view?) - Keeping it for now as it's general exploration */}
                {!artistFilter && (
                    <section className="space-y-6">
                        <div className="flex items-center gap-2 text-xl font-semibold text-white/90">
                            <Heart size={24} className="text-pink-400" />
                            <h2>Browse by Vibe</h2>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {vibes.map((vibe) => (
                                <button
                                    key={vibe.id}
                                    className={`h-32 rounded-2xl bg-gradient-to-br ${vibe.color} p-6 flex items-end justify-start text-xl font-bold shadow-lg hover:scale-[1.02] transition-transform relative overflow-hidden group`}
                                >
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                                    <span className="relative z-10">{vibe.label}</span>
                                </button>
                            ))}
                        </div>
                    </section>
                )}

            </div>
        </main>
    );
}
