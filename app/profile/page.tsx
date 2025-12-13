'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Play, Music, Calendar, Youtube } from 'lucide-react';
import { Moment } from '@/types';
import MomentCard from '@/components/MomentCard';

export default function Profile() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [moments, setMoments] = useState<Moment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        } else if (status === 'authenticated' && session?.user?.id) {
            fetchMoments(session.user.id);
        }
    }, [status, session, router]);

    const fetchMoments = async (userId: string) => {
        try {
            const res = await fetch(`/api/moments?userId=${userId}`);
            const data = await res.json();
            if (data.moments) {
                setMoments(data.moments);
            }
        } catch (error) {
            console.error('Failed to fetch moments', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        // Confirmation is handled in MomentCard to allow animation

        try {
            const res = await fetch(`/api/moments/${id}`, { method: 'DELETE' });
            if (res.ok) {
                // Smart Cleanup: Remove all moments that match the deleted one (duplicates)
                setMoments(prev => {
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
                });
            }
        } catch (error) {
            console.error('Failed to delete moment', error);
        }
    };

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
            </div>
        );
    }

    return (
        <main className="min-h-screen p-8 pb-24">
            <div className="max-w-7xl mx-auto space-y-12">

                {/* Header */}
                <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-4xl font-bold">
                        {session?.user?.name?.[0] || 'U'}
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold">{session?.user?.name || 'User'}</h1>
                        <p className="text-white/60">{session?.user?.email}</p>
                        <p className="text-white/40 text-sm mt-1">Joined {new Date().toLocaleDateString()}</p>
                    </div>
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
                                    onDelete={handleDelete}
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

            </div>
        </main>
    );
}
