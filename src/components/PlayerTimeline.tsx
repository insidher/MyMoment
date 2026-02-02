"use client";

import { useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    GripHorizontal,
    X,
    RotateCcw,
    MessageCircle,
} from 'lucide-react';
import { Moment } from '@/types/moment';
import { User } from '@/types/user';

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
    currentUser?: User | null;
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
    isPlaying,
    isEditorOpen = false,
    onEditorOpenChange = () => { },
}: PlayerTimelineProps) {
    const timelineRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const actionsRef = useRef<HTMLDivElement>(null);

    // Timeline Calculation Safety
    const safeDuration = duration > 0 ? duration : 180;

    // Interaction State
    const [draggingMarker, setDraggingMarker] = useState<'start' | 'end' | 'range' | null>(null);
    const [hoverTime, setHoverTime] = useState<number | null>(null);
    const [dragStartMouseX, setDragStartMouseX] = useState<number | null>(null);
    const [isHovering, setIsHovering] = useState(false);

    // Visual State
    const [heartbeat, setHeartbeat] = useState(false);

    // Boundary Detection State for Action Bar
    const [alignLeft, setAlignLeft] = useState(false);

    // Onboarding State
    const [showOnboarding, setShowOnboarding] = useState(false);

    // UI State
    // UI State
    // const [isEditorOpen, setIsEditorOpen] = useState(false); // REMOVED: Lifted to parent

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
        const handleMouseMove = (e: MouseEvent) => {
            const { startSec, endSec, draggingMarker, safeDuration } = stateRef.current;
            if (!draggingMarker) return;

            const rect = timelineRef.current?.getBoundingClientRect();
            if (!rect) return;

            const x = e.clientX - rect.left;
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
                const deltaX = e.clientX - dragStartXRef.current;
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

        const handleMouseUp = (e: MouseEvent) => {
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
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
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
                            className={`absolute top-0 bottom-0 z-30 transition-transform duration-100 ${heartbeat ? 'scale-y-125 scale-x-105' : 'scale-100'}`}
                            style={{
                                left: `${(startSec / safeDuration) * 100}%`,
                                width: `${((endSec - startSec) / safeDuration) * 100}%`
                            }}
                        >

                            {/* 
                                ZONE A - MOBILE ACTION BAR (Smart Alignment)
                                - If alignLeft is true, we anchor to LEFT of range (Start Handle).
                                - Else, we anchor to RIGHT of range (End Handle).
                                - This prevents it falling off the left edge. 
                                - Max-width and right-align prevents right edge overflow.
                            */}
                            <div
                                className={`absolute bottom-full mb-3 z-50 flex flex-col ${alignLeft ? 'items-start left-0 origin-bottom-left' : 'items-end right-0 origin-bottom-right'}`}
                                ref={actionsRef}
                            >
                                <div className="flex items-center bg-black/90 backdrop-blur-md border border-white/20 rounded-lg overflow-hidden shadow-xl">
                                    {/* Action Content */}

                                    {/* Replay */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onSeek(startSec); }}
                                        className="h-9 px-3 flex items-center justify-center hover:bg-white/10 text-white/70 hover:text-white transition-colors border-r border-white/10"
                                        title="Replay"
                                    >
                                        <RotateCcw size={16} />
                                    </button>

                                    {/* Edit / Create */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (isEditorOpen) triggerHeartbeat();
                                            else {
                                                onEditorOpenChange(true);
                                                textareaRef.current?.focus();
                                                triggerHeartbeat();
                                            }
                                        }}
                                        className="h-9 px-4 flex items-center justify-center text-white text-xs font-bold uppercase hover:bg-white/10 transition-colors whitespace-nowrap border-r border-white/10"
                                    >
                                        {isEditorOpen ? 'EDIT' : '+ CREATE'}
                                    </button>

                                    {/* Close */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onCancelCapture();
                                            onEditorOpenChange(false);
                                        }}
                                        className="h-9 px-3 flex items-center justify-center hover:bg-red-500/20 text-white/50 hover:text-white transition-colors"
                                        title="Close"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>


                            {/* ZONE B: MIDDLE FRAME & TRIANGLE HANDLES */}
                            <div className="absolute inset-0 bg-blue-500/10 border-x-2 border-orange-500">
                                {/* Active Red Track */}
                                <div className="absolute top-1/2 -translate-y-1/2 inset-x-0 h-1 bg-red-500 rounded-full" />

                                {/* 
                                    Start Handle (Triangle) 
                                    - Centered on the line (left-0, translateX -50%)
                                    - Downward pointing triangle
                                */}
                                <div
                                    className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 z-40 touch-action-none cursor-ew-resize flex items-center justify-center pointer-events-auto"
                                    style={{ marginTop: '-6px' }} // Lift slightly so point touches line
                                    onMouseDown={(e) => { e.stopPropagation(); setDraggingMarker('start'); }}
                                    onTouchStart={(e) => { e.stopPropagation(); setDraggingMarker('start'); }}
                                >
                                    <div className="absolute inset-[-15px]" /> {/* Large Touch Target */}

                                    {/* CSS Triangle: Downward, Orange */}
                                    <div
                                        style={{
                                            width: 0,
                                            height: 0,
                                            borderLeft: '5px solid transparent',
                                            borderRight: '5px solid transparent',
                                            borderTop: '7px solid #f97316' // Orange-500
                                        }}
                                    />
                                </div>

                                {/* End Handle (Triangle) */}
                                <div
                                    className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 z-40 touch-action-none cursor-ew-resize flex items-center justify-center pointer-events-auto"
                                    style={{ marginTop: '-6px' }}
                                    onMouseDown={(e) => { e.stopPropagation(); setDraggingMarker('end'); }}
                                    onTouchStart={(e) => { e.stopPropagation(); setDraggingMarker('end'); }}
                                >
                                    <div className="absolute inset-[-15px]" />

                                    <div
                                        style={{
                                            width: 0,
                                            height: 0,
                                            borderLeft: '5px solid transparent',
                                            borderRight: '5px solid transparent',
                                            borderTop: '7px solid #f97316'
                                        }}
                                    />
                                </div>
                            </div>


                            {/* ZONE C: BOTTOM GRIP (Full Width) */}
                            <div
                                className="absolute top-full left-0 w-full z-40 cursor-grab active:cursor-grabbing group/grip"
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                    setDraggingMarker('range');
                                    setDragStartMouseX(e.clientX);
                                    dragStartXRef.current = e.clientX;
                                    dragStartTimeRef.current = { start: startSec, end: endSec };
                                }}
                                onTouchStart={(e) => {
                                    e.stopPropagation();
                                    setDraggingMarker('range');
                                }}
                            >
                                <div className="w-full h-6 bg-neutral-800 border-x border-b border-white/20 rounded-b-lg flex items-center justify-center shadow-lg hover:bg-neutral-700 transition-colors">
                                    <GripHorizontal size={16} className="text-white/30" />
                                </div>
                            </div>

                        </div>
                    )}

                </div>
            </div>

            {/* Note Editor Modal */}
            {isEditorOpen && createPortal(
                <div className="fixed inset-0 z-[999] bg-black/60 flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom-5">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-sm font-bold text-white flex items-center gap-2">
                                <MessageCircle size={16} className="text-orange-500" />
                                Add Note
                            </span>
                            <button onClick={() => onEditorOpenChange(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                                <X size={18} className="text-white/60" />
                            </button>
                        </div>

                        <textarea
                            ref={textareaRef}
                            value={note}
                            onChange={(e) => onNoteChange?.(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-orange-500/50 h-32 mb-4 resize-none"
                            placeholder="What's happening in this moment?"
                        />

                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    onSaveMoment?.();
                                    onEditorOpenChange(false);
                                }}
                                className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-orange-500/20 transition-all active:scale-95"
                            >
                                Save Moment
                            </button>
                        </div>
                    </div>
                </div>
                , document.body)}

        </div>
    );
}
