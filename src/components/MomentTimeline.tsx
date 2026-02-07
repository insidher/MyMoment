'use client';

import React, { useMemo } from 'react';
import { Moment } from '@/types';

interface MomentTimelineProps {
    duration: number;
    currentTime: number;
    moments: Moment[];
    onSeek: (time: number) => void;
    onMomentClick: (moment: Moment) => void;
}

export default function MomentTimeline({
    duration,
    currentTime,
    moments,
    onSeek,
    onMomentClick,
}: MomentTimelineProps) {
    // Prevent division by zero
    const safeDuration = duration > 0 ? duration : 1;
    const progressPercent = (currentTime / safeDuration) * 100;

    const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = rect.width;
        const percent = Math.max(0, Math.min(1, x / width));
        const time = Math.floor(percent * safeDuration);
        onSeek(time);
    };

    const handleMomentClick = (e: React.MouseEvent, moment: Moment) => {
        e.stopPropagation(); // Prevent triggering the timeline seek
        onMomentClick(moment);
    };

    return (
        <div className="w-full py-2 group cursor-pointer" onClick={handleTimelineClick}>
            {/* Timeline Container */}
            <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">

                {/* Progress Bar */}
                <div
                    className="absolute top-0 left-0 h-full bg-white/30 transition-all duration-200 ease-linear"
                    style={{ width: `${progressPercent}%` }}
                />

                {/* Playhead - Blue Draggable Circle */}
                <div
                    className="absolute w-4 h-4 bg-blue-500 rounded-full ring-2 ring-white shadow-lg z-20 top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing transition-transform hover:scale-110"
                    style={{ left: `${progressPercent}%` }}
                />

                {/* Moments Overlays */}
                {moments.map((moment) => {
                    const startPercent = (moment.startSec / safeDuration) * 100;
                    const endPercent = (moment.endSec / safeDuration) * 100;
                    const widthPercent = Math.max(0.5, endPercent - startPercent); // Ensure at least a sliver is visible

                    return (
                        <div
                            key={moment.id}
                            onClick={(e) => handleMomentClick(e, moment)}
                            className="absolute top-0 h-full bg-orange-500/60 hover:bg-orange-400/80 transition-colors z-10 cursor-pointer"
                            style={{
                                left: `${startPercent}%`,
                                width: `${widthPercent}%`,
                            }}
                            title={moment.note || 'Saved Moment'}
                        />
                    );
                })}
            </div>

            {/* Time Labels (Optional, for better UX) */}
            <div className="flex justify-between text-[10px] text-white/30 mt-1 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                <span>0:00</span>
                <span>{formatTime(duration)}</span>
            </div>
        </div>
    );
}

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
