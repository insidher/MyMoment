'use client';

import { useState } from 'react';
import { Moment } from '@/types';
import { Heart, MessageSquare, ExternalLink, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toggleLike } from '../../app/actions/moments';
import VisualTimeline from './VisualTimeline';
import UserAvatar from './UserAvatar';
import { CATEGORY_ID_TO_NAME } from '@/lib/constants';

interface MomentFeedCardProps {
    moment: Moment;
    onComment?: (momentId: string) => void;
}

export default function MomentFeedCard({ moment, onComment }: MomentFeedCardProps) {
    const router = useRouter();

    // State
    const [isLiked, setIsLiked] = useState(moment.isLiked || false);
    const [likeCount, setLikeCount] = useState(moment.likeCount || 0);

    const duration = moment.trackDurationSec || moment.trackSource?.durationSec || 180;

    const handleLike = async () => {
        const newIsLiked = !isLiked;
        const newLikeCount = newIsLiked ? likeCount + 1 : likeCount - 1;

        // Optimistic update
        setIsLiked(newIsLiked);
        setLikeCount(newLikeCount);

        try {
            await toggleLike(moment.id, '/explore');
        } catch (error) {
            // Revert on error
            setIsLiked(!newIsLiked);
            setLikeCount(likeCount);
            console.error('Failed to toggle like:', error);
        }
    };

    const handleCommentClick = () => {
        if (onComment) {
            onComment(moment.id);
        }
    };

    return (
        <div className="bg-neutral-900 rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 transition-all">
            {/* Header */}
            <Link
                href={`/room/view?url=${encodeURIComponent(moment.sourceUrl)}&start=${moment.startSec}&end=${moment.endSec}`}
                className="flex items-center gap-2 p-3 hover:bg-white/5 transition-colors"
            >
                <UserAvatar
                    name={moment.user?.name}
                    image={moment.user?.image}
                    size="w-8 h-8"
                />
                <div className="flex-1">
                    <p className="text-white font-medium">{moment.user?.name || 'Music Lover'}</p>
                    <p className="text-white/50 text-sm">{moment.artist}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                    {(() => {
                        if (!moment.trackSource) return null;
                        const catId = Number(moment.trackSource.category_id);
                        const catName = CATEGORY_ID_TO_NAME[catId];
                        if (!catName) return null;
                        return (
                            <div className="bg-blue-500/10 text-blue-500 text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                {catName}
                            </div>
                        );
                    })()}
                    <span className="text-xs text-white/40">
                        {new Date(moment.createdAt).toLocaleDateString()}
                    </span>
                </div>
            </Link>

            {/* Video Thumbnail - Clickable to Listening Room */}
            <Link
                href={`/room/view?url=${encodeURIComponent(moment.sourceUrl)}&start=${moment.startSec}&end=${moment.endSec}`}
                className="relative block aspect-video bg-black group"
            >
                <img
                    src={moment.artwork || '/placeholder-artwork.jpg'}
                    alt={moment.title || 'Video thumbnail'}
                    className="w-full h-full object-cover"
                />

                {/* Play Icon Overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                    <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ArrowRight size={32} className="text-black ml-1" />
                    </div>
                </div>

                {/* Source Traffic Badge (Top Right) */}
                {moment.trackSource && (
                    <div className="absolute top-3 right-3 backdrop-blur-md bg-black/60 text-white text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5 z-10">
                        {moment.trackSource.service === 'youtube' ? (
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
            </Link>

            {/* Visual Timeline */}
            <div className="px-3 pt-1">
                <VisualTimeline
                    duration={duration}
                    currentTime={moment.startSec}
                    activeStart={moment.startSec}
                    activeEnd={moment.endSec}
                    ghostRanges={moment.trackSource?.moments?.filter(m => m.id !== moment.id).map(m => ({
                        startSec: m.startSec,
                        endSec: m.endSec,
                    })) || []}
                    onSeek={() => { }} // No seeking in feed - just visual
                />
            </div>

            {/* Footer */}
            <div className="p-3 pt-2 space-y-1.5">
                {/* Title */}
                <Link
                    href={`/room/view?url=${encodeURIComponent(moment.sourceUrl)}&start=${moment.startSec}&end=${moment.endSec}`}
                    className="text-white/80 hover:text-white transition-colors font-medium block"
                >
                    {moment.title || 'Untitled'}
                </Link>

                {/* Quote */}
                {moment.note && (
                    <p className="font-serif italic text-base text-gray-200 leading-snug">
                        "{moment.note}"
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
                        onClick={handleCommentClick}
                        className="flex items-center gap-2 text-white/60 hover:text-blue-400 transition-colors"
                    >
                        <MessageSquare size={20} />
                        <span className="text-sm font-medium">{moment.replyCount || 0}</span>
                    </button>

                    <Link
                        href={`/room/view?url=${encodeURIComponent(moment.sourceUrl)}&start=${moment.startSec}&end=${moment.endSec}`}
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
