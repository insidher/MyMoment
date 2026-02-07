"use client";

import { useEffect, useRef, useState, useMemo } from 'react';
import {
    GripHorizontal,
    X,
    RotateCcw,
    Menu,
    Pin,
} from 'lucide-react';
import { Moment } from '@/types';

// ============================================
// TYPES & HELPER FUNCTIONS
// ============================================

interface PlayerTimelineProps {
    duration: number; // in seconds
    currentTime: number; // in seconds
    onSeek: (time: number) => void;
    // Capture Props
    startSec: number | null;
    endSec: number | null;
    onCaptureStart: (time: number) => void;
    onCaptureEnd: (time: number) => void;
    onCaptureUpdate: (start: number | null, end: number | null) => void;
    onCancelCapture: () => void;
    // Moment Creation Props
    onNoteChange?: (note: string) => void;
    onSaveMoment?: () => void;
    note: string;
    // Editing Props
    editingMomentId: string | null;
    setEditingMomentId: (id: string | null) => void;
    onUpdateMoment?: (id: string, note: string) => Promise<boolean>;
    // Existing Moments
    moments?: Moment[];
    activeMomentId?: string | null;
    expandedMomentId?: string | null;
    setExpandedMomentId?: (id: string | null) => void;
    onMomentClick?: (moment: Moment) => void;
    // State
    isPlaying: boolean;
    service?: 'youtube' | 'spotify';
    // Cancellation
    onCancelDraft?: () => void;
    // Focus
    onFocusRequest?: () => void;
    // Creator Mode (Lifted State)
    isEditorOpen?: boolean;
    onEditorOpenChange?: (isOpen: boolean) => void;
    // Legacy / Extra Props from Parent
    disabled?: boolean;
    onChapterClick?: (chapter: any) => void;
    onPause?: () => void;
    onPreviewCapture?: () => void;
    chapters?: any[];
}

const formatTime = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
};

// ============================================
// COMPONENT
// ============================================

export default function PlayerTimeline({
    duration,
    currentTime,
    onSeek,
    startSec,
    endSec,
    onCaptureStart,
    onCaptureEnd,
    onCaptureUpdate,
    onCancelCapture,
    onNoteChange,
    onSaveMoment,
    note,
    editingMomentId,
    setEditingMomentId,
    onUpdateMoment,
    moments = [],
    activeMomentId,
    onMomentClick,
    isPlaying,
    isEditorOpen = false,
    onEditorOpenChange = () => { },
}: PlayerTimelineProps) {
    const timelineRef = useRef<HTMLDivElement>(null);
    const actionsRef = useRef<HTMLDivElement>(null);

    // Timeline Calculation Safety
    const safeDuration = duration > 0 ? duration : 180;

    // Interaction State
    const [draggingMarker, setDraggingMarker] = useState<'start' | 'end' | 'range' | null>(null);
    const [hoverTime, setHoverTime] = useState<number | null>(null);
    const [dragStartMouseX, setDragStartMouseX] = useState<number | null>(null);
    const [isHovering, setIsHovering] = useState(false);

    // Touch tracking for directional detection
    const [touchStartX, setTouchStartX] = useState<number | null>(null);
    const [touchStartY, setTouchStartY] = useState<number | null>(null);

    // Visual State
    const [heartbeat, setHeartbeat] = useState(false);

    // Boundary Detection State for Action Bar
    const [alignLeft, setAlignLeft] = useState(false);

    // Onboarding State
    const [showOnboarding, setShowOnboarding] = useState(false);

    // UI State
    const [isMenuExpanded, setIsMenuExpanded] = useState(false);
    const [expandedHighlightId, setExpandedHighlightId] = useState<string | null>(null);
    const [pinnedMomentIds, setPinnedMomentIds] = useState<string[]>([]);
    const [dismissedMomentId, setDismissedMomentId] = useState<string | null>(null);

    // Reset dismissed moment when active ID changes
    useEffect(() => {
        setDismissedMomentId(null);
    }, [activeMomentId]);

    // Auto-expand menu when draft appears
    useEffect(() => {
        if (startSec !== null && endSec !== null) {
            setIsMenuExpanded(true);
        }
    }, [startSec !== null, endSec !== null]);

    // Derived State
    const activeMoment = useMemo(() =>
        moments.find(m => m.id === activeMomentId),
        [moments, activeMomentId]
    );

    const pinnedMoments = useMemo(() =>
        moments.filter(m => pinnedMomentIds.includes(m.id)),
        [moments, pinnedMomentIds]
    );

    const allMomentHighlights = useMemo(() => {
        const unique = new Map<string, Moment>();
        if (activeMoment && activeMoment.id !== dismissedMomentId) {
            const isPinned = pinnedMomentIds.includes(activeMoment.id);
            const isWithinRange = currentTime >= activeMoment.startSec - 1 && currentTime <= activeMoment.endSec + 1;

            if (isPinned || isWithinRange) {
                unique.set(activeMoment.id, activeMoment);
            }
        }
        pinnedMoments.forEach(m => unique.set(m.id, m));
        return Array.from(unique.values());
    }, [activeMoment, pinnedMoments, dismissedMomentId, currentTime, pinnedMomentIds]);

    // Refs for Drag Logic
    const stateRef = useRef({
        startSec,
        endSec,
        draggingMarker,
        duration,
        safeDuration,
    });

    const dragStartXRef = useRef<number>(0);
    const dragStartTimeRef = useRef<{ start: number, end: number } | null>(null);
    const justDraggedRef = useRef<boolean>(false);

    // Update refs on render
    useEffect(() => {
        stateRef.current = {
            startSec,
            endSec,
            draggingMarker,
            duration,
            safeDuration,
        };
    }, [startSec, endSec, draggingMarker, duration, safeDuration]);

    // Initial Onboarding Check
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const hasSeenOnboarding = localStorage.getItem('timeline-onboarding-seen');
            if (!hasSeenOnboarding) {
                setShowOnboarding(true);
            }
        }
    }, []);

    // Smart Alignment Logic for Action Bar
    useEffect(() => {
        if (startSec !== null && endSec !== null) {
            // If the draft end is in the first 25% of the timeline, flip buttons to Left Align
            // to prevent them from falling off the left edge.
            const endPercent = (endSec / safeDuration);
            setAlignLeft(endPercent < 0.25);
        }
    }, [endSec, safeDuration]);

    // Click-away handler to collapse menu
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (timelineRef.current && !timelineRef.current.contains(e.target as Node)) {
                setIsMenuExpanded(false);
            }
        };

        if (isMenuExpanded) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside as any);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
                document.removeEventListener('touchstart', handleClickOutside as any);
            };
        }
    }, [isMenuExpanded]);



    // Helper to get time from X coordinate
    const getTimeFromX = (clientX: number) => {
        if (!timelineRef.current) return 0;
        const rect = timelineRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const width = rect.width;
        const percent = Math.max(0, Math.min(1, x / width));
        return Math.floor(percent * safeDuration);
    };

    // ============================================
    // MOUSE & TOUCH EVENT HANDLERS
    // ============================================

    useEffect(() => {
        const handleMove = (clientX: number) => {
            const { startSec, endSec, draggingMarker, safeDuration } = stateRef.current;
            if (!draggingMarker) return;

            const rect = timelineRef.current?.getBoundingClientRect();
            if (!rect) return;

            const x = clientX - rect.left;
            const width = rect.width;

            // Standard calc
            const rawPercent = x / width;
            const percent = Math.max(0, Math.min(1, rawPercent));
            const time = Math.floor(percent * safeDuration);

            // LOGIC FOR DRAGGING
            if (draggingMarker === 'start') {
                if (endSec !== null && time >= endSec) return;
                onCaptureUpdate(time, endSec);
                onSeek(time);
            } else if (draggingMarker === 'end') {
                if (startSec !== null && time <= startSec) return;
                onCaptureUpdate(startSec, time);
            } else if (draggingMarker === 'range' && dragStartTimeRef.current && startSec !== null && endSec !== null) {
                const deltaX = clientX - dragStartXRef.current;
                const deltaTime = (deltaX / width) * safeDuration;

                let newStart = dragStartTimeRef.current.start + deltaTime;
                let newEnd = dragStartTimeRef.current.end + deltaTime;

                // Clamp
                if (newStart < 0) {
                    const diff = 0 - newStart;
                    newStart = 0;
                    newEnd += diff;
                }
                if (newEnd > safeDuration) {
                    const diff = newEnd - safeDuration;
                    newEnd = safeDuration;
                    newStart -= diff;
                }

                onCaptureUpdate(Math.floor(newStart), Math.floor(newEnd));
            }
        };

        const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX);
        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length > 0) {
                const touch = e.touches[0];

                // Directional Gatekeeper Logic
                if (draggingMarker) {
                    // If actively dragging a handle, lock ALL scrolling
                    if (e.cancelable) e.preventDefault();
                    handleMove(touch.clientX);
                } else if (touchStartX !== null && touchStartY !== null) {
                    // Calculate deltas from start position
                    const deltaX = Math.abs(touch.clientX - touchStartX);
                    const deltaY = Math.abs(touch.clientY - touchStartY);

                    // If horizontal movement is dominant, prevent scroll (timeline scrubbing)
                    if (deltaX > deltaY) {
                        if (e.cancelable) e.preventDefault();
                        handleMove(touch.clientX);
                    }
                    // Otherwise, allow vertical scroll (feed/comments)
                } else {
                    // Fallback: if no start position tracked, allow movement
                    handleMove(touch.clientX);
                }
            }
        };

        const handleUp = () => {
            const { draggingMarker, endSec } = stateRef.current;
            if (draggingMarker) {
                if (draggingMarker === 'end' && endSec !== null) {
                    onSeek(endSec);
                }
                justDraggedRef.current = true;
                setTimeout(() => { justDraggedRef.current = false; }, 100);
                setDraggingMarker(null);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleUp);
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleUp);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleUp);
        };
    }, [safeDuration, onCaptureUpdate, onSeek]);


    // ============================================
    // HEARTBEAT ANIMATION
    // ============================================
    const triggerHeartbeat = () => {
        setHeartbeat(true);
        setTimeout(() => setHeartbeat(false), 200);
    };


    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="space-y-4 relative w-full select-none">
            {/* Timeline Container */}
            <div className="glass-panel px-4 py-8 flex flex-col gap-1 relative group/timeline">

                {/* Time Display */}
                <div className="absolute top-2 right-4 text-xs font-mono text-white/40">
                    {formatTime(currentTime)} / {formatTime(duration)}
                </div>

                {/* Main Track Interactive Area */}
                <div
                    ref={timelineRef}
                    className="relative w-full h-8 flex items-center cursor-pointer"
                    onMouseMove={(e) => {
                        if (!timelineRef.current) return;
                        const t = getTimeFromX(e.clientX);
                        setHoverTime(t);
                    }}
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                    onTouchStart={(e) => {
                        if (e.touches.length > 0) {
                            const touch = e.touches[0];
                            setTouchStartX(touch.clientX);
                            setTouchStartY(touch.clientY);
                        }
                    }}
                    onTouchEnd={() => {
                        setTouchStartX(null);
                        setTouchStartY(null);
                    }}
                    onClick={(e) => {
                        if (showOnboarding) {
                            setShowOnboarding(false);
                            if (typeof window !== 'undefined') localStorage.setItem('timeline-onboarding-seen', 'true');
                            return;
                        }

                        if (justDraggedRef.current) return;

                        // SMART CLICK LOGIC
                        const clickTime = getTimeFromX(e.clientX);

                        // Modified: If draft exists, just seek. Don't move draft.
                        if (startSec !== null && endSec !== null) {
                            onSeek(clickTime);
                            return;
                        }

                        const defaultDuration = 30;
                        const newEnd = Math.min(clickTime + defaultDuration, safeDuration);

                        onCaptureStart(clickTime);
                        onCaptureEnd(newEnd);
                        setIsMenuExpanded(true); // Auto-expand menu for new moments
                        // Optional: triggerHeartbeat();
                    }}
                >
                    {/* Onboarding Overlay */}
                    {showOnboarding && (
                        <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-sm rounded-lg flex items-center justify-center cursor-pointer">
                            <div className="text-center text-white text-sm font-bold animate-pulse">Tap anywhere to capture</div>
                        </div>
                    )}

                    {/* BASE TRACK (GREEN) */}
                    <div className="absolute inset-x-0 h-1 bg-green-500/30 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-green-500 rounded-full transition-all duration-100 ease-linear"
                            style={{ width: `${(currentTime / safeDuration) * 100}%` }}
                        />
                    </div>

                    {/* PLAYHEAD INDICATOR */}
                    <div
                        className="absolute top-0 bottom-0 w-[2px] bg-white z-30 pointer-events-none"
                        style={{ left: `${(currentTime / safeDuration) * 100}%` }}
                    />

                    {/* EXISTING MOMENTS OVERLAY */}
                    {moments.filter(m => !m.parentId).map((moment) => (
                        <div
                            key={moment.id}
                            className={`absolute h-1 bg-white/40 rounded-full pointer-events-none ${startSec !== null ? 'opacity-20' : 'opacity-80'}`}
                            style={{
                                left: `${(moment.startSec / safeDuration) * 100}%`,
                                width: `${((moment.endSec - moment.startSec) / safeDuration) * 100}%`
                            }}
                        />
                    ))}


                    {/* ======================================================== */}
                    {/* PRECISION UI (3 ZONES) */}
                    {/* ======================================================== */}

                    {startSec !== null && endSec !== null && (
                        <div
                            className={`absolute top-0 bottom-0 z-40 transition-transform duration-100 touch-none ${heartbeat ? 'scale-y-125 scale-x-105' : 'scale-100'}`}
                            style={{
                                left: `${(startSec / safeDuration) * 100}%`,
                                width: `${((endSec - startSec) / safeDuration) * 100}%`
                            }}
                        >

                            {/* 
                                ZONE A - MOBILE ACTION BAR (Smart Alignment)
                            */}
                            <div
                                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-10 flex flex-col items-center origin-bottom"
                                ref={actionsRef}
                            >
                                {isMenuExpanded ? (
                                    <div className="flex items-center bg-black/90 backdrop-blur-md border border-white/20 rounded-lg overflow-hidden shadow-xl animate-in zoom-in-95 duration-200">
                                        {/* Action Content */}

                                        {/* Replay */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); if (startSec !== null) onSeek(startSec); }}
                                            className="h-8 px-2 flex items-center justify-center hover:bg-white/10 text-white/70 hover:text-white transition-colors border-r border-white/10"
                                            title="Replay"
                                        >
                                            <RotateCcw size={14} />
                                        </button>

                                        {/* Edit / Create */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEditorOpenChange?.(true);
                                                triggerHeartbeat();
                                            }}
                                            className="h-8 px-3 flex items-center justify-center text-white text-[10px] font-bold uppercase hover:bg-white/10 transition-colors whitespace-nowrap border-r border-white/10"
                                        >
                                            {isEditorOpen ? 'EDIT' : '+ CREATE'}
                                        </button>

                                        {/* Close */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onCancelCapture();
                                                onEditorOpenChange?.(false);
                                            }}
                                            className="h-8 px-2 flex items-center justify-center hover:bg-red-500/20 text-white/50 hover:text-white transition-colors"
                                            title="Close"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsMenuExpanded(true);
                                        }}
                                        className="w-8 h-8 flex items-center justify-center bg-black/40 backdrop-blur-sm border border-white/10 rounded-full text-white/40 hover:text-white/80 hover:bg-black/60 transition-all hover:scale-110 active:scale-95 shadow-lg"
                                        title="Expand Menu"
                                    >
                                        <Menu size={14} />
                                    </button>
                                )}
                            </div>


                            {/* ZONE B: MIDDLE FRAME & TRIANGLE HANDLES */}
                            <div className="absolute inset-0 bg-blue-500/10 border-x-2 border-orange-500">
                                {/* Active Red Track */}
                                <div className="absolute top-1/2 -translate-y-1/2 inset-x-0 h-1 bg-red-500 rounded-full" />

                                {/* Start Handle */}
                                <div
                                    className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 z-40 touch-action-none cursor-ew-resize flex items-center justify-center pointer-events-auto"
                                    style={{ marginTop: '-6px' }}
                                    onMouseDown={(e) => { e.stopPropagation(); setDraggingMarker('start'); }}
                                    onTouchStart={(e) => { e.stopPropagation(); setDraggingMarker('start'); }}
                                >
                                    {/* Asymmetrical hit area: extends mostly to the left to prevent blocking the End handle when close */}
                                    <div className="absolute top-[-20px] bottom-[-20px] -left-[20px] -right-[5px] z-[50]" />
                                    <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '7px solid #f97316' }} />
                                </div>

                                {/* End Handle */}
                                <div
                                    className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 z-40 touch-action-none cursor-ew-resize flex items-center justify-center pointer-events-auto"
                                    style={{ marginTop: '-6px' }}
                                    onMouseDown={(e) => { e.stopPropagation(); setDraggingMarker('end'); }}
                                    onTouchStart={(e) => { e.stopPropagation(); setDraggingMarker('end'); }}
                                >
                                    {/* Asymmetrical hit area: extends mostly to the right to prevent blocking the Start handle when close */}
                                    <div className="absolute top-[-20px] bottom-[-20px] -left-[5px] -right-[20px] z-[50]" />
                                    <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '7px solid #f97316' }} />
                                </div>
                            </div>


                            {/* ZONE C: BOTTOM GRIP */}
                            <div
                                className="absolute top-full left-0 w-full z-40 cursor-grab active:cursor-grabbing group/grip"
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                    setDraggingMarker('range');
                                    setIsMenuExpanded(true);
                                    setDragStartMouseX(e.clientX);
                                    dragStartXRef.current = e.clientX;
                                    if (startSec !== null && endSec !== null) {
                                        dragStartTimeRef.current = { start: startSec, end: endSec };
                                    }
                                }}
                                onTouchStart={(e) => {
                                    e.stopPropagation();
                                    if (e.touches.length > 0) {
                                        setDraggingMarker('range');
                                        setIsMenuExpanded(true);
                                        const touch = e.touches[0];
                                        setDragStartMouseX(touch.clientX);
                                        dragStartXRef.current = touch.clientX;
                                        if (startSec !== null && endSec !== null) {
                                            dragStartTimeRef.current = { start: startSec, end: endSec };
                                        }
                                    }
                                }}
                            >
                                <div className="w-full h-6 bg-neutral-800 border-x border-b border-white/20 rounded-b-lg flex items-center justify-center shadow-lg hover:bg-neutral-700 transition-colors">
                                    <GripHorizontal size={16} className="text-white/30" />
                                </div>
                            </div>

                        </div>
                    )}

                    {/* ======================================================== */}
                    {/* ACTIVE/PINNED MOMENTS HIGHLIGHT (Orange) */}
                    {/* ======================================================== */}
                    {allMomentHighlights.map((m) => (
                        <div
                            key={`highlight-${m.id}`}
                            className="absolute top-0 bottom-0 z-20 pointer-events-none"
                            style={{
                                left: `${(m.startSec / safeDuration) * 100}%`,
                                width: `${((m.endSec - m.startSec) / safeDuration) * 100}%`
                            }}
                        >
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-10 flex flex-col items-center origin-bottom pointer-events-auto">
                                {expandedHighlightId === m.id ? (
                                    <div className="flex items-center bg-black/90 backdrop-blur-md border border-orange-500/50 rounded-lg overflow-hidden shadow-xl animate-in zoom-in-95 duration-200">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onSeek(m.startSec); }}
                                            className="h-8 px-2 flex items-center justify-center hover:bg-white/10 text-white/70 hover:text-white transition-colors border-r border-white/10"
                                            title="Replay"
                                        >
                                            <RotateCcw size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onMomentClick?.(m); }}
                                            className="h-8 px-3 flex items-center justify-center text-orange-400 text-[10px] font-bold uppercase hover:bg-orange-400/10 transition-colors whitespace-nowrap border-r border-white/10"
                                        >
                                            VIEW
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setPinnedMomentIds(prev =>
                                                    prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id]
                                                );
                                            }}
                                            className={`h-8 px-2 flex items-center justify-center transition-colors ${pinnedMomentIds.includes(m.id) ? 'bg-orange-500 text-black' : 'hover:bg-orange-400/20 text-orange-400'}`}
                                            title={pinnedMomentIds.includes(m.id) ? "Unpin" : "Pin"}
                                        >
                                            <Pin size={12} className={pinnedMomentIds.includes(m.id) ? "fill-black" : ""} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (pinnedMomentIds.includes(m.id)) {
                                                    setPinnedMomentIds(prev => prev.filter(id => id !== m.id));
                                                }
                                                setDismissedMomentId(m.id);
                                            }}
                                            className="h-8 px-2 flex items-center justify-center hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                                            title="Close"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setExpandedHighlightId(m.id); }}
                                        className="w-8 h-8 flex items-center justify-center bg-orange-500/40 backdrop-blur-sm border border-orange-500/20 rounded-full text-white/50 hover:text-white hover:bg-orange-500/60 transition-all shadow-lg"
                                        title="Expand Menu"
                                    >
                                        <Menu size={14} />
                                    </button>
                                )}
                            </div>

                            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-orange-500/20 rounded-full border-x-2 border-orange-500">
                                <div className="absolute inset-0 bg-orange-500 rounded-full" />
                                <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2" style={{ marginTop: '-6px' }}>
                                    <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '7px solid #f97316' }} />
                                </div>
                                <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2" style={{ marginTop: '-6px' }}>
                                    <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '7px solid #f97316' }} />
                                </div>
                            </div>

                            <div className="absolute top-full left-0 w-full">
                                <div className="w-full h-4 bg-orange-500/10 border-x border-b border-orange-500/30 rounded-b-lg flex items-center justify-center">
                                    <GripHorizontal size={10} className="text-orange-500/50" />
                                </div>
                            </div>
                        </div>
                    ))}

                </div>
            </div>

            {/* Note Editor removed. Handled by Parent (CreatorStudio). */}

        </div>
    );
}
