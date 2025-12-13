'use client';

import { useState } from 'react';
import { Moment } from '@/types';
import { RefreshCw, X, Heart, MessageSquare, Play, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

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
    isPlaying = false
}: MomentCardProps) {
    const [moment, setMoment] = useState(initialMoment);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [likeCount, setLikeCount] = useState(moment.likeCount || 0);
    const [liked, setLiked] = useState(initialMoment.isLiked || false); // Load from prop
    const [isLiking, setIsLiking] = useState(false);
    const [showForkInput, setShowForkInput] = useState(false);
    const [forkNote, setForkNote] = useState('');
    const [isForking, setIsForking] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false); // For animation
    const [isExpanded, setIsExpanded] = useState(false);
    const MAX_NOTE_LENGTH = 40;

    const router = useRouter();

    // Derive display data from TrackSource or Moment
    const track = moment.trackSource || {
        title: moment.title,
        artist: moment.artist,
        artwork: moment.artwork,
        service: moment.service,
        sourceUrl: moment.sourceUrl,
        durationSec: (moment.trackSource as any)?.durationSec || 0,
    } as any;

    // Check if we need refresh
    const needsRefresh = !track.artist || !track.artwork || !track.durationSec || imageError;

    const handleRefresh = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsRefreshing(true);
        try {
            const res = await fetch(`/api/moments/${moment.id}/refresh`, { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.moment) {
                    setMoment(data.moment);
                    setImageError(false);
                }
            }
        } catch (error) {
            console.error('Failed to refresh moment:', error);
        } finally {
            setIsRefreshing(false);
        }
    };

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

        // Optimistic update
        const newLiked = !liked;
        setLiked(newLiked);
        setLikeCount(prev => newLiked ? prev + 1 : prev - 1);
        setIsLiking(true);

        try {
            const res = await fetch(`/api/moments/${moment.id}/like`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                setLikeCount(data.likeCount);
                setLiked(data.liked);
            } else {
                // Revert
                setLiked(!newLiked);
                setLikeCount(prev => newLiked ? prev - 1 : prev + 1);
            }
        } catch (error) {
            console.error('Like failed', error);
            setLiked(!newLiked);
            setLikeCount(prev => newLiked ? prev - 1 : prev + 1);
        } finally {
            setIsLiking(false);
        }
    };

    const handleFork = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!forkNote.trim()) return;
        setIsForking(true);

        try {
            const res = await fetch('/api/moments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourceUrl: moment.sourceUrl,
                    service: moment.service,
                    startSec: moment.startSec,
                    endSec: moment.endSec,
                    note: forkNote,
                })
            });

            if (res.ok) {
                const data = await res.json();
                alert('Saved to your profile!');
                setShowForkInput(false);
                setForkNote('');
                // If we want to update the community count immediately:
                setMoment(prev => ({
                    ...prev,
                    savedByCount: (prev.savedByCount || 1) + 1
                }));
            } else {
                alert('Failed to save moment.');
            }
        } catch (error) {
            console.error('Fork failed', error);
        } finally {
            setIsForking(false);
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const duration = moment.endSec - moment.startSec;

    // Prepare track object for TrackCard
    const trackCardData = {
        ...track,
        // If image error, clear artwork so TrackCard shows fallback
        artwork: imageError ? undefined : track.artwork,
    };

    // Mini Timeline Calculations
    const showMiniTimeline = trackDuration && trackDuration > 0;
    const startPercent = showMiniTimeline ? (moment.startSec / trackDuration!) * 100 : 0;
    const widthPercent = showMiniTimeline ? ((moment.endSec - moment.startSec) / trackDuration!) * 100 : 0;

    // In-Pill Progress Calculation
    let progressPercent = 0;
    if (isActive && currentTime >= moment.startSec && currentTime <= moment.endSec) {
        progressPercent = ((currentTime - moment.startSec) / (moment.endSec - moment.startSec)) * 100;
        progressPercent = Math.max(0, Math.min(100, progressPercent));
    }

    return (
        <div className={`relative group transition-all duration-300 ${isDeleting ? 'scale-90 opacity-0' : 'scale-100 opacity-100'}`}>
            {showForkInput && (
                <div className="absolute inset-0 z-50 bg-black/90 rounded-xl flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
                    <form onSubmit={handleFork} className="w-full flex gap-2">
                        <input
                            autoFocus
                            type="text"
                            placeholder="Add a note..."
                            className="flex-1 bg-white/10 border border-white/10 rounded-full px-4 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                            value={forkNote}
                            onChange={(e) => setForkNote(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                        <button
                            type="submit"
                            disabled={isForking}
                            className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-4 text-xs font-bold transition-colors disabled:opacity-50"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {isForking ? 'Saving...' : 'Save'}
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowForkInput(false);
                            }}
                            className="p-2 text-white/60 hover:text-white"
                        >
                            <X size={16} />
                        </button>
                    </form>
                </div>
            )}

            <div
                className={`glass-panel p-4 block overflow-hidden hover:bg-white/5 transition-colors relative ${moment.note ? 'pt-6' : 'pt-4'}`}
                onClick={() => {
                    if (onPlayFull) {
                        onPlayFull(moment);
                    } else {
                        // Default: Play full track (navigate to room)
                        router.push(`/room/view?url=${encodeURIComponent(moment.sourceUrl)}`);
                    }
                }}
            >
                {/* Note Section (Hero) */}
                {moment.note && (
                    <div className="mb-4 relative z-10">
                        <div className="relative">
                            <span className="absolute -top-3 -left-1 text-4xl text-white/10 font-serif leading-none">“</span>
                            <div className="pl-3">
                                <p className="text-lg font-medium text-white/90 leading-relaxed font-serif italic inline">
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
                                        className="ml-2 inline-flex items-center justify-center p-1 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all align-middle"
                                        title={isExpanded ? "Collapse" : "Expand"}
                                    >
                                        {isExpanded ? (
                                            // Chevron Up
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="m18 15-6-6-6 6" />
                                            </svg>
                                        ) : (
                                            // Chevron Down
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="m6 9 6 6 6-6" />
                                            </svg>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Track Info (Deprioritized) */}
                <div className="flex items-center gap-3 mb-4 group/track">
                    {/* Tiny Artwork */}
                    <div className="w-10 h-10 rounded-md bg-black/50 overflow-hidden flex-shrink-0 relative opacity-80 group-hover/track:opacity-100 transition-opacity">
                        {trackCardData.artwork ? (
                            <img src={trackCardData.artwork} alt={trackCardData.title || 'Track artwork'} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/20">
                                {/* Fallback Icon was Music before, can import or skip */}
                                <div className="w-4 h-4 rounded-full bg-white/20" />
                            </div>
                        )}
                    </div>

                    {/* Compact Metadata */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center text-xs opacity-60 group-hover/track:opacity-100 transition-opacity">
                        <h3 className="font-bold truncate text-white">{trackCardData.title || 'Unknown Title'}</h3>
                        <p className="text-white/60 truncate">{trackCardData.artist || 'Unknown Artist'}</p>
                    </div>
                </div>

                {/* Moment Timeline & Pill */}
                <div className="mt-1 flex flex-col gap-1 pointer-events-auto">
                    {/* Full Track Strip (only if duration known) */}
                    {showMiniTimeline ? (
                        <div className="relative w-full mb-1 flex flex-col">
                            {/* Aligned Pill Container (Moved Above) */}
                            <div className="mb-2 relative flex items-center justify-between">
                                <div className="relative flex-1 h-7">
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
                                                        {formatTime(isActive ? Math.max(currentTime, moment.startSec) : moment.startSec)} → {formatTime(moment.endSec)}
                                                    </span>
                                                    <span className="text-orange-400/60">·</span>
                                                    <span className="text-orange-200">{duration}s</span>
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Gray Track Bar */}
                            <div className="h-1.5 w-full bg-white/10 rounded-full relative overflow-hidden">
                                {/* Orange Moment Segment */}
                                <div
                                    className={`absolute inset-y-0 rounded-full transition-colors bg-orange-500`}
                                    style={{
                                        left: `${startPercent}%`,
                                        width: `${Math.max(1, widthPercent)}%`
                                    }}
                                />
                            </div>

                            {/* Time Labels */}
                            <div className="flex justify-between text-[11px] text-white/40 font-mono px-1 mt-1">
                                <span>0:00</span>
                                <span>{formatTime(trackDuration!)}</span>
                            </div>
                        </div>
                    ) : (
                        // Fallback: Just the pill (centered or left aligned)
                        <div className="flex items-center justify-between mt-2">
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
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions (Top Right) */}
                <div className="absolute top-2 right-2 flex gap-1.5 pointer-events-auto">
                    {needsRefresh && (
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className={`p-1.5 rounded-full bg-black/40 text-white/50 hover:text-white hover:bg-white/10 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
                            title="Refresh metadata"
                        >
                            <RefreshCw size={14} />
                        </button>
                    )}

                    {/* Comment/Fork Button */}
                    {showCommentButton && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowForkInput(true);
                            }}
                            className={`p-1.5 rounded-full bg-black/40 transition-all backdrop-blur-md flex items-center gap-1.5
                             hover:text-blue-300 hover:bg-blue-500/20
                             ${(moment.savedByCount || 0) > 0 ? 'text-blue-200' : 'text-white/40'}
                        `}
                            title="Comment / Save to your profile"
                        >
                            <MessageSquare size={14} className={(moment.savedByCount || 0) > 0 ? 'fill-current' : ''} />
                            {(moment.savedByCount || 0) > 0 ? (
                                <span className="text-[10px] font-bold">{moment.savedByCount}</span>
                            ) : (
                                <span className="text-[10px] font-medium opacity-50">0</span>
                            )}
                        </button>
                    )}

                    {/* Like Button */}
                    <button
                        onClick={handleLike}
                        disabled={isLiking}
                        className={`p-1.5 rounded-full bg-black/40 transition-all backdrop-blur-md flex items-center gap-1.5
                            ${liked ? 'text-pink-500 hover:bg-pink-500/10' : 'text-white/40 hover:text-pink-400 hover:bg-pink-500/20'}
                        `}
                    >
                        <Heart size={14} className={liked ? 'fill-current' : ''} />
                        {likeCount > 0 ? (
                            <span className="text-[10px] font-bold">{likeCount}</span>
                        ) : (
                            <span className="text-[10px] font-medium opacity-50">0</span>
                        )}
                    </button>

                    {showDelete && onDelete && (
                        <button
                            onClick={handleDeleteWrapper}
                            className="p-1.5 rounded-full bg-black/40 text-white/40 hover:text-white hover:bg-red-500/20 transition-all backdrop-blur-md opacity-0 group-hover:opacity-100"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
