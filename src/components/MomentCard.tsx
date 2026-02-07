'use client';

import { useState, useRef, useEffect } from 'react';
import { Moment } from '@/types';
import { X, Heart, MessageSquare, Play, Users, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { toggleLike, createComment } from '../../app/actions/moments';
import UserAvatar from './UserAvatar';

interface MomentCardProps {
    moment: Moment;
    onDelete?: (id: string) => void;
    showDelete?: boolean;
    showCommentButton?: boolean;
    onPlayFull?: (moment: Moment) => void;
    onPlayMoment?: (moment: Moment) => void;
    onPauseMoment?: (moment: Moment) => void;
    trackDuration?: number;
    currentTime?: number;
    isActive?: boolean; // Currently playing
    isPlaying?: boolean;
    onToggleReplies?: () => void;
    isRepliesExpanded?: boolean;
    replyCount?: number;
    onReplyClick?: () => void;
    onNewReply?: (parentId: string, reply: any) => void;
}

export default function MomentCard({
    moment: initialMoment,
    onDelete,
    showDelete = true,
    showCommentButton = true,
    onPlayFull,
    onPlayMoment,
    onPauseMoment,
    trackDuration,
    currentTime = 0,
    isActive = false,
    isPlaying = false,
    onToggleReplies,
    isRepliesExpanded = false,
    replyCount: propsReplyCount,
    onReplyClick,
    onNewReply
}: MomentCardProps) {
    const [moment, setMoment] = useState(initialMoment);

    const [imageError, setImageError] = useState(false);
    const [likeCount, setLikeCount] = useState(moment.likeCount || 0);
    const [liked, setLiked] = useState(initialMoment.isLiked || false); // Load from prop
    const [isLiking, setIsLiking] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false); // For animation
    const [isExpanded, setIsExpanded] = useState(false);
    const [showLikesList, setShowLikesList] = useState(false); // Added this line

    // Comment State
    // Prioritize Prop (from Group) > Moment.replyCount (from DB) > Moment.replies.length (local structure)
    const [replyCount, setReplyCount] = useState(propsReplyCount ?? (moment.replyCount || moment.replies?.length || 0));
    const [showCommentInput, setShowCommentInput] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [isPostingComment, setIsPostingComment] = useState(false);

    const MAX_NOTE_LENGTH = 40;

    const router = useRouter();
    const pathname = usePathname();

    // Derive display data from TrackSource or Moment
    const track = moment.trackSource || {
        title: moment.title,
        artist: moment.artist,
        artwork: moment.artwork,
        service: moment.service,
        sourceUrl: moment.sourceUrl,
        durationSec: 0,
    } as any;



    const handleDeleteWrapper = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!onDelete) return;

        // Prompt first!
        if (!confirm("Are you sure you want to delete this moment?")) return;

        // Start animation
        setIsDeleting(true);

        // Wait for animation to finish before notifying parent
        setTimeout(() => {
            onDelete(moment.id);
        }, 300); // match transition duration
    };

    const handleLike = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (isLiking) return;

        console.log('[MomentCard] Like clicked for moment:', moment.id);

        // Optimistic update
        const newLiked = !liked;
        setLiked(newLiked);
        setLikeCount(prev => newLiked ? prev + 1 : prev - 1);
        setIsLiking(true);

        try {
            console.log('[MomentCard] Sending API request...');
            const res = await fetch(`/api/moments/${moment.id}/like`, { method: 'POST' });

            console.log('[MomentCard] API Response status:', res.status);
            const data = await res.json();
            console.log('[MomentCard] API Response body:', data);

            if (data.success) {
                console.log('[MomentCard] Like success. Count:', data.likeCount, 'Liked:', data.liked);
                setLikeCount(data.likeCount);
                setLiked(data.liked);
            } else {
                console.error('[MomentCard] Like API returned failure:', data.error);
                // Revert
                setLiked(!newLiked);
                setLikeCount(prev => newLiked ? prev - 1 : prev + 1);
            }
        } catch (error) {
            console.error('[MomentCard] Like failed with exception:', error);
            setLiked(!newLiked);
            setLikeCount(prev => newLiked ? prev - 1 : prev + 1);
        } finally {
            setIsLiking(false);
        }
    };



    const handlePostComment = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!commentText.trim()) return;

        setIsPostingComment(true);

        try {
            const newComment = await createComment(moment.id, commentText, pathname);

            if (newComment) {
                // Optimistic Update
                setReplyCount(prev => prev + 1);
                setCommentText('');
                setShowCommentInput(false);

                // Notify parent to update state
                if (onNewReply) {
                    onNewReply(moment.id, newComment);
                }
            }
        } catch (error) {
            console.error('Failed to post comment', error);
        } finally {
            setIsPostingComment(false);
        }
    };

    // Click outside handler for Likes Dropdown
    const likesDropdownRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (likesDropdownRef.current && !likesDropdownRef.current.contains(event.target as Node)) {
                setShowLikesList(false);
            }
        }
        if (showLikesList) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showLikesList]);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return h > 0
            ? `${h}h ${m}m ${s}s`
            : `${m}:${s.toString().padStart(2, '0')}`;
    };

    const duration = moment.endSec - moment.startSec;

    // Prepare track object for TrackCard
    const trackCardData = {
        ...track,
        // If image error, clear artwork so TrackCard shows fallback
        artwork: imageError ? undefined : track.artwork,
    };

    // Mini Timeline Calculations
    // Priority: 1) moment's own track duration, 2) trackDuration prop, 3) trackSource.durationSec
    const effectiveDuration = moment.trackDurationSec || trackDuration || track.durationSec || 0;
    const showMiniTimeline = effectiveDuration > 0;
    const startPercent = showMiniTimeline ? (moment.startSec / effectiveDuration) * 100 : 0;
    const widthPercent = showMiniTimeline ? ((moment.endSec - moment.startSec) / effectiveDuration) * 100 : 0;

    // In-Pill Progress Calculation
    let progressPercent = 0;
    if (isActive && currentTime >= moment.startSec && currentTime <= moment.endSec) {
        progressPercent = ((currentTime - moment.startSec) / (moment.endSec - moment.startSec)) * 100;
        progressPercent = Math.max(0, Math.min(100, progressPercent));
    }

    return (
        <div className={`relative group transition-all duration-300 min-w-0 ${isDeleting ? 'scale-90 opacity-0' : 'scale-100 opacity-100'}`}>
            {showCommentInput && (
                <div
                    className="absolute inset-x-0 bottom-0 z-50 bg-black/90 p-2 backdrop-blur-md animate-in slide-in-from-bottom-2 duration-200 border-t border-white/10"
                    onClick={(e) => e.stopPropagation()}
                >
                    <form onSubmit={handlePostComment} className="w-full flex gap-1.5 items-center">
                        <input
                            autoFocus
                            type="text"
                            placeholder="Write a reply..."
                            className="flex-1 bg-white/10 border border-white/10 rounded-full px-3 py-1.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                        />
                        <button
                            type="submit"
                            disabled={isPostingComment || !commentText.trim()}
                            className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send size={12} />
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowCommentInput(false);
                            }}
                            className="p-1.5 text-white/60 hover:text-white"
                        >
                            <X size={14} />
                        </button>
                    </form>
                </div>
            )}

            <div
                className={`glass-panel overflow-hidden hover:bg-white/5 transition-colors relative min-w-0`}
                onClick={() => {
                    if (onPlayFull) {
                        onPlayFull(moment);
                    } else {
                        // FIX: Open external source directly to avoid "White Page" on internal route
                        window.open(moment.sourceUrl, '_blank');
                    }
                }}
            >
                {/* Header Bar - User Info & Actions */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-black/40 border-b border-white/5">
                    {/* User Info - Left */}
                    <div className="flex items-center gap-1.5">
                        <UserAvatar
                            name={moment.user?.name}
                            image={moment.user?.image}
                            size="w-5 h-5"
                        />
                        <span className="text-[11px] font-medium text-white/80">
                            {moment.user?.name || 'Music Lover'} <span className="text-purple-400 font-mono ml-1" title="Debug ID">{moment.id.slice(0, 8)}</span>
                        </span>
                    </div>

                    {/* Actions - Right */}
                    <div className="flex gap-1 pointer-events-auto">
                        {/* Toggle Replies (Stacked Feed) */}
                        {(replyCount > 0) && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onToggleReplies) onToggleReplies();
                                }}
                                className={`p-1 rounded-full bg-black/40 transition-all backdrop-blur-md flex items-center gap-1
                                    ${onToggleReplies ? 'hover:bg-blue-500/20 cursor-pointer' : 'cursor-default opacity-80'}
                                    ${isRepliesExpanded ? 'text-blue-300 bg-blue-500/10' : 'text-blue-200'}
                                `}
                                title={onToggleReplies ? (isRepliesExpanded ? "Hide Replies" : "Show Replies") : `${replyCount} Replies`}
                            >
                                <MessageSquare size={12} className="fill-current" />
                                <span className="text-[9px] font-bold">{replyCount}</span>
                                {onToggleReplies && (isRepliesExpanded ? <ChevronUp size={9} /> : <ChevronDown size={9} />)}
                            </button>
                        )}



                        {/* Comment Button - Text Based */}
                        {showCommentButton && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowCommentInput(!showCommentInput);
                                }}
                                className="p-1 rounded-full bg-black/40 hover:bg-white/10 text-blue-200 transition-colors flex items-center gap-1"
                                title="Add a comment"
                            >
                                <MessageSquare size={12} />
                                <span className="text-[10px] font-medium">Reply</span>
                            </button>
                        )}

                        {/* Like Button with Dropdown */}
                        <div className="relative">
                            <div className="flex items-center gap-0.5">
                                <button
                                    onClick={handleLike}
                                    disabled={isLiking}
                                    className={`p-1 rounded-full bg-black/40 transition-all backdrop-blur-md flex items-center gap-1
                                        ${liked ? 'text-pink-500 hover:bg-pink-500/10' : 'text-white/40 hover:text-pink-400 hover:bg-pink-500/20'}
                                    `}
                                >
                                    <Heart size={12} className={liked ? 'fill-current' : ''} />
                                    {likeCount > 0 ? (
                                        <span className="text-[9px] font-bold">{likeCount}</span>
                                    ) : (
                                        <span className="text-[9px] font-medium opacity-50">0</span>
                                    )}
                                </button>

                                {/* Chevron Trigger - Only show if there are likes */}
                                {likeCount > 0 && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowLikesList(!showLikesList);
                                        }}
                                        className="p-1 hover:bg-white/10 rounded ml-1 text-white/60 hover:text-white transition-colors"
                                        title="See who liked this"
                                    >
                                        <ChevronDown size={10} className={`transition-transform ${showLikesList ? 'rotate-180' : ''}`} />
                                    </button>
                                )}
                            </div>

                            {/* Likes Dropdown */}
                            {showLikesList && likeCount > 0 && (
                                <div
                                    ref={likesDropdownRef}
                                    className="absolute top-full right-0 mt-2 w-48 bg-black/95 backdrop-blur-md border border-white/10 rounded-lg shadow-xl z-50"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="p-2 border-b border-white/10">
                                        <span className="text-xs font-semibold text-white/80">Liked by</span>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto">
                                        {moment.likes && moment.likes.length > 0 ? (
                                            moment.likes.map((like, idx) => (
                                                <Link
                                                    key={idx}
                                                    href={`/profile?id=${like.user_id}`}
                                                    className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors group/user"
                                                    onClick={() => setShowLikesList(false)}
                                                >
                                                    <UserAvatar
                                                        name={like.user.name}
                                                        image={like.user.image}
                                                        size="w-6 h-6"
                                                    />
                                                    <span className="text-xs text-white/90 group-hover/user:text-purple-300 transition-colors">{like.user.name || 'User'}</span>
                                                </Link>
                                            ))
                                        ) : (
                                            <div className="px-3 py-4 text-center">
                                                <span className="text-xs text-white/40 italic">List unavailable</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {showDelete && onDelete && (
                            <button
                                onClick={handleDeleteWrapper}
                                className="p-1 rounded-full bg-black/40 text-white/40 hover:text-white hover:bg-red-500/20 transition-all backdrop-blur-md opacity-0 group-hover:opacity-100"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="p-2.5">
                    {/* Track Info */}
                    <div className="flex items-center gap-2 mb-2 group/track">
                        {/* Service Logo */}
                        {moment.service === 'spotify' && (
                            <svg className="w-4 h-4 flex-shrink-0 opacity-75" viewBox="0 0 24 24" fill="#1DB954">
                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                            </svg>
                        )}
                        {moment.service === 'youtube' && (
                            <svg className="w-4 h-4 flex-shrink-0 opacity-75" viewBox="0 0 24 24" fill="#FF0000">
                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                            </svg>
                        )}

                        {/* Tiny Artwork */}
                        <div className="w-10 h-10 rounded-md bg-black/50 overflow-hidden flex-shrink-0 relative opacity-80 group-hover/track:opacity-100 transition-opacity">
                            {trackCardData.artwork ? (
                                <img src={trackCardData.artwork} alt={trackCardData.title || 'Track artwork'} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-white/20">
                                    <div className="w-4 h-4 rounded-full bg-white/20" />
                                </div>
                            )}
                        </div>

                        {/* Compact Metadata */}
                        <div className="flex-1 min-w-0 flex flex-col justify-center text-xs opacity-60 group-hover/track:opacity-100 transition-opacity">
                            <h3 className="font-bold text-white break-words leading-tight">{trackCardData.title || 'Unknown Title'}</h3>
                            <p className="text-white/60 break-words leading-tight">{trackCardData.artist || 'Unknown Artist'}</p>
                        </div>
                    </div>

                    {/* Note Section - Separate Container */}
                    {moment.note && (
                        <div className="mb-2 p-2 bg-black/20 rounded-lg border border-white/5">
                            <div className="relative">
                                <span className="absolute -top-2 -left-1 text-3xl text-white/10 font-serif leading-none">"</span>
                                <div className="pl-3">
                                    <p className="text-sm font-medium text-white/90 leading-relaxed font-serif italic">
                                        {isExpanded || moment.note.length <= MAX_NOTE_LENGTH
                                            ? moment.note
                                            : `${moment.note.slice(0, MAX_NOTE_LENGTH).trim()}...`}
                                    </p>
                                    {moment.note.length > MAX_NOTE_LENGTH && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsExpanded(!isExpanded);
                                            }}
                                            className="mt-1 inline-flex items-center gap-1 text-[10px] text-white/40 hover:text-white/60 transition-colors"
                                            title={isExpanded ? "Collapse" : "Expand"}
                                        >
                                            {isExpanded ? (
                                                <>
                                                    Show less
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="m18 15-6-6-6 6" />
                                                    </svg>
                                                </>
                                            ) : (
                                                <>
                                                    Show more
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="m6 9 6 6 6-6" />
                                                    </svg>
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}



                    {/* Moment Timeline & Pill */}
                    <div className="mt-0.5 flex flex-col gap-0.5 pointer-events-auto">
                        {/* Full Track Strip (only if duration known) */}
                        {showMiniTimeline ? (
                            <div className="relative w-full mb-1 flex flex-col">
                                {/* Aligned Pill Container (Moved Above) */}
                                <div className="mb-1.5 relative flex items-center justify-between">
                                    <div className="relative flex-1 h-5">
                                        {effectiveDuration === 0 ? (
                                            <div className="absolute bottom-0 left-0 w-full h-full bg-white/5 animate-pulse rounded-full border border-white/10 flex items-center px-3 gap-2">
                                                <div className="w-2 h-2 rounded-full bg-orange-500/40" />
                                                <span className="text-[10px] text-white/20 font-mono italic">Loading duration...</span>
                                            </div>
                                        ) : (
                                            <div
                                                className="absolute bottom-0 whitespace-nowrap"
                                                style={{
                                                    left: `${startPercent}%`,
                                                    transform: `translateX(-${startPercent}%)`
                                                }}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (isActive && isPlaying && onPauseMoment) {
                                                                onPauseMoment(moment);
                                                            } else if (onPlayMoment) {
                                                                onPlayMoment(moment);
                                                            } else {
                                                                router.push(`/room/view?url=${encodeURIComponent(moment.sourceUrl)}&t=${moment.startSec}`);
                                                            }
                                                        }}
                                                        className={`cursor-pointer inline-flex items-center justify-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono min-w-[100px] transition-colors group/pill relative overflow-hidden
                                                        ${isActive
                                                                ? 'bg-orange-500/20 border border-yellow-400 hover:bg-orange-500/30'
                                                                : 'bg-orange-500/20 border border-orange-500/40 hover:bg-orange-500/30'
                                                            }`}
                                                    >
                                                        {/* In-Pill Progress Background */}
                                                        {isActive && (
                                                            <div
                                                                className="absolute inset-y-0 left-0 bg-orange-500/30 z-0 pointer-events-none transition-all duration-100 ease-linear"
                                                                style={{ width: `${progressPercent}%` }}
                                                            />
                                                        )}

                                                        <div className={`relative z-10 flex items-center gap-2 ${isActive ? 'font-bold' : ''}`}>
                                                            {isActive && isPlaying ? (
                                                                <div className="w-2 h-2 flex gap-0.5 items-center justify-center">
                                                                    <div className="w-0.5 h-2 bg-orange-400 rounded-full" />
                                                                    <div className="w-0.5 h-2 bg-orange-400 rounded-full" />
                                                                </div>
                                                            ) : (
                                                                <Play size={10} className="fill-current text-orange-400" />
                                                            )}

                                                            <span className="text-orange-100">
                                                                {formatTime(isActive ? Math.max(currentTime, moment.startSec) : moment.startSec)} → {formatTime(moment.endSec)}
                                                            </span>
                                                            <span className="text-orange-400/60">·</span>
                                                            <span className="text-orange-200">{duration}s</span>
                                                        </div>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Gray Track Bar - Improved Visibility */}
                                <div className="h-1 w-full bg-white/5 rounded-full relative overflow-hidden ring-1 ring-white/5">
                                    {/* Orange Moment Segment */}
                                    <div
                                        className={`absolute inset-y-0 rounded-full transition-colors bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.4)]`}
                                        style={{
                                            left: `${startPercent}%`,
                                            width: `${Math.max(1, widthPercent)}%`
                                        }}
                                    />
                                </div>

                                {/* Time Labels */}
                                <div className="flex justify-between text-[9px] text-white/30 font-mono px-0.5 mt-1 font-medium">
                                    <span>0:00</span>
                                    <span>{formatTime(effectiveDuration)}</span>
                                </div>
                            </div>
                        ) : (
                            // Fallback: Just the pill (centered or left aligned)
                            <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center gap-2 w-full">
                                    {effectiveDuration === 0 ? (
                                        <div className="w-full h-7 bg-white/5 animate-pulse rounded-full border border-white/10 flex items-center px-3 gap-2">
                                            <div className="w-2 h-2 rounded-full bg-orange-500/40" />
                                            <span className="text-[10px] text-white/20 font-mono italic">Loading duration...</span>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (isActive && isPlaying && onPauseMoment) {
                                                    onPauseMoment(moment);
                                                } else if (onPlayMoment) {
                                                    onPlayMoment(moment);
                                                } else {
                                                    router.push(`/room/view?url=${encodeURIComponent(moment.sourceUrl)}&t=${moment.startSec}`);
                                                }
                                            }}
                                            className={`cursor-pointer inline-flex items-center justify-center gap-1 rounded-full px-3 py-1 text-[11px] font-mono min-w-[110px] transition-colors group/pill relative overflow-hidden
                                                ${isActive
                                                    ? 'bg-orange-500/20 border border-yellow-400 hover:bg-orange-500/30'
                                                    : 'bg-orange-500/20 border border-orange-500/40 hover:bg-orange-500/30'
                                                }`}
                                        >
                                            {/* In-Pill Progress Background */}
                                            {isActive && (
                                                <div
                                                    className="absolute inset-y-0 left-0 bg-orange-500/30 z-0 pointer-events-none transition-all duration-100 ease-linear"
                                                    style={{ width: `${progressPercent}%` }}
                                                />
                                            )}

                                            <div className={`relative z-10 flex items-center gap-2 ${isActive ? 'font-bold' : ''}`}>
                                                {isActive && isPlaying ? (
                                                    <div className="w-2 h-2 flex gap-0.5 items-center justify-center">
                                                        <div className="w-0.5 h-2 bg-orange-400 rounded-full" />
                                                        <div className="w-0.5 h-2 bg-orange-400 rounded-full" />
                                                    </div>
                                                ) : (
                                                    <Play size={10} className="fill-current text-orange-400" />
                                                )}
                                                <span className="text-orange-100">
                                                    {formatTime(isActive ? currentTime : moment.startSec)} → {formatTime(moment.endSec)}
                                                </span>
                                                <span className="text-orange-400/60">·</span>
                                                <span className="text-orange-200">{duration}s</span>
                                            </div>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div >
    );
}
