import React, { useState, useEffect, useRef } from 'react';
import { Moment } from '@/types';
import { Chapter } from '@/lib/chapters';
import { Plus, Square, Volume2, X, Star, Check, MessageSquare, Play, Pause, Trash2, ChevronDown, ChevronUp, Heart, Send, Pencil, Wrench } from 'lucide-react';
import { toggleLike, createComment } from '../../app/actions/moments';
import { usePathname } from 'next/navigation';

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
    currentUser?: any; // Ideally typed but avoiding circular ref or huge import for now
    onUpdateMoment?: (id: string, note: string) => Promise<boolean>;
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
    onPreviewCapture,
    currentUser,
    onUpdateMoment
}: PlayerTimelineProps) {
    const [isHovering, setIsHovering] = useState(false);
    const [expandedMomentId, setExpandedMomentId] = useState<string | null>(null);
    const [editingMomentId, setEditingMomentId] = useState<string | null>(null);
    const [hoverTime, setHoverTime] = useState<number | null>(null);

    // Social State
    const [replyText, setReplyText] = useState('');
    const [isReplying, setIsReplying] = useState(false);
    const [likedStatus, setLikedStatus] = useState<Record<string, { isLiked: boolean; count: number }>>({});
    const pathname = usePathname();

    const getMomentStats = (m: Moment) => {
        return likedStatus[m.id] || { isLiked: !!m.isLiked, count: m.likeCount || 0 };
    };

    const handleLike = async (m: Moment) => {
        const current = getMomentStats(m);
        // Optimistic
        setLikedStatus(prev => ({
            ...prev,
            [m.id]: { isLiked: !current.isLiked, count: current.isLiked ? current.count - 1 : current.count + 1 }
        }));
        try {
            await toggleLike(m.id, pathname);
        } catch (e) {
            // Revert
            setLikedStatus(prev => ({
                ...prev,
                [m.id]: current // Back to original
            }));
            console.error(e);
        }
    };

    const handleSendComment = async (m: Moment) => {
        if (!replyText.trim()) return;
        try {
            await createComment(m.id, replyText, pathname);
            setReplyText('');
            setIsReplying(false);
            // Optionally show success or keep explicit feedback
            // Since it's server action revalidation, it might take a moment to appear if we displayed replies here.
            // But we don't display replies here.
        } catch (e) {
            console.error(e);
        }
    };
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
        // Use local safety
        const effectiveDuration = safeDuration > 1 ? safeDuration : 180;
        return Math.floor(percent * effectiveDuration);
    };

    // State Ref to access latest values in event listeners without re-binding
    const stateRef = useRef({
        startSec,
        endSec,
        draggingMarker,
        duration, // Raw duration
        safeDuration,
        timelineRect: null as DOMRect | null
    });

    // Update ref on every render
    useEffect(() => {
        stateRef.current = {
            startSec,
            endSec,
            draggingMarker,
            duration,
            safeDuration,
            timelineRect: timelineRef.current?.getBoundingClientRect() || null
        };
    }, [startSec, endSec, draggingMarker, duration, safeDuration]);

    // Stabilize callback
    const onCaptureUpdateRef = useRef(onCaptureUpdate);
    useEffect(() => {
        onCaptureUpdateRef.current = onCaptureUpdate;
    }, [onCaptureUpdate]);


    // Global Drag & Hover Handlers (Permanent Listener)
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const { startSec, endSec, draggingMarker, safeDuration } = stateRef.current;

            // Re-implement getTimeFromX inline or using ref data
            let time = 0;
            let width = 0;

            // Always get fresh rect to handle resizes correctly
            const rect = timelineRef.current?.getBoundingClientRect();

            if (rect) {
                const x = e.clientX - rect.left;
                width = rect.width;
                const percent = Math.max(0, Math.min(1, x / width));

                // Fallback: If duration is 0/missing, assume 180s for UI interaction
                const effectiveDuration = safeDuration > 1 ? safeDuration : 180;
                time = Math.floor(percent * effectiveDuration);
            }

            // Store current rect width for range calculation if needed (or just get it fresh there too)
            // For now, let's keep it simple.

            // GLOBAL TRACKING FOR STICKY BRACKET
            if (startSec !== null && endSec === null && !draggingMarker) {
                setHoverTime(time);
            }

            if (draggingMarker === 'start') {
                if (endSec !== null && time >= endSec) return;
                onCaptureUpdateRef.current?.(time, endSec);
            } else if (draggingMarker === 'end') {
                if (startSec !== null && time <= startSec) return;
                onCaptureUpdateRef.current?.(startSec, time);
            } else if (draggingMarker === 'range' && dragStartTimeRef.current && startSec !== null && endSec !== null) {
                // Determine delta
                let initialTime = 0;
                let effectiveDuration = safeDuration > 1 ? safeDuration : 180;

                if (rect) {
                    const width = rect.width;
                    const x = dragStartXRef.current - rect.left;
                    const percent = Math.max(0, Math.min(1, x / width));
                    initialTime = Math.floor(percent * effectiveDuration);
                }

                const delta = time - initialTime;

                // Calculate proposed new times
                let newStart = dragStartTimeRef.current.start + delta;
                let newEnd = dragStartTimeRef.current.end + delta;

                // Clamp to bounds
                if (newStart < 0) {
                    const diff = 0 - newStart;
                    newStart = 0;
                    newEnd += diff;
                }
                const trackDuration = effectiveDuration;
                if (newEnd > trackDuration) {
                    const diff = newEnd - trackDuration;
                    newEnd = trackDuration;
                    newStart -= diff;
                }

                onCaptureUpdateRef.current?.(newStart, newEnd);
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
    }, []); // EMPTY DEPENDENCY ARRAY - Permanent Listeners!

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

        return null; // When capturing, we use the sticky bracket, no floating button
    };

    const buttonState = getButtonState();

    return (
        <div className="space-y-2 relative">
            <div
                className="glass-panel px-4 py-3 flex items-center gap-3 relative group/timeline select-none"
            >
                <span className="text-xs font-mono text-white/60 w-10 text-right">
                    {formatTime(currentTime)}
                    {/* DEBUG: Show Duration */}
                    {/* {duration} */}
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
                        const time = getTimeFromX(e.clientX);

                        // If in Capture Mode (Start Set, End Not Set), THIS CLICK sets the end
                        if (startSec !== null && endSec === null) {
                            // Ensure End > Start
                            if (time > startSec) {
                                onCaptureEnd?.(time);
                            } else {
                                // If they click before start, maybe reset start? Or just ignore/seek?
                                // Let's just seek for now to let them find a new spot, or maybe specific cancel logic?
                                onSeek(time);
                            }
                        } else {
                            // Normal Seek
                            onSeek(time);
                        }
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
                                style={{
                                    left: `${(startSec / safeDuration) * 100}%`,
                                    transform: 'translateX(-50%) translateY(-42%)',
                                    transformOrigin: 'left center'
                                }}
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

                    {/* Sticky End Bracket (During Capture) */}
                    {startSec !== null && endSec === null && hoverTime !== null && (
                        <div
                            className="absolute top-1/2 h-5 w-3 pointer-events-none z-40 transition-transform duration-75 ease-out"
                            style={{
                                left: `${(Math.max(startSec, hoverTime) / safeDuration) * 100}%`,
                                transform: 'translateX(-50%) translateY(-42%)',
                            }}
                        >
                            {/* Visual Component: Orange Close Bracket */}
                            <div className="absolute inset-0 border-r-2 border-t border-b border-orange-500 rounded-r-sm bg-orange-500/10 shadow-[0_0_10px_rgba(249,115,22,0.3)] anim-pulse-border" />

                            {/* Floating "Set End" Label */}
                            <div
                                className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 text-[10px] font-mono font-bold bg-orange-500 text-black px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap animate-in fade-in slide-in-from-top-1 cursor-pointer pointer-events-auto hover:bg-orange-400"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onCaptureEnd?.(Math.max(startSec, hoverTime));
                                }}
                            >
                                <span>Set End</span>
                            </div>
                        </div>
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
            {isEditorOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 p-4 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-2 z-50 min-w-[340px]">
                    <div className="flex flex-col gap-3">
                        {/* Header: User & Context */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {/* User Avatar */}
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-[10px] text-white font-bold overflow-hidden border border-white/20">
                                    {currentUser?.image ? (
                                        <img src={currentUser.image} alt="Me" className="w-full h-full object-cover" />
                                    ) : (
                                        <span>{currentUser?.name?.[0] || 'Me'}</span>
                                    )}
                                </div>
                                <span className="text-xs font-medium text-white/80">{editingMomentId ? 'Editing Moment' : 'New Moment Note'}</span>
                            </div>

                            {/* Inactive Share Button Placeholder */}
                            <button disabled className="p-1.5 rounded-full bg-white/5 opacity-50 cursor-not-allowed text-white/40">
                                <Send size={12} />
                            </button>
                        </div>

                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between text-xs text-white/40 font-mono">
                                <span>{formatTime(startSec || 0)} - {formatTime(endSec || 0)}</span>
                            </div>
                            <textarea
                                autoFocus
                                value={note}
                                onChange={(e) => onNoteChange?.(e.target.value)}
                                placeholder="What's happening in this moment?"
                                className="w-full h-24 bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-orange-500/50 resize-none scrollbar-thin scrollbar-thumb-white/20 font-serif leading-relaxed"
                            />

                            <div className="flex items-center justify-between gap-2 mt-2">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setIsEditorOpen(false);
                                            setEditingMomentId(null);
                                            onCancelCapture?.();
                                        }}
                                        className="p-1.5 rounded-md hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                                        title="Cancel"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                {/* Save/Update Button */}
                                <button
                                    onClick={async () => {
                                        if (editingMomentId) {
                                            // Update Mode
                                            if (onUpdateMoment) {
                                                const success = await onUpdateMoment(editingMomentId, note);
                                                if (success) {
                                                    setIsEditorOpen(false);
                                                    setEditingMomentId(null);
                                                    onCancelCapture?.(); // Clear selection
                                                }
                                            }
                                        } else {
                                            // Create Mode
                                            onSaveMoment?.();
                                            setIsEditorOpen(false);
                                        }
                                    }}
                                    disabled={!note.trim()}
                                    className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed text-black text-xs font-bold rounded-lg shadow-lg shadow-orange-500/20 flex items-center gap-1.5 animate-in slide-in-from-left-2 transition-colors"
                                >
                                    <Star size={12} className={!note.trim() ? "fill-gray-400" : "fill-black"} />
                                    {editingMomentId ? 'Update Moment' : 'Save Moment'}
                                </button>
                            </div>
                        </div>
                    </div>
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
                            const isExpanded = expandedMomentId === group.moment?.id;
                            const zIndex = isExpanded ? 100 : (isActiveGroup ? 50 : 30 - row);

                            // Calculate width available until next marker to prevent overlap
                            const nextGroupTime = packedGroups[i + 1]?.time || safeDuration;
                            const widthToNext = ((nextGroupTime - group.time) / safeDuration) * 100;
                            const maxWidth = Math.max(1, widthToNext - 0.5); // Leave 0.5% gap

                            return (
                                <div
                                    key={i}
                                    className={`absolute transform group/label hover:z-50 transition-all duration-300 ${topPos} ${isActiveGroup ? 'scale-105' : ''}`}
                                    style={{
                                        left: `${left}%`,
                                        zIndex,
                                        transform: 'translateX(0)', // Pinned Left
                                        maxWidth: `${maxWidth}%`, // Enforce constraints
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
                                        <div className={`flex flex-col items-start gap-0.5 py-0.5 min-w-0 ${isActiveGroup ? 'drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]' : ''}`}>
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
                                                <div className="flex flex-col items-start z-50 max-w-full">
                                                    <div
                                                        className={`flex items-center gap-1 transition-all cursor-pointer border px-1.5 py-0.5 max-w-full
                                                            bg-black
                                                            ${(isActiveGroup || expandedMomentId === group.moment.id)
                                                                ? 'text-orange-300 font-bold border-orange-500/50 rounded-md shadow-lg shadow-orange-900/20'
                                                                : 'text-orange-400/70 border-orange-900/30 rounded-sm'
                                                            }
                                                            hover:text-orange-300 hover:font-bold hover:border-orange-400/50 hover:scale-[1.02]`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onMomentClick(group.moment!);
                                                        }}
                                                    >
                                                        {isActiveGroup && group.moment && (
                                                            <Volume2 size={8} className="text-orange-300 shrink-0" />
                                                        )}

                                                        {/* Truncated Text Container */}
                                                        <span className={`text-[10px] whitespace-nowrap w-full flex items-center gap-1 ${currentUser?.id === group.moment.userId ? 'justify-center font-bold uppercase tracking-tight' : ''}`}>
                                                            {currentUser?.id === group.moment.userId ? (
                                                                (() => {
                                                                    const pct = ((group.moment.endSec - group.moment.startSec) / safeDuration) * 100;
                                                                    return (
                                                                        <>
                                                                            <Wrench size={9} strokeWidth={2.5} className="shrink-0 z-10" />
                                                                            {pct > 5 && (
                                                                                <span className="truncate min-w-0">
                                                                                    {pct < 15 ? 'Edit' : 'Edit Moment'}
                                                                                </span>
                                                                            )}
                                                                        </>
                                                                    );
                                                                })()
                                                            ) : (
                                                                <span className="truncate w-full block">
                                                                    {group.moment.note || 'Moment'}
                                                                </span>
                                                            )}
                                                        </span>

                                                        {/* Expand Carrot - Always visible now */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setExpandedMomentId(prev => prev === group.moment!.id ? null : group.moment!.id);
                                                            }}
                                                            className="ml-1 p-0.5 hover:bg-white/10 rounded-full transition-colors"
                                                        >
                                                            {expandedMomentId === group.moment.id ? (
                                                                <ChevronUp size={8} />
                                                            ) : (
                                                                <ChevronDown size={8} />
                                                            )}
                                                        </button>
                                                    </div>

                                                    {/* Expanded Opaque Text Area */}
                                                    {expandedMomentId === group.moment.id && (
                                                        <div
                                                            className="mt-1 w-[300px] p-4 bg-zinc-950 border border-orange-500/50 shadow-2xl shadow-black rounded-xl animate-in fade-in slide-in-from-top-1 z-[999] relative"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-orange-500/20 pr-1">
                                                                <p className="text-sm text-white leading-relaxed font-serif whitespace-pre-wrap font-medium">
                                                                    {group.moment.note}
                                                                </p>
                                                            </div>

                                                            {/* Actions Row */}
                                                            <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2">
                                                                <div className="flex items-center gap-3">
                                                                    {/* Like Button */}
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleLike(group.moment!);
                                                                        }}
                                                                        className="flex items-center gap-1.5 text-xs text-white/60 hover:text-pink-400 transition-colors group/like"
                                                                    >
                                                                        <Heart
                                                                            size={14}
                                                                            className={`transition-colors ${getMomentStats(group.moment!).isLiked ? 'fill-pink-500 text-pink-500' : 'group-hover:text-pink-400'}`}
                                                                        />
                                                                        <span>{getMomentStats(group.moment!).count}</span>
                                                                    </button>

                                                                    {/* Edit Button (Owner Only) */}
                                                                    {currentUser && group.moment && (currentUser.id === group.moment.userId) && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                if (!group.moment) return;
                                                                                setEditingMomentId(group.moment.id);
                                                                                onNoteChange?.(group.moment.note || '');
                                                                                onCaptureUpdate?.(group.moment.startSec, group.moment.endSec); // Set timeline state
                                                                                setIsEditorOpen(true);
                                                                            }}
                                                                            className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors group/edit"
                                                                        >
                                                                            <Wrench size={14} />
                                                                            {(() => {
                                                                                const mDuration = group.moment.endSec - group.moment.startSec;
                                                                                if (mDuration <= 20) return null;
                                                                                if (mDuration < 70) return <span>Edit</span>;
                                                                                return <span>Edit Moment</span>;
                                                                            })()}
                                                                        </button>
                                                                    )}

                                                                    {/* Comment Button */}
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setIsReplying(!isReplying);
                                                                            setReplyText(''); // Clear on toggle or not? Maybe keep draft.
                                                                        }}
                                                                        className={`flex items-center gap-1.5 text-xs transition-colors hover:text-blue-400
                                                                            ${isReplying ? 'text-blue-400' : 'text-white/60'}
                                                                        `}
                                                                    >
                                                                        <MessageSquare size={14} />
                                                                        <span>Reply</span>
                                                                    </button>
                                                                </div>

                                                                {/* Date */}
                                                                {/* Date & Edited */}
                                                                <div className="flex flex-col items-end">
                                                                    {group.moment && (
                                                                        <>
                                                                            <span className="text-[10px] text-white/30 font-mono">
                                                                                {new Date(group.moment.createdAt).toLocaleDateString()}
                                                                            </span>
                                                                            {group.moment.updatedAt && group.moment.updatedAt !== group.moment.createdAt && (
                                                                                <span className="text-[9px] text-white/20 italic">Edited</span>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Reply Input */}
                                                            {isReplying && (
                                                                <div className="mt-3 flex gap-2 animate-in slide-in-from-top-1">
                                                                    <textarea
                                                                        value={replyText}
                                                                        onChange={(e) => setReplyText(e.target.value)}
                                                                        placeholder="Add a reply..."
                                                                        className="flex-1 bg-black/50 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-blue-500/50 resize-none h-16"
                                                                        autoFocus
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    />
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleSendComment(group.moment!);
                                                                        }}
                                                                        disabled={!replyText.trim()}
                                                                        className="h-8 w-8 flex items-center justify-center bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors self-end"
                                                                    >
                                                                        <Send size={14} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
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
