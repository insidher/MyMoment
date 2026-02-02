"use client";

import { useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    Play,
    Pause,
    GripHorizontal,
    X,
    RotateCcw,
    RotateCw,
    Send,
    MessageCircle,
    Copy,
    Check,
    Volume2,
    ChevronDown,
    ChevronUp,
    Wrench,
    Square,
    Star
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
    activeMomentId = null,
    expandedMomentId = null,
    setExpandedMomentId = () => { },
    currentUser = null,
    onMomentClick,
    isPlaying,
    service,
    onCancelDraft,
    onFocusRequest
}: PlayerTimelineProps) {
    const timelineRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Timeline Calculation Safety
    const safeDuration = duration > 0 ? duration : 180;

    // Interaction State
    const [draggingMarker, setDraggingMarker] = useState<'start' | 'end' | 'range' | null>(null);
    const [hoverTime, setHoverTime] = useState<number | null>(null);
    const [dragStartMouseX, setDragStartMouseX] = useState<number | null>(null);
    const [isHovering, setIsHovering] = useState(false);

    // Visual State
    const [heartbeat, setHeartbeat] = useState(false);

    // Onboarding State
    const [showOnboarding, setShowOnboarding] = useState(false);

    // UI State
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    // Refs for Drag Logic
    const stateRef = useRef({
        startSec,
        endSec,
        draggingMarker,
        duration,
        safeDuration,
        timelineRect: null as DOMRect | null
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
            timelineRect: timelineRef.current?.getBoundingClientRect() || null
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
            const percent = Math.max(0, Math.min(1, x / width));
            const time = Math.floor(percent * safeDuration);

            // LOGIC FOR DRAGGING
            if (draggingMarker === 'start') {
                if (endSec !== null && time >= endSec) return;
                onCaptureUpdate(time, endSec);
                onSeek(time); // Real-time scrubbing
            } else if (draggingMarker === 'end') {
                if (startSec !== null && time <= startSec) return;
                onCaptureUpdate(startSec, time);
                // End scrub could ideally happen here too for immediate feedback, 
                // but user generally prefers scrub-on-release or real-time. 
                // Let's do real-time visualization, but scrub on release unless critical.
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
                // Scrub on End Release
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
                    className="relative w-full h-8 flex items-center cursor-pointer" // Taller hit area
                    onMouseMove={(e) => {
                        if (!timelineRef.current) return;
                        const t = getTimeFromX(e.clientX);
                        setHoverTime(t);
                    }}
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                    onClick={(e) => {
                        // ONBOARDING
                        if (showOnboarding) {
                            setShowOnboarding(false);
                            if (typeof window !== 'undefined') localStorage.setItem('timeline-onboarding-seen', 'true');
                            return; // Don't trigger draft on dismissal
                        }

                        // PREVENT CLICK IF DRAGGING
                        if (justDraggedRef.current) return;

                        // ONE-TAP SMART DRAFT LOGIC
                        const clickTime = getTimeFromX(e.clientX);
                        const defaultDuration = 30; // 30s Fixed Default
                        const newEnd = Math.min(clickTime + defaultDuration, safeDuration);

                        onCaptureStart(clickTime);
                        onCaptureEnd(newEnd);
                        // Do not auto-open editor yet, let user refine with handles
                        // Or requirement says "A full range appears instantly."
                    }}
                >
                    {/* Onboarding Overlay */}
                    {showOnboarding && (
                        <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-sm rounded-lg flex items-center justify-center cursor-pointer animate-in fade-in duration-300 pointer-events-auto">
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
                    {/* PRECISION UI (3 ZONES) - Only when startSec is set */}
                    {/* ======================================================== */}

                    {startSec !== null && endSec !== null && (
                        <>
                            {/* ZONE A: TOP ACTION BAR */}
                            <div
                                className="absolute -top-12 z-50 flex items-center justify-end gap-1.5 pointer-events-auto min-w-[140px]"
                                style={{
                                    left: `auto`, // We want to anchor to the range, but keep it readable
                                    right: `${100 - ((endSec / safeDuration) * 100)}%`, // Right-align to End Handle
                                    transform: 'translateX(50%)' // Center the entire block relative to the End Handle? No, request said "Right Justified to End Handle"
                                    // Let's position LEFT at Start, width to End, then justify-end inside.
                                }}
                            >
                                <div className="flex items-center gap-1 p-1 bg-black/50 backdrop-blur-md border border-white/20 rounded-md shadow-xl">
                                    {/* Replay */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onSeek(startSec); }}
                                        className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors border border-white/10"
                                        title="Replay"
                                    >
                                        <RotateCcw size={14} />
                                    </button>

                                    {/* Action Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (isEditorOpen) {
                                                // Trigger Heartbeat to refocus
                                                triggerHeartbeat();
                                            } else {
                                                setIsEditorOpen(true);
                                                textareaRef.current?.focus();
                                            }
                                        }}
                                        className="px-3 py-1 rounded bg-white/5 border border-white/20 text-white text-[10px] font-bold uppercase hover:bg-white/10 transition-colors whitespace-nowrap min-w-[60px]"
                                    >
                                        {isEditorOpen ? 'EDIT' : '+ CREATE'}
                                    </button>

                                    {/* Close */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onCancelCapture();
                                            setIsEditorOpen(false);
                                        }}
                                        className="p-1.5 rounded bg-white/10 hover:bg-red-500/20 text-white/50 hover:text-white transition-colors border border-white/10"
                                        title="Close"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* ZONE B: MIDDLE PRECISION RANGE (The Red Track) */}
                            <div
                                className={`absolute top-0 bottom-0 z-30 transition-transform duration-100 ${heartbeat ? 'scale-y-125 scale-x-105' : 'scale-100'}`}
                                style={{
                                    left: `${(startSec / safeDuration) * 100}%`,
                                    width: `${((endSec - startSec) / safeDuration) * 100}%`
                                }}
                            >
                                {/* Active Range Line (Red) */}
                                <div className="absolute top-1/2 -translate-y-1/2 inset-x-0 h-1 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)] rounded-full" />

                                {/* Start Handle */}
                                <div
                                    className="absolute top-1/2 -translate-y-1/2 left-0 w-0 h-0 z-40 touch-action-none cursor-ew-resize"
                                    onMouseDown={(e) => { e.stopPropagation(); setDraggingMarker('start'); }}
                                    onTouchStart={(e) => { e.stopPropagation(); setDraggingMarker('start'); }}
                                >
                                    {/* Touch Target */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[44px] h-[44px]" />

                                    {/* Visuals: Tick Line + Gap + Hollow Circle */}
                                    <div className="absolute top-1/2 -translate-y-1/2 right-[0px] h-4 w-[2px] bg-white rounded-full translate-x-[-1px]" /> {/* Tick at exact time */}
                                    <div className="absolute top-1/2 -translate-y-1/2 right-[9px] w-3 h-3 rounded-full border-2 border-orange-500 bg-black" /> {/* Hollow circle offset left */}
                                </div>

                                {/* End Handle */}
                                <div
                                    className="absolute top-1/2 -translate-y-1/2 right-0 w-0 h-0 z-40 touch-action-none cursor-ew-resize"
                                    onMouseDown={(e) => { e.stopPropagation(); setDraggingMarker('end'); }}
                                    onTouchStart={(e) => { e.stopPropagation(); setDraggingMarker('end'); }}
                                >
                                    {/* Touch Target */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[44px] h-[44px]" />

                                    {/* Visuals: Tick Line + Gap + Hollow Circle */}
                                    <div className="absolute top-1/2 -translate-y-1/2 left-[0px] h-4 w-[2px] bg-white rounded-full translate-x-[1px]" />
                                    <div className="absolute top-1/2 -translate-y-1/2 left-[9px] w-3 h-3 rounded-full border-2 border-orange-500 bg-black" />
                                </div>
                            </div>

                            {/* ZONE C: BOTTOM 3D GRIP */}
                            <div
                                className="absolute top-1/2 left-0 z-40 cursor-grab active:cursor-grabbing group/grip pt-4" // Push down below track
                                style={{
                                    left: `${(startSec / safeDuration) * 100}%`,
                                    width: `${((endSec - startSec) / safeDuration) * 100}%`
                                }}
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
                                {/* min-w-[30px] constraint centered */}
                                <div className="mx-auto min-w-[30px] w-full max-w-[80px] h-5 bg-neutral-800 border-x border-b-2 border-r-2 border-black/50 border-t border-white/10 rounded-b-lg flex items-center justify-center shadow-lg transition-transform active:translate-y-0.5 active:border-b-0 active:border-r-0">
                                    <GripHorizontal size={12} className="text-white/30" />
                                </div>
                            </div>
                        </>
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
                            <button onClick={() => setIsEditorOpen(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
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
                                    setIsEditorOpen(false);
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
