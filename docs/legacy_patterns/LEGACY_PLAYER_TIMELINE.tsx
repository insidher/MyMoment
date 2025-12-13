import React, { useState, useEffect, useRef } from 'react';
import { Moment } from '@/types';
import { Plus, Square, Disc } from 'lucide-react';

interface PlayerTimelineProps {
    currentTime: number;
    duration: number;
    moments: Moment[];
    onSeek: (time: number) => void;
    onMomentClick: (moment: Moment) => void;
    captureState: 'idle' | 'start-captured' | 'end-captured';
    onSmartCapture: () => void;
    activeMomentId?: string;
}

export default function PlayerTimeline({
    currentTime,
    duration,
    moments,
    onSeek,
    onMomentClick,
    captureState,
    onSmartCapture,
    activeMomentId
}: PlayerTimelineProps) {
    const [isHovering, setIsHovering] = useState(false);
    const [showCaptureBtn, setShowCaptureBtn] = useState(false);
    const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const safeDuration = duration > 0 ? duration : 1;

    // Handle hover delay
    useEffect(() => {
        if (isHovering && captureState !== 'end-captured') {
            hoverTimerRef.current = setTimeout(() => {
                setShowCaptureBtn(true);
            }, 500);
        } else {
            if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
            setShowCaptureBtn(false);
        }

        return () => {
            if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        };
    }, [isHovering, captureState]);

    return (
        <div className="space-y-2 relative">
            {/* Recording Indicator */}
            {captureState === 'start-captured' && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-red-500/20 border border-red-500/50 px-3 py-1 rounded-full backdrop-blur-md animate-pulse">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                    <span className="text-xs font-bold text-red-200 uppercase tracking-wider">Recording Moment...</span>
                </div>
            )}

            <div
                className="glass-panel px-4 py-3 flex items-center gap-3 relative group/timeline"
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
            >
                <span className="text-xs font-mono text-white/60 w-10 text-right">
                    {formatTime(currentTime)}
                </span>
                <div className="flex-1 h-1.5 relative cursor-pointer"
                    onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const width = rect.width;
                        const percent = Math.max(0, Math.min(1, x / width));
                        const time = Math.floor(percent * safeDuration);
                        onSeek(time);
                    }}
                >
                    {/* Track & Progress (Masked) */}
                    <div className="absolute inset-0 rounded-full overflow-hidden bg-white/10">
                        <div
                            className="h-full bg-green-500 rounded-full transition-all duration-500 ease-linear relative z-0"
                            style={{ width: `${(currentTime / safeDuration) * 100}%` }}
                        />
                    </div>

                    {/* Moments Overlays (Unmasked, Taller) */}
                    {moments.map((moment) => {
                        const startPercent = (moment.startSec / safeDuration) * 100;
                        const endPercent = (moment.endSec / safeDuration) * 100;
                        const widthPercent = Math.max(0.5, endPercent - startPercent);
                        const isActive = moment.id === activeMomentId;

                        // Calculate progress within the moment
                        let progressPercent = 0;
                        if (isActive && currentTime >= moment.startSec && currentTime <= moment.endSec) {
                            progressPercent = ((currentTime - moment.startSec) / (moment.endSec - moment.startSec)) * 100;
                            progressPercent = Math.max(0, Math.min(100, progressPercent));
                        }

                        return (
                            <div
                                key={moment.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onMomentClick(moment);
                                }}
                                onMouseEnter={() => {
                                    // Prevent capture button from showing when hovering a moment
                                    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
                                    setShowCaptureBtn(false);
                                }}
                                className={`absolute top-1/2 -translate-y-1/2 h-4 transition-all z-10 cursor-pointer rounded-sm 
                                    ${isActive
                                        ? 'bg-orange-500 border border-yellow-400 shadow-md z-30 overflow-hidden'
                                        : 'bg-orange-500/80 hover:bg-orange-400 shadow-sm'
                                    }`}
                                style={{
                                    left: `${startPercent}%`,
                                    width: `${widthPercent}%`,
                                    minWidth: '4px'
                                }}
                                title={moment.note || 'Saved Moment'}
                            >
                                {/* Active Moment Progress Bar */}
                                {isActive && (
                                    <div
                                        className="absolute inset-y-0 left-0 bg-white/30 z-0 pointer-events-none transition-all duration-100 ease-linear"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                )}
                            </div>
                        );
                    })}

                    {/* Inline Capture Button (Centered on Timeline) */}
                    {showCaptureBtn && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 animate-in fade-in zoom-in duration-200">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSmartCapture();
                                }}
                                className={`
                                    flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg backdrop-blur-md border transition-all transform hover:scale-105
                                    ${captureState === 'start-captured'
                                        ? 'bg-red-500/80 border-red-400 text-white hover:bg-red-500'
                                        : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}
                                `}
                            >
                                {captureState === 'start-captured' ? (
                                    <>
                                        <Square size={10} className="fill-current" />
                                        End Moment
                                    </>
                                ) : (
                                    <>
                                        <Plus size={12} />
                                        Start Moment
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
                <span className="text-xs font-mono text-white/60 w-10">
                    {formatTime(duration)}
                </span>
            </div>
        </div>
    );
}
