'use client';

import { useState } from 'react';
import { Moment } from '@/types';
import TrackCard from './TrackCard';
import { RefreshCw, X, Heart, MessageSquare, Play } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface MomentCardProps {
    moment: Moment;
    onDelete?: (id: string) => void;
    showDelete?: boolean;
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
    const router = useRouter();

    // Derive display data from TrackSource or Moment
    const track = moment.trackSource || {
        title: moment.title,
        artist: moment.artist,
        artwork: moment.artwork,
        service: moment.service,
        sourceUrl: moment.sourceUrl,
        durationSec: moment.trackSource?.durationSec || 0,
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
        <div className="relative group">
            <TrackCard
                track={trackCardData}
                onClick={() => {
                    if (onPlayFull) {
                        onPlayFull(moment);
                    } else {
                        // Default: Play full track (navigate to room)
                        router.push(`/room/view?url=${encodeURIComponent(moment.sourceUrl)}`);
                    }
                }}
                className="hover:bg-white/5 transition-colors"
            >
                {/* Moment Timeline & Pill */}
                <div className="mt-3 flex flex-col gap-1 pointer-events-auto">
                    {/* Full Track Strip (only if duration known) */}
                    {showMiniTimeline ? (
                        <div className="relative w-full mb-1 flex flex-col">
                            {/* Aligned Pill Container (Moved Above) */}
                            <div className="mb-2 relative flex items-center justify-between">
                                <div className="relative flex-1">
                                    <div
                                        className="inline-block"
                                        style={{
                                            marginLeft: `${Math.min(Math.max(0, startPercent - 10), 80)}%` // Clamp to keep inside
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

                    {/* Comment Button (if note exists) */}
                    {moment.note && (
                        <div className="absolute bottom-3 right-3 z-20">
                            <button
                                className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-purple-300 hover:text-purple-200 transition-colors"
                                title={moment.note}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    alert(moment.note);
                                }}
                            >
                                <MessageSquare size={14} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Actions (Top Right) */}
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                    {needsRefresh && (
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className={`p-2 rounded-full bg-black/40 text-white hover:bg-white/20 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
                            title="Refresh metadata"
                        >
                            <RefreshCw size={14} />
                        </button>
                    )}

                    {/* Like Button (Stub) */}
                    <button className="p-2 rounded-full bg-black/40 text-white hover:bg-pink-500/50 transition-all">
                        <Heart size={14} />
                    </button>

                    {showDelete && onDelete && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(moment.id);
                            }}
                            className="p-2 rounded-full bg-black/40 text-white hover:bg-red-500/50 transition-all"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </TrackCard>
        </div>
    );
}
