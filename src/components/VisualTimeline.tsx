'use client';

import { useState, useRef } from 'react';

interface GhostRange {
    startSec: number;
    endSec: number;
}

interface VisualTimelineProps {
    duration: number;
    currentTime: number;
    activeStart: number;
    activeEnd: number;
    ghostRanges?: GhostRange[];
    onSeek?: (time: number) => void;
    className?: string;
}

export default function VisualTimeline({
    duration,
    currentTime,
    activeStart,
    activeEnd,
    ghostRanges = [],
    onSeek,
    className = '',
}: VisualTimelineProps) {
    const trackRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const getTimeFromX = (clientX: number): number => {
        if (!trackRef.current) return 0;
        const rect = trackRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const percent = Math.max(0, Math.min(1, x / rect.width));
        return percent * duration;
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        e.preventDefault();
        setIsDragging(true);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);

        const time = getTimeFromX(e.clientX);
        if (onSeek) onSeek(time);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return;

        const time = getTimeFromX(e.clientX);
        if (onSeek) onSeek(time);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setIsDragging(false);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    };

    // Calculate positions
    const scrubberPercent = (currentTime / duration) * 100;
    const activeStartPercent = (activeStart / duration) * 100;
    const activeWidthPercent = ((activeEnd - activeStart) / duration) * 100;

    return (
        <div className={`relative ${className}`}>
            {/* Base Track */}
            <div
                ref={trackRef}
                className="relative h-2 w-full bg-neutral-800 rounded-full overflow-visible cursor-pointer"
                style={{ touchAction: 'none' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
            >
                {/* Ghost Clusters (Sibling Moments) */}
                {ghostRanges.map((range, idx) => {
                    const startPercent = (range.startSec / duration) * 100;
                    const widthPercent = ((range.endSec - range.startSec) / duration) * 100;

                    return (
                        <div
                            key={idx}
                            className="absolute h-full bg-white/30 rounded-full"
                            style={{
                                left: `${startPercent}%`,
                                width: `${widthPercent}%`,
                            }}
                        />
                    );
                })}

                {/* Active Range */}
                <div
                    className="absolute h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.5)]"
                    style={{
                        left: `${activeStartPercent}%`,
                        width: `${activeWidthPercent}%`,
                    }}
                />

                {/* Blue Dot Scrubber */}
                <div
                    className="absolute w-4 h-4 bg-blue-500 rounded-full ring-2 ring-white shadow-lg z-20 top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing"
                    style={{
                        left: `${scrubberPercent}%`,
                        touchAction: 'none',
                    }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                />
            </div>
        </div>
    );
}
