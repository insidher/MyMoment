'use client';

import { useState, useMemo } from 'react';
import { Moment } from '@/types';
import { Heart, MessageSquare, ArrowRight, Share2, Play } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toggleLike } from '../../app/actions/moments';
import UserAvatar from './UserAvatar';
import CategoryBadge from './CategoryBadge';
import { formatRelativeTime } from '@/lib/time';

interface MomentFeedCardProps {
    moments: Moment[];
    onComment?: (momentId: string) => void;
    isAdmin?: boolean;
}

export default function MomentFeedCard({ moments, onComment, isAdmin = false }: MomentFeedCardProps) {
    const router = useRouter();

    if (!moments || moments.length === 0) return null;

    // Default to the first moment
    const [selectedMoment, setSelectedMoment] = useState<Moment>(moments[0]);

    // Local state for likes to allow instant UI updates per moment
    const [likesState, setLikesState] = useState<Record<string, { isLiked: boolean; count: number }>>(() => {
        const initial: Record<string, { isLiked: boolean; count: number }> = {};
        moments.forEach(m => {
            initial[m.id] = { isLiked: m.isLiked || false, count: m.likeCount || 0 };
        });
        return initial;
    });

    const currentLikeState = likesState[selectedMoment.id] || { isLiked: false, count: 0 };

    // Duration Logic
    const duration = selectedMoment.trackDurationSec || selectedMoment.trackSource?.durationSec || 180;
    const safeDuration = duration > 0 ? duration : 180;

    const handleLike = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const momentId = selectedMoment.id;
        const wasLiked = currentLikeState.isLiked;
        const newIsLiked = !wasLiked;
        const newCount = newIsLiked ? currentLikeState.count + 1 : currentLikeState.count - 1;

        // Optimistic update
        setLikesState(prev => ({
            ...prev,
            [momentId]: { isLiked: newIsLiked, count: newCount }
        }));

        try {
            await toggleLike(momentId, '/explore');
        } catch (error) {
            // Revert on error
            setLikesState(prev => ({
                ...prev,
                [momentId]: { isLiked: wasLiked, count: currentLikeState.count }
            }));
            console.error('Failed to toggle like:', error);
        }
    };

    const handleCommentClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (onComment) {
            onComment(selectedMoment.id);
        }
    };

    // Calculate unique users text
    const uniqueUsersText = useMemo(() => {
        const uniqueUsers = new Set(moments.map(m => m.userId).filter(id => id !== selectedMoment.userId));
        const count = uniqueUsers.size;
        if (count === 0) return '';
        return `and ${count} other${count > 1 ? 's' : ''}`;
    }, [moments, selectedMoment.userId]);

    return (
        <div className="bg-neutral-900 rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 transition-all group/card">
            {/* Header - Minimal: User + "and others" + Category */}
            <Link
                href={`/room/view?url=${encodeURIComponent(selectedMoment.sourceUrl)}&start=${selectedMoment.startSec}&end=${selectedMoment.endSec}`}
                className="flex items-center gap-2 p-3 hover:bg-white/5 transition-colors"
                onClick={(e) => e.stopPropagation()}
            >
                <UserAvatar
                    name={selectedMoment.user?.name}
                    image={selectedMoment.user?.image}
                    size="w-8 h-8"
                />
                <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">
                        {selectedMoment.user?.name || 'Music Lover'}
                        {uniqueUsersText && (
                            <span className="text-white/50 font-normal ml-1 text-sm">{uniqueUsersText}</span>
                        )}
                    </p>
                </div>
                <CategoryBadge categoryId={selectedMoment.trackSource?.category_id} />
            </Link>

            {/* Video Thumbnail Area */}
            <div className="relative aspect-video bg-black group-thumbnail cursor-pointer">
                {/* Clicking image goes to room */}
                <Link
                    href={`/room/view?url=${encodeURIComponent(selectedMoment.sourceUrl)}&start=${selectedMoment.startSec}&end=${selectedMoment.endSec}`}
                    className="absolute inset-0"
                >
                    <img
                        src={selectedMoment.artwork || '/placeholder-artwork.jpg'}
                        alt={selectedMoment.title || 'Video thumbnail'}
                        className="w-full h-full object-cover opacity-90 transition-opacity group-hover/card:opacity-100"
                    />
                    {/* Dark gradient overlay for top text visibility */}
                    <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-black/80 to-transparent pointer-events-none" />
                </Link>

                {/* Top Metadata Overlay */}
                <div className="absolute top-3 left-3 right-3 pointer-events-none flex flex-col gap-0.5">
                    {/* Title */}
                    <h3 className="text-white font-bold leading-tight line-clamp-1 text-lg drop-shadow-md">
                        {selectedMoment.title || 'Untitled'}
                    </h3>

                    {/* Channel + Source */}
                    <div className="flex items-center gap-2 text-sm text-white/90 font-medium drop-shadow-md">
                        <span>{selectedMoment.artist}</span>
                        {selectedMoment.trackSource && (
                            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/90">
                                <div className={`w-1.5 h-1.5 rounded-full ${selectedMoment.trackSource.service === 'youtube' ? 'bg-red-500' : 'bg-green-500'} shadow-[0_0_4px_rgba(0,0,0,0.5)]`} />
                                <span style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                                    {selectedMoment.trackSource.service === 'youtube' ? 'YouTube' : 'Spotify'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Shishkabob Timeline */}
            <div className="px-3 pt-3 pb-1 relative">
                <div className="relative h-3 w-full flex items-center">
                    {/* The Skewer Line */}
                    <div className="absolute w-full h-[1px] bg-white/20 z-0" />

                    {/* Segments */}
                    <div className="relative w-full h-full z-10">
                        {moments.map((m, idx) => {
                            const widthPercent = ((m.endSec - m.startSec) / safeDuration) * 100;
                            const leftPercent = (m.startSec / safeDuration) * 100;
                            const isSelected = m.id === selectedMoment.id;

                            return (
                                <button
                                    key={m.id}
                                    onClick={() => setSelectedMoment(m)}
                                    className={`absolute top-0 bottom-0 rounded-full transition-all duration-200 cursor-pointer ${isSelected
                                        ? 'bg-primary z-20 shadow-[0_0_8px_rgba(var(--primary),0.4)] scale-y-110'
                                        : 'bg-primary/40 hover:bg-primary/70 z-10'
                                        }`}
                                    style={{
                                        left: `${leftPercent}%`,
                                        width: `${Math.max(widthPercent, 2)}%`, // Minimum visual width
                                        minWidth: '6px'
                                    }}
                                    aria-label={`Select moment ${idx + 1}`}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Footer Content */}
            <div className="p-4 pt-2 flex items-end justify-between gap-4">
                {/* Left: Comment & Note & Date */}
                <div className="flex-1 space-y-2 min-w-0">
                    {selectedMoment.note ? (
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-white/50 uppercase tracking-wide">
                                Curator comment:
                            </p>
                            <p className="font-serif italic text-base text-gray-200 leading-snug line-clamp-2">
                                "{selectedMoment.note}"
                            </p>
                        </div>
                    ) : (
                        <div className="h-1" />
                    )}

                    {/* Relative Time */}
                    <p className="text-xs text-white/30 font-mono">
                        {formatRelativeTime(selectedMoment.createdAt)}
                    </p>
                </div>

                {/* Right: Actions Column (Socials + Open Button) */}
                <div className="flex flex-col items-end gap-3 shrink-0">
                    {/* Primary CTA Button */}
                    <Link
                        href={`/room/view?url=${encodeURIComponent(selectedMoment.sourceUrl)}&start=${selectedMoment.startSec}&end=${selectedMoment.endSec}`}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary bg-neutral-900/50 hover:bg-primary/20 transition-all group/btn shadow-lg"
                    >
                        <Play size={14} className="fill-white" />
                        <span className="text-white font-bold text-xs">
                            Open {moments.length} Moment{moments.length !== 1 ? 's' : ''}
                        </span>
                    </Link>

                    {/* Social Actions Row */}
                    <div className="flex items-center gap-1">
                        {/* Like */}
                        <button
                            onClick={handleLike}
                            className={`flex items-center gap-1.5 transition-colors p-2 rounded-lg hover:bg-white/5 ${currentLikeState.isLiked ? 'text-red-500' : 'text-white/60 hover:text-red-500'
                                }`}
                            title="Like this moment"
                        >
                            <Heart
                                size={18}
                                className={currentLikeState.isLiked ? 'fill-current' : ''}
                            />
                            <span className="text-xs font-medium">{currentLikeState.count}</span>
                        </button>

                        {/* Comment */}
                        <button
                            onClick={handleCommentClick}
                            className="flex items-center gap-1.5 text-white/60 hover:text-blue-400 transition-colors p-2 rounded-lg hover:bg-white/5"
                            title="View comments"
                        >
                            <MessageSquare size={18} />
                            <span className="text-xs font-medium">{selectedMoment.replyCount || 0}</span>
                        </button>

                        {/* Share */}
                        <Link
                            href={`/room/view?url=${encodeURIComponent(selectedMoment.sourceUrl)}&start=${selectedMoment.startSec}&end=${selectedMoment.endSec}`}
                            className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
                            title="Share moment"
                        >
                            <Share2 size={18} />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
