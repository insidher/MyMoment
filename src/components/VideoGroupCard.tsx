'use client';

import { useState } from 'react';
import { Moment } from '@/types';
import { Heart, MessageSquare, ExternalLink, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toggleLike } from '../../app/actions/moments';
import VisualTimeline from './VisualTimeline';
import StaticTimelineVisual from './StaticTimelineVisual';
import UserAvatar from './UserAvatar';
import { CATEGORY_ID_TO_NAME } from '@/lib/constants';

interface VideoGroupCardProps {
    moments: Moment[];
}

export default function VideoGroupCard({ moments }: VideoGroupCardProps) {
    const router = useRouter();

    if (moments.length === 0) return null;

    // Use first moment as primary
    const primaryMoment = moments[0];

    // State
    const [isLiked, setIsLiked] = useState(primaryMoment.isLiked || false);
    const [likeCount, setLikeCount] = useState(primaryMoment.likeCount || 0);

    const duration = primaryMoment.trackDurationSec || primaryMoment.trackSource?.durationSec || 180;

    const handleLike = async () => {
        const newIsLiked = !isLiked;
        const newLikeCount = newIsLiked ? likeCount + 1 : likeCount - 1;

        // Optimistic update
        setIsLiked(newIsLiked);
        setLikeCount(newLikeCount);

        try {
            await toggleLike(primaryMoment.id, '/');
        } catch (error) {
            // Revert on error
            setIsLiked(!newIsLiked);
            setLikeCount(likeCount);
            console.error('Failed to toggle like:', error);
        }
    };

    return (
        <div className="bg-neutral-900 rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 transition-all">
            {/* Header */}
            <Link
                href={`/room/view?url=${encodeURIComponent(primaryMoment.sourceUrl)}&start=${primaryMoment.startSec}&end=${primaryMoment.endSec}`}
                className="flex items-center gap-2 p-3 hover:bg-white/5 transition-colors"
            >
                <UserAvatar
                    name={primaryMoment.user?.name}
                    image={primaryMoment.user?.image}
                    size="w-8 h-8"
                />
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <p className="text-white font-medium">{primaryMoment.user?.name || 'Music Lover'}</p>
                        {primaryMoment.trackSource?.category_id && (
                            <>
                                <span className="text-white/20">•</span>
                                <div className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                                    {CATEGORY_ID_TO_NAME[primaryMoment.trackSource.category_id] || `ID: ${primaryMoment.trackSource.category_id}`}
                                </div>
                            </>
                        )}
                    </div>
                    <p className="text-white/50 text-sm">{primaryMoment.artist}</p>
                </div>
                <span className="text-xs text-white/40">
                    {new Date(primaryMoment.createdAt).toLocaleDateString()}
                </span>
            </Link>

            {/* Video Thumbnail - Clickable to Listening Room */}
            <Link
                href={`/room/view?url=${encodeURIComponent(primaryMoment.sourceUrl)}&start=${primaryMoment.startSec}&end=${primaryMoment.endSec}`}
                className="relative block aspect-video bg-black group"
            >
                <img
                    src={primaryMoment.artwork || '/placeholder-artwork.jpg'}
                    alt={primaryMoment.title || 'Video thumbnail'}
                    className="w-full h-full object-cover"
                />

                {/* Play Icon Overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                    <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ArrowRight size={32} className="text-black ml-1" />
                    </div>
                </div>

                {/* Source Traffic Badge (Top Right) */}
                {primaryMoment.trackSource && (
                    <div className="absolute top-3 right-3 backdrop-blur-md bg-black/60 text-white text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5 z-10 border border-white/5">
                        {primaryMoment.trackSource.service === 'youtube' ? (
                            <>
                                <div className="w-2 h-2 bg-red-500 rounded-full" />
                                YouTube
                            </>
                        ) : (
                            <>
                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                                Spotify
                            </>
                        )}
                    </div>
                )}

                {/* Moment Count Badge (Top Left) */}
                <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
                    {moments.length > 1 && (
                        <div className="backdrop-blur-md bg-orange-600/90 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tight">
                            {moments.length} Moments
                        </div>
                    )}
                </div>
            </Link>

            {/* Visual Timeline - Use StaticTimelineVisual for grouped moments */}
            <div className="px-3 pt-1">
                {moments.length > 1 ? (
                    <StaticTimelineVisual
                        moments={moments}
                        totalDuration={duration}
                    />
                ) : (
                    <VisualTimeline
                        duration={duration}
                        currentTime={primaryMoment.startSec}
                        activeStart={primaryMoment.startSec}
                        activeEnd={primaryMoment.endSec}
                        ghostRanges={primaryMoment.trackSource?.moments?.filter(m => m.id !== primaryMoment.id).map(m => ({
                            startSec: m.startSec,
                            endSec: m.endSec,
                        })) || []}
                        onSeek={() => { }} // No seeking in feed - just visual
                    />
                )}
            </div>

            {/* Footer */}
            <div className="p-3 pt-2 space-y-1.5">
                {/* Title */}
                <Link
                    href={`/room/view?url=${encodeURIComponent(primaryMoment.sourceUrl)}&start=${primaryMoment.startSec}&end=${primaryMoment.endSec}`}
                    className="text-white/80 hover:text-white transition-colors font-medium block"
                >
                    {primaryMoment.title || 'Untitled'}
                </Link>

                {/* Quote */}
                {primaryMoment.note && (
                    <p className="font-serif italic text-base text-gray-200 leading-snug">
                        "{primaryMoment.note}"
                    </p>
                )}

                {/* Social Actions + Open Moment - All Inline */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleLike}
                        className={`flex items-center gap-2 transition-colors ${isLiked ? 'text-red-500' : 'text-white/60 hover:text-red-500'
                            }`}
                    >
                        <Heart
                            size={20}
                            className={isLiked ? 'fill-current' : ''}
                        />
                        <span className="text-sm font-medium">{likeCount}</span>
                    </button>

                    <button
                        className="flex items-center gap-2 text-white/60 hover:text-blue-400 transition-colors"
                    >
                        <MessageSquare size={20} />
                        <span className="text-sm font-medium">{primaryMoment.replyCount || 0}</span>
                    </button>

                    <Link
                        href={`/room/view?url=${encodeURIComponent(primaryMoment.sourceUrl)}&start=${primaryMoment.startSec}&end=${primaryMoment.endSec}`}
                        className="ml-auto bg-neutral-800 hover:bg-neutral-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors font-bold flex items-center gap-2"
                    >
                        <span>Open Moment</span>
                        <ArrowRight size={14} />
                    </Link>
                </div>
            </div>
        </div>
    );
}
