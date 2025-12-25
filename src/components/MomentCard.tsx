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
        durationSec: 0,
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
    const effectiveDuration = trackDuration || track.durationSec || 0;
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
                className={`glass-panel overflow-hidden hover:bg-white/5 transition-colors relative`}
                onClick={() => {
                    if (onPlayFull) {
                        onPlayFull(moment);
                    } else {
                        // Default: Play full track (navigate to room)
                        router.push(`/room/view?url=${encodeURIComponent(moment.sourceUrl)}`);
                    }
                }}
            >
                {/* Header Bar - User Info & Actions */}
                <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-b border-white/5">
                    {/* User Info - Left */}
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-[10px] font-bold shrink-0 overflow-hidden">
                            {moment.user?.image ? (
                                <img src={moment.user.image} alt={moment.user?.name || 'User'} className="w-full h-full object-cover" />
                            ) : (
                                (moment.user?.name?.[0] || 'M')
                            )}
                        </div>
                        <span className="text-xs font-medium text-white/80">
                            {moment.user?.name || 'Music Lover'}
                        </span>
                    </div>

                    {/* Actions - Right */}
                    <div className="flex gap-1.5 pointer-events-auto">
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

                {/* Main Content Area */}
                <div className="p-4">
                    {/* Track Info */}
                    <div className="flex items-center gap-3 mb-3 group/track">
                        {/* Service Logo */}
                        {moment.service === 'spotify' && (
                            <svg className="w-5 h-5 flex-shrink-0 opacity-75" viewBox="0 0 24 24" fill="#1DB954">
                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                            </svg>
                        )}
                        {moment.service === 'youtube' && (
                            <svg className="w-5 h-5 flex-shrink-0 opacity-75" viewBox="0 0 24 24" fill="#FF0000">
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
                            <h3 className="font-bold truncate text-white">{trackCardData.title || 'Unknown Title'}</h3>
                            <p className="text-white/60 truncate">{trackCardData.artist || 'Unknown Artist'}</p>
                        </div>
                    </div>

                    {/* Note Section - Separate Container */}
                    {moment.note && (
                        <div className="mb-3 p-3 bg-black/20 rounded-lg border border-white/5">
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
                    <div className="mt-1 flex flex-col gap-1 pointer-events-auto">
                        {/* Full Track Strip (only if duration known) */}
                        {showMiniTimeline ? (
                            <div className="relative w-full mb-1 flex flex-col">
                                {/* Aligned Pill Container (Moved Above) */}
                                <div className="mb-2 relative flex items-center justify-between">
                                    <div className="relative flex-1 h-7">
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
                                        )}
                                    </div>
                                </div>

                                {/* Gray Track Bar - Improved Visibility */}
                                <div className="h-1.5 w-full bg-white/5 rounded-full relative overflow-hidden ring-1 ring-white/5">
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
                                <div className="flex justify-between text-[10px] text-white/30 font-mono px-0.5 mt-1.5 font-medium">
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
        </div>
    );
}
