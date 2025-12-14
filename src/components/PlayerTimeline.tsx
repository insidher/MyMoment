import React, { useState, useEffect, useRef } from 'react';
import { Moment } from '@/types';
import { Chapter } from '@/lib/chapters';
import { Plus, Square, Volume2, X, Star, Check, MessageSquare, Play, Pause, Trash2 } from 'lucide-react';

interface PlayerTimelineProps {
    currentTime: number;
    duration: number;
    moments: Moment[];
    onSeek: (time: number) => void;
    onMomentClick: (moment: Moment) => void;
    startSec?: number | null;
    endSec?: number | null;
    onCaptureStart?: (time: number) => void;
    onCaptureEnd?: (time: number) => void;
    onCaptureUpdate?: (start: number | null, end: number | null) => void;
    activeMomentId?: string;
    chapters?: Chapter[];
    onChapterClick?: (chapter: Chapter, nextChapterStart?: number) => void;
    isPlaying?: boolean;
    note?: string;
    onNoteChange?: (note: string) => void;
    onSaveMoment?: () => void;
    onCancelCapture?: () => void;
    onPreviewCapture?: () => void;
}

export default function PlayerTimeline({
    currentTime,
    duration,
    moments,
    onSeek,
    onMomentClick,
    startSec = null,
    endSec = null,
    onCaptureStart,
    onCaptureEnd,
    onCaptureUpdate,
    activeMomentId,
    chapters = [],
    onChapterClick,
    isPlaying = false,
    note = '',
    onNoteChange,
    onSaveMoment,
    onCancelCapture,
    onPreviewCapture
}: PlayerTimelineProps) {
    const [isHovering, setIsHovering] = useState(false);
    const [hoverTime, setHoverTime] = useState<number | null>(null);
    const [draggingMarker, setDraggingMarker] = useState<'start' | 'end' | 'range' | null>(null);
    const [dragStartMouseX, setDragStartMouseX] = useState<number | null>(null); // To detect click vs drag
    const [isHoveringButton, setIsHoveringButton] = useState(false);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [isHoveringRange, setIsHoveringRange] = useState(false);

    const [showFloatingBtn, setShowFloatingBtn] = useState(false);
    const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
    const leaveTimerRef = useRef<NodeJS.Timeout | null>(null);
    const dragStartXRef = useRef<number>(0);
    const dragStartTimeRef = useRef<{ start: number, end: number } | null>(null);

    const timelineRef = useRef<HTMLDivElement>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const safeDuration = duration > 0 ? duration : 1;

    // Helper: calc time from mouse x
    const getTimeFromX = (clientX: number) => {
        if (!timelineRef.current) return 0;
        const rect = timelineRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const width = rect.width;
        const percent = Math.max(0, Math.min(1, x / width));
        return Math.floor(percent * safeDuration);
    };

    // Global Drag Handlers
    useEffect(() => {
        if (!draggingMarker) return;

        const handleMouseMove = (e: MouseEvent) => {
            const time = getTimeFromX(e.clientX);
            if (draggingMarker === 'start') {
                // Constrain: start < end (if end exists)
                if (endSec !== null && time >= endSec) return;
                onCaptureUpdate?.(time, endSec); // Keep end
            } else if (draggingMarker === 'end') {
                // Constrain: end > start
                if (startSec !== null && time <= startSec) return;
                onCaptureUpdate?.(startSec, time); // Keep start
            } else if (draggingMarker === 'range' && dragStartTimeRef.current && startSec !== null && endSec !== null) {
                // Determine delta
                const initialTime = getTimeFromX(dragStartXRef.current);
                const newTime = getTimeFromX(e.clientX);
                const delta = newTime - initialTime;

                // Calculate proposed new times
                let newStart = dragStartTimeRef.current.start + delta;
                let newEnd = dragStartTimeRef.current.end + delta;

                // Clamp to bounds
                if (newStart < 0) {
                    const diff = 0 - newStart;
                    newStart = 0;
                    newEnd += diff;
                }
                const trackDuration = safeDuration;
                if (newEnd > trackDuration) {
                    const diff = newEnd - trackDuration;
                    newEnd = trackDuration;
                    newStart -= diff;
                }

                onCaptureUpdate?.(newStart, newEnd);
            }
        };

        const handleMouseUp = () => {
            setDraggingMarker(null);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [draggingMarker, safeDuration, startSec, endSec, onCaptureUpdate]);

    // Handle hover delay for button
    useEffect(() => {
        if (isHovering) {
            hoverTimerRef.current = setTimeout(() => {
                setShowFloatingBtn(true);
            }, 1000);
        } else {
            if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
            setShowFloatingBtn(false);
        }

        return () => {
            if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        };
    }, [isHovering]);

    // Derived Logic for Floating Button
    const getButtonState = () => {
        if (!isHovering && !hoverTime) return null;
        const time = hoverTime || 0; // Cursor time

        // 1. Idle (No Start Set) -> "Start Moment"
        if (startSec === null) {
            return { label: 'Start Moment', action: 'start', time };
        }

        // 2. Recording (Start Set, No End Set)
        if (startSec !== null && endSec === null) {
            // If hovering near Playhead (within 2s) OR hovering strictly before playhead (logic check)
            // User requested: "Recording [Time]" (Stop) if hovering playhead
            // User requested: "Set End" if hovering future

            // Actually, simpler logic:
            // If cursor is > startSec?
            if (time > startSec) {
                // If cursor is close to Current Time (within 5s window maybe?), show STOP
                // Or if user hovers specifically the "Recording" bar?
                // Let's use a proximity check or just simple logic:
                // If cursor > playbackState.current (future), show "Set End"
                // If cursor is around playbackState.current (live), show "Recording..."

                // Let's try: if cursor is near Playhead (±2s) AND PLAYING, assume they want to stop LIVE recording
                if (isPlaying && Math.abs(time - currentTime) <= 3) {
                    return { label: `Recording ${formatTime(currentTime - startSec)}`, action: 'stop', time: currentTime };
                }
                // Else if cursor is in future relative to playhead? "Set End"
                // Actually user said: "Recording button ... acts as Stop Recording"
                // And "Move to future ... Set End"
                return { label: 'Set End', action: 'end', time: time };
            }
        }

        return null;
    };

    const buttonState = getButtonState();

    return (
        <div className="space-y-2 relative">
            <div
                className="glass-panel px-4 py-3 flex items-center gap-3 relative group/timeline select-none"
            >
                <span className="text-xs font-mono text-white/60 w-10 text-right">
                    {formatTime(currentTime)}
                </span>


                {/* Main Track Area */}
                <div
                    ref={timelineRef}
                    className="flex-1 h-3 relative cursor-pointer" // made taller (h-3) for easier interaction
                    onMouseEnter={() => {
                        setIsHovering(true);
                        if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
                    }}
                    onMouseLeave={() => {
                        // Delay leaving to allow bridging to button
                        leaveTimerRef.current = setTimeout(() => {
                            setIsHovering(false);
                            setHoverTime(null);
                        }, 300);
                    }}
                    onMouseMove={(e) => {
                        // Use timelineRef for consistent calculation
                        if (!timelineRef.current) return;
                        const rect = timelineRef.current.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const width = rect.width;
                        const percent = Math.max(0, Math.min(1, x / width));
                        setHoverTime(Math.floor(percent * safeDuration));
                    }}
                    onClick={(e) => {
                        // Fallback seek
                        const time = getTimeFromX(e.clientX);
                        onSeek(time);
                    }}
                >
                    {/* Track Background */}
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        {/* Green Progress */}
                        <div
                            className="h-full bg-green-500 rounded-full transition-all duration-500 ease-linear relative z-0"
                            style={{ width: `${(currentTime / safeDuration) * 100}%` }}
                        />

                        {/* RED RECORDING STRIP */}
                        {startSec !== null && (
                            <div
                                className={`absolute top-0 bottom-0 z-10 
                                    ${endSec === null ? 'bg-red-500 animate-pulse' : 'bg-red-500/50'} 
                                `}
                                style={{
                                    left: `${(startSec / safeDuration) * 100}%`,
                                    // If endSec exists, go to endSec. Else go to currentTime.
                                    width: `${(((endSec !== null ? endSec : Math.max(startSec, currentTime)) - startSec) / safeDuration) * 100}%`
                                }}
                            />
                        )}

                    </div>

                    {/* Start Marker [ */}
                    {startSec !== null && (
                        <>
                            {/* Clickable New Moment Range (only when End is Set) */}
                            {endSec !== null && (
                                <div
                                    className="absolute top-0 bottom-0 z-15 bg-orange-500/10 border-x border-orange-500/30 cursor-pointer hover:bg-orange-500/20 transition-colors flex items-center justify-center group/range"
                                    style={{
                                        left: `${(startSec / safeDuration) * 100}%`,
                                        width: `${((endSec - startSec) / safeDuration) * 100}%`
                                    }}
                                    onMouseDown={(e) => {
                                        // If clicking the Badge, ignore drag logic (let bubble to Badge onClick?)
                                        // Actually Badge is a child, but we can check target
                                        // But if we put onClick on Badge, we need to stop propagation there?
                                        // Let's Handle Drag Start
                                        e.preventDefault(); // Prevent text selection
                                        // e.stopPropagation(); // DO NOT STOP PROPAGATION if we want click-through? 
                                        // actually we need to stop bubbling to "Track Area" to prevent seek-on-down.
                                        e.stopPropagation();

                                        setDraggingMarker('range');
                                        setDragStartMouseX(e.clientX);
                                        dragStartXRef.current = e.clientX;
                                        dragStartTimeRef.current = { start: startSec, end: endSec };
                                    }}
                                    onMouseEnter={() => setIsHoveringRange(true)}
                                    onMouseLeave={() => setIsHoveringRange(false)}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        // Detect Click vs Drag
                                        if (dragStartMouseX && Math.abs(e.clientX - dragStartMouseX) < 5) {
                                            // Is Click -> Seek
                                            const time = getTimeFromX(e.clientX);
                                            onSeek(time);
                                        }
                                        setDragStartMouseX(null);
                                    }}
                                >
                                    {!isEditorOpen && (
                                        <div
                                            // Always Centered In-Range
                                            className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-auto cursor-pointer transition-all duration-200 opacity-0 group-hover/range:opacity-100"
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onPreviewCapture?.();
                                                setIsEditorOpen(true);
                                            }}
                                        >
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-300 whitespace-nowrap">
                                                {((endSec - startSec) / safeDuration) * 100 < 15 ? 'Edit' : 'Edit Moment'}
                                            </span>
                                        </div>
                                    )}

                                </div>
                            )}

                            {/* Start Marker Component */}
                            <div
                                className={`absolute top-1/2 h-5 w-3 cursor-ew-resize z-20 group/marker transition-transform duration-200 
                                    ${(isHoveringRange || draggingMarker) ? 'scale-125' : 'hover:scale-125'}
                                `}
                                style={{ left: `${(startSec / safeDuration) * 100}%`, transform: 'translateX(-50%) translateY(-42%)' }}
                                transform-origin="left center" // Scale form left to allow button to stay inside? No, centered.
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                    setDraggingMarker('start');
                                }}
                            >
                                {/* Bracket Visual */}
                                <div className="absolute inset-0 border-l-2 border-t border-b border-orange-500 rounded-l-sm bg-black/50" />

                                {/* Tiny Orange Play/Pause Button INSIDE Pocket */}
                                <div
                                    className="absolute left-[2px] top-1/2 -translate-y-1/2 pointer-events-auto z-30"
                                    onMouseDown={(e) => e.stopPropagation()}
                                >
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onPreviewCapture?.();
                                        }}
                                        // Small circle, flush inside bracket
                                        className="h-2 w-2 rounded-full flex items-center justify-center text-orange-500 hover:text-orange-300 hover:scale-125 transition-all"
                                        title="Preview"
                                    >
                                        {isPlaying && currentTime >= startSec && (endSec === null || currentTime <= endSec) ?
                                            <Pause size={8} className="fill-current" /> :
                                            <Play size={8} className="fill-current" />
                                        }
                                    </button>
                                </div>

                                {/* Timestamp Popover */}
                                {(isHovering || draggingMarker === 'start') && (
                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 text-[10px] font-mono font-bold bg-orange-500 text-black px-1 rounded opacity-0 group-hover/marker:opacity-100 transition-opacity whitespace-nowrap">
                                        {formatTime(startSec)}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onCaptureUpdate?.(null, endSec || null);
                                                setIsEditorOpen(false); // Close editor if marker removed
                                            }}
                                            className="hover:bg-black/20 rounded-full p-0.5"
                                        >
                                            <X size={8} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* End Marker } */}
                    {endSec !== null && (
                        <div
                            className={`absolute top-1/2 h-5 w-3 cursor-ew-resize z-20 group/marker transition-transform duration-200 
                                ${(isHoveringRange || draggingMarker) ? 'scale-125' : 'hover:scale-125'}
                            `}
                            style={{ left: `${(endSec / safeDuration) * 100}%`, transform: 'translateX(-50%) translateY(-42%)' }}
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                setDraggingMarker('end');
                            }}
                        >
                            <div className="absolute inset-0 border-r-2 border-t border-b border-orange-500 rounded-r-sm bg-black/50" />
                            {(isHovering || draggingMarker !== null) && (
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 text-[10px] font-mono font-bold bg-orange-500 text-black px-1 rounded opacity-0 group-hover/marker:opacity-100 transition-opacity whitespace-nowrap">
                                    {formatTime(endSec)}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onCaptureUpdate?.(startSec || null, null);
                                            setIsEditorOpen(false); // Close editor if marker removed
                                        }}
                                        className="hover:bg-black/20 rounded-full p-0.5"
                                    >
                                        <X size={8} />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}


                    {/* Moments Overlays (Existing) */}
                    {moments.map((moment) => {
                        const startPercent = (moment.startSec / safeDuration) * 100;
                        const endPercent = (moment.endSec / safeDuration) * 100;
                        const widthPercent = Math.max(0.5, endPercent - startPercent);

                        return (
                            <div
                                key={moment.id}
                                className={`absolute top-1/2 -translate-y-1/2 h-4 z-0 bg-orange-500/30 hover:bg-orange-400/50 rounded-sm pointer-events-none transition-opacity duration-300
                                    ${startSec !== null ? 'opacity-30' : 'opacity-100'} 
                                `}
                                // User said "moments overlays" exist. But we are replacing the "Range Selection" tool logic on top.
                                // Actually, moments allow "click to play". Keep interaction but lower Z-index than markers?
                                style={{
                                    left: `${startPercent}%`,
                                    width: `${widthPercent}%`,
                                }}
                            />
                        );
                    })}


                    {/* FLOATING ACTION BUTTON */}
                    {buttonState && !draggingMarker && showFloatingBtn && (
                        <>
                            {/* Faint Vertical Line */}
                            <div
                                className="absolute top-0 bottom-0 w-[1px] bg-white/20 pointer-events-none z-40"
                                style={{ left: `${(buttonState.time / safeDuration) * 100}%` }}
                            />

                            <div
                                className="absolute z-[60] cursor-pointer transition-transform duration-300 ease-out" // pointer-events-auto implicitly
                                onMouseEnter={() => {
                                    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
                                    setIsHovering(true); // Ensure it stays active
                                    setIsHoveringButton(true);
                                }}
                                onMouseLeave={() => {
                                    setIsHoveringButton(false);
                                    leaveTimerRef.current = setTimeout(() => {
                                        setIsHovering(false);
                                        setHoverTime(null);
                                    }, 300);
                                }}
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent Seek
                                    if (buttonState.action === 'start') {
                                        onCaptureStart?.(buttonState.time);
                                    } else if (buttonState.action === 'end') {
                                        onCaptureEnd?.(buttonState.time);
                                    } else if (buttonState.action === 'stop') {
                                        onCaptureEnd?.(buttonState.time);
                                    }
                                }}
                                style={{
                                    left: `${(buttonState.time / safeDuration) * 100}%`,
                                    top: '100%',
                                    // Adjusted Y to ensure pointer touches track bottom (h-3 track)
                                    // 2px ensures tip touches.
                                    transform: `translateX(-50%) translateY(${isHoveringButton ? '-2px' : '2px'})`
                                }}
                            >
                                <div className={`relative
                                    flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold shadow-lg backdrop-blur-md border transition-all duration-300 whitespace-nowrap
                                    ${buttonState.action === 'stop' || buttonState.action === 'end'
                                        ? 'bg-red-500 border-red-400 text-white'
                                        : (isHoveringButton ? 'bg-orange-500 border-orange-400 text-black' : 'bg-white/10 border-white/20 text-white')}
                                `}>
                                    {/* Tic Pointer */}
                                    <div className={`absolute -top-[5px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[5px] transition-colors duration-300
                                        ${buttonState.action === 'stop' || buttonState.action === 'end'
                                            ? 'border-b-red-500'
                                            : (isHoveringButton ? 'border-b-orange-500' : 'border-b-white/20')}
                                    `} />

                                    {buttonState.action === 'start' && <Plus size={10} />}
                                    {buttonState.action === 'stop' && <Square size={8} className="fill-current animate-pulse" />}
                                    {buttonState.action === 'end' && <span className="font-mono">{'}'}</span>}
                                    {buttonState.label}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <span className="text-xs font-mono text-white/60 w-10">
                    {formatTime(duration)}
                </span>
            </div>

            {/* Note Editor Popover */}
            {isEditorOpen && startSec !== null && endSec !== null && (
                <div
                    className="absolute z-50 mt-4 left-1/2 -translate-x-1/2 min-w-[300px]"
                    style={{
                        // Try to position under the range, but keep centered/safe
                    }}
                >
                    <div className="glass-panel p-3 rounded-xl border border-white/10 bg-black/80 shadow-2xl space-y-3 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center justify-between text-xs text-white/50 px-1">
                            <span className="uppercase font-bold tracking-wider text-[10px]">New Moment Note</span>
                            <span className="font-mono">{formatTime(startSec)} - {formatTime(endSec)}</span>
                        </div>

                        <textarea
                            autoFocus
                            value={note}
                            onChange={(e) => onNoteChange?.(e.target.value)}
                            placeholder="What's happening in this moment?"
                            className="w-full h-20 bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-orange-500/50 resize-none scrollbar-thin scrollbar-thumb-white/20"
                        />

                        <div className="flex items-center justify-between gap-2">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setIsEditorOpen(false); // Done
                                    }}
                                    className="p-1.5 rounded-md hover:bg-green-500/20 text-green-400 transition-colors"
                                    title="Done (Keep Draft)"
                                >
                                    <Check size={16} />
                                </button>
                                <button
                                    onClick={() => {
                                        // User said "X for cancel" and "writing captures note".
                                        // So X likely just closes editor.
                                        setIsEditorOpen(false);
                                    }}
                                    className="p-1.5 rounded-md hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                                    title="Close Editor"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Save Button - Context Aware */}
                            {isPlaying && currentTime > endSec && (
                                <button
                                    onClick={() => {
                                        onSaveMoment?.();
                                        setIsEditorOpen(false);
                                    }}
                                    disabled={!note.trim()}
                                    className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed text-black text-xs font-bold rounded-lg shadow-lg shadow-orange-500/20 flex items-center gap-1.5 animate-in slide-in-from-left-2 transition-colors"
                                    title={!note.trim() ? "Add a note first" : "Save Moment"}
                                >
                                    <Star size={12} className={!note.trim() ? "fill-gray-400" : "fill-black"} />
                                    Save Moment
                                </button>
                            )}

                            {/* Delete Button (Trash) - With Confirmation */}
                            <div className="relative ml-2 pl-2 border-l border-white/10">
                                {!showDeleteConfirm ? (
                                    <button
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="p-1.5 rounded-md hover:bg-red-500/20 text-red-500/50 hover:text-red-500 transition-colors"
                                        title="Delete Capture"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-2 animate-in slide-in-from-right-2">
                                        <span className="text-[10px] text-red-400 whitespace-nowrap hidden sm:inline">Sure?</span>
                                        <button
                                            onClick={() => {
                                                onCancelCapture?.();
                                                setIsEditorOpen(false);
                                                setShowDeleteConfirm(false);
                                            }}
                                            className="text-[10px] bg-red-500 text-white px-2 py-1 rounded hover:bg-red-400 font-bold"
                                        >
                                            Delete
                                        </button>
                                        <button
                                            onClick={() => setShowDeleteConfirm(false)}
                                            className="text-[10px] text-white/50 hover:text-white px-1"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    {/* Tick pointing up to range */}
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-black/80" />
                </div>
            )}

            {/* Unified Labels (Chapters & Moments) */}
            {(() => {
                // Grouping Logic
                const groups: { time: number; chapter?: Chapter; moment?: Moment; labelWidth?: number }[] = [];
                const THRESHOLD = 1; // Seconds to group by

                // Add Chapters
                chapters.forEach(ch => {
                    groups.push({ time: ch.startSec, chapter: ch });
                });

                // Add or Merge Moments
                moments.forEach(m => {
                    const existing = groups.find(g => Math.abs(g.time - m.startSec) <= THRESHOLD);
                    if (existing) {
                        existing.moment = m; // Attach to existing group (prioritize chapter time)
                    } else {
                        groups.push({ time: m.startSec, moment: m });
                    }
                });

                // Sort by time
                groups.sort((a, b) => a.time - b.time);

                if (groups.length === 0) return null;

                // Smart Packing Logic (Greedy)
                // Track where the last item in a row ended (as a percentage)
                let row1End = -10;
                // let row2End = -10; // For future expansion

                // Estimated width of a label in % (conservative estimate to avoid overlap)
                // A typical label might be 80-120px. On a 1000px timeline, that's 8-12%.
                // Let's use 12% as a buffer.
                const LABEL_BUFFER = 12;

                const packedGroups = groups.map(group => {
                    const isRow1 = ((group.time / safeDuration) * 100) > (row1End + 1); // +1% gap

                    if (isRow1) {
                        row1End = ((group.time / safeDuration) * 100) + LABEL_BUFFER;
                    }
                    // If not row1, it effectively falls to row 2. 
                    // We don't strictly track row2End yet as we only have 2 inactive rows.

                    return { ...group, assignedRow: isRow1 ? 1 : 2 };
                });


                return (
                    <div className="relative h-10 w-full">
                        {packedGroups.map((group, i) => {
                            if (group.time === 0) return null;
                            const left = (group.time / safeDuration) * 100;
                            if (left > 100) return null;

                            // Check if this group contains the active moment based on PLAYHEAD INTERSECTION
                            const isActiveGroup = group.moment && (
                                activeMomentId === group.moment.id ||
                                (currentTime >= group.moment.startSec && currentTime < group.moment.endSec)
                            );

                            // ROW LOGIC:
                            // Active -> Row 0 (Special Floating State)
                            // Inactive -> Use Packed Row (1 or 2)
                            const row = isActiveGroup ? 0 : group.assignedRow;

                            // Vertical Offset (Top)
                            // Row 0 (Active): top-2 (High priority, close)
                            // Row 1: top-3.5 (Standard)
                            // Row 2: top-10 (Overflow)
                            // TIGHTER SPACING as requested
                            const topPos = row === 0 ? 'top-1' : row === 1 ? 'top-3.5' : 'top-9';

                            // Z-index
                            const zIndex = isActiveGroup ? 50 : 30 - row;

                            return (
                                <div
                                    key={i}
                                    className={`absolute transform group/label hover:z-50 transition-all duration-300 ${topPos} ${isActiveGroup ? 'scale-105' : ''}`}
                                    style={{
                                        left: `${left}%`,
                                        zIndex,
                                        transform: 'translateX(0)' // Pinned Left
                                    }}
                                >
                                    <div className="flex flex-row items-stretch">
                                        {/* BRACKET LINE (Left Side) */}
                                        <div
                                            className={`w-[1px] mr-1.5 transition-colors
                                                ${isActiveGroup ? 'bg-orange-500' : 'bg-white/20 group-hover:bg-white/50'}
                                            `}
                                        />

                                        {/* Stacked Labels Container */}
                                        <div className={`flex flex-col items-start gap-0.5 py-0.5 ${isActiveGroup ? 'drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]' : ''}`}>
                                            {/* Chapter Label (Green) */}
                                            {group.chapter && (
                                                <span
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onSeek(group.chapter!.startSec);
                                                    }}
                                                    className={`text-[10px] whitespace-nowrap px-1.5 py-0.5 transition-all cursor-pointer border
                                                    bg-black
                                                    ${isActiveGroup
                                                            ? 'text-green-300 font-bold border-green-500/50 rounded-md'
                                                            : 'text-green-400/70 border-green-900/30 rounded-sm'}
                                                    hover:text-green-300 hover:font-bold hover:border-green-400/50 hover:scale-105`}
                                                >
                                                    {group.chapter.title}
                                                </span>
                                            )}

                                            {/* Moment Label (Orange) */}
                                            {group.moment && (
                                                <span
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onMomentClick(group.moment!);
                                                    }}
                                                    className={`text-[10px] whitespace-nowrap px-1.5 py-0.5 transition-all cursor-pointer border flex items-center gap-1
                                                    bg-black
                                                    ${isActiveGroup
                                                            ? 'text-orange-300 font-bold border-orange-500/50 rounded-md'
                                                            : 'text-orange-400/70 border-orange-900/30 rounded-sm'}
                                                    hover:text-orange-300 hover:font-bold hover:border-orange-400/50 hover:scale-105`}
                                                >
                                                    {isActiveGroup && group.moment && (
                                                        <Volume2 size={8} className="text-orange-300" />
                                                    )}
                                                    {group.moment.note || 'Moment'}
                                                    {isActiveGroup && group.moment && (
                                                        <Star size={8} className="fill-orange-300 text-orange-300 ml-0.5" />
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );
            })()}
        </div>
    );
}
