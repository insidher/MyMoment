import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Moment } from '@/types';
import { Chapter } from '@/lib/chapters';
import { calculateClusterRanges } from '@/lib/clustering';
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
    onCancelDraft?: () => void;
    onPreviewCapture?: () => void;
    currentUser?: any; // Ideally typed but avoiding circular ref or huge import for now
    onUpdateMoment?: (id: string, note: string) => Promise<boolean>;
    disabled?: boolean;
    onPause?: () => void; // Callback to pause the video
    service?: 'youtube' | 'spotify';
    onEditorOpenChange?: (isOpen: boolean) => void;
    onFocusRequest?: () => void;
}

export default function PlayerTimeline({
    currentTime,
    duration,
    moments,
    onSeek,
    onMomentClick,
    service,
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
    onCancelDraft,
    onPreviewCapture,
    currentUser,
    onUpdateMoment,
    disabled = false,
    onPause,
    onEditorOpenChange,
    onFocusRequest
}: PlayerTimelineProps) {
    const [isHovering, setIsHovering] = useState(false);
    const [expandedMomentId, setExpandedMomentId] = useState<string | null>(null);
    const [editingMomentId, setEditingMomentId] = useState<string | null>(null);
    const [hoverTime, setHoverTime] = useState<number | null>(null);
    const [cycleIndex, setCycleIndex] = useState<Record<string, number>>({});

    // Onboarding state
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [capturePhase, setCapturePhase] = useState<'idle' | 'positioning' | 'active'>('idle');

    // Use all moments for timeline visualization so we can group them visibly using clustering logic
    const rootMoments = moments.filter(m => !m.parentId);

    // Check if user has seen onboarding
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const hasSeenOnboarding = localStorage.getItem('timeline-onboarding-seen');
            setShowOnboarding(!hasSeenOnboarding && !disabled);
        }
    }, [disabled]);

    // Reset onboarding when moments are empty and no active capture (new video loaded)
    useEffect(() => {
        if (moments.length === 0 && startSec === null && endSec === null && !disabled) {
            // Clear the localStorage flag to show onboarding again
            if (typeof window !== 'undefined') {
                localStorage.removeItem('timeline-onboarding-seen');
                setShowOnboarding(true);
                setCapturePhase('idle');
            }
        }
    }, [moments.length, startSec, endSec, disabled]);

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

    const [optimisticReplies, setOptimisticReplies] = useState<Record<string, Moment[]>>({});

    const handleSendComment = async (m: Moment) => {
        if (!replyText.trim()) return;

        // Optimistic / Instant Update
        // We don't have the full ID yet, but we can fake it or wait for the return.
        // Waiting for return is better to get the real ID, but still "Instant" enough for UX usually (ms).
        try {
            const newComment = await createComment(m.id, replyText, pathname);

            if (newComment) {
                const newReplyMoment: Moment = {
                    id: newComment.id,
                    userId: newComment.user_id,
                    note: newComment.note,
                    createdAt: newComment.created_at,
                    likeCount: 0,
                    user: {
                        name: newComment.profiles?.name || 'Me',
                        image: newComment.profiles?.image
                    },
                    // minimal required fields
                    service: 'legacy' as any,
                    sourceUrl: '',
                    startSec: 0, endSec: 0
                } as Moment;

                setOptimisticReplies(prev => ({
                    ...prev,
                    [m.id]: [...(prev[m.id] || []), newReplyMoment]
                }));
            }

            setReplyText('');
            setIsReplying(false);
        } catch (e) {
            console.error(e);
        }
    };
    const [draggingMarker, setDraggingMarker] = useState<'start' | 'end' | 'range' | null>(null);
    const [dragStartMouseX, setDragStartMouseX] = useState<number | null>(null); // To detect click vs drag
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    // Sync editor state with parent
    useEffect(() => {
        onEditorOpenChange?.(isEditorOpen);
    }, [isEditorOpen, onEditorOpenChange]);

    const [isHoveringRange, setIsHoveringRange] = useState(false);

    // Focus textarea when editor opens
    useEffect(() => {
        if (isEditorOpen && textareaRef.current) {
            setTimeout(() => {
                textareaRef.current?.focus();
            }, 100);
        }
    }, [isEditorOpen]);

    // Reset editor state when capture ends (e.g. Cancel or Save)
    useEffect(() => {
        if (startSec === null) {
            setIsEditorOpen(false);
        }
    }, [startSec]);

    // Mobile-First Draft State
    const [draftMoment, setDraftMoment] = useState<{ start: number; end: number } | null>(null);
    const [isDraggingDraft, setIsDraggingDraft] = useState<'start' | 'end' | false>(false);
    const [showConfirmation, setShowConfirmation] = useState(false);

    const dragStartXRef = useRef<number>(0);
    const dragStartTimeRef = useRef<{ start: number, end: number } | null>(null);
    const justDraggedRef = useRef<boolean>(false); // Track if we just finished dragging

    // Smart Duration Calculation
    const calculateDraftDuration = (totalDuration: number): number => {
        // < 10 mins (600s) → 30s default
        // >= 10 mins → 2 mins (120s) default
        return totalDuration < 600 ? 30 : 120;
    };

    const timelineRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
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
        timelineRect: null as DOMRect | null,
        isDraggingDraft,
        draftMoment
    });

    // Update ref on every render
    useEffect(() => {
        stateRef.current = {
            startSec,
            endSec,
            draggingMarker,
            duration,
            safeDuration,
            timelineRect: timelineRef.current?.getBoundingClientRect() || null,
            isDraggingDraft,
            draftMoment
        };
    }, [startSec, endSec, draggingMarker, duration, safeDuration, isDraggingDraft, draftMoment]);

    // Stabilize callback
    const onCaptureUpdateRef = useRef(onCaptureUpdate);
    useEffect(() => {
        onCaptureUpdateRef.current = onCaptureUpdate;
    }, [onCaptureUpdate]);


    // Global Drag & Hover Handlers (Permanent Listener)
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const { startSec, endSec, draggingMarker, safeDuration, isDraggingDraft, draftMoment } = stateRef.current;

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

            // DRAFT DRAGGING LOGIC
            if (isDraggingDraft && draftMoment) {
                console.log('[Draft Drag] Dragging:', isDraggingDraft, 'Time:', time, 'Type:', typeof isDraggingDraft, 'onSeek available:', !!onSeek);
                if (isDraggingDraft === 'end') {
                    const newEnd = Math.max(draftMoment.start + 1, Math.min(time, safeDuration));
                    setDraftMoment({ ...draftMoment, end: newEnd });
                    // Scrub video to show current position
                    console.log('[Draft Drag] Seeking to END:', newEnd);
                    onSeek(newEnd);
                } else if (isDraggingDraft === 'start') {
                    const newStart = Math.max(0, Math.min(time, draftMoment.end - 1));
                    setDraftMoment({ ...draftMoment, start: newStart });
                    // Scrub video to show current position
                    console.log('[Draft Drag] Seeking to START:', newStart);
                    onSeek(newStart);
                } else {
                    console.log('[Draft Drag] WARNING: isDraggingDraft value not matching end or start:', isDraggingDraft);
                }
                return;
            }

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
            const { isDraggingDraft } = stateRef.current;
            if (isDraggingDraft) {
                setIsDraggingDraft(false);
                // Don't auto-trigger modal - let user click "Edit Moment" when ready
                justDraggedRef.current = true; // Mark that we just dragged
                // Reset the flag after a short delay
                setTimeout(() => {
                    justDraggedRef.current = false;
                }, 100);
            }

            // Transition from positioning to active phase when user releases drag
            if (capturePhase === 'positioning' && draggingMarker === 'start') {
                setCapturePhase('active');
            }

            setDraggingMarker(null);
        };

        const handleTouchMove = (e: TouchEvent) => {
            const { isDraggingDraft, draftMoment, safeDuration } = stateRef.current;
            if (!isDraggingDraft || !draftMoment) return;
            const touch = e.touches[0];
            if (!touch) return;

            const rect = timelineRef.current?.getBoundingClientRect();
            if (!rect) return;


            const x = touch.clientX - rect.left;
            const width = rect.width;
            const percent = Math.max(0, Math.min(1, x / width));
            const effectiveDuration = safeDuration > 1 ? safeDuration : 180;
            const time = Math.floor(percent * effectiveDuration);

            if (isDraggingDraft === 'end') {
                const newEnd = Math.max(draftMoment.start + 1, Math.min(time, safeDuration));
                setDraftMoment({ ...draftMoment, end: newEnd });
                onSeek(newEnd);
            } else if (isDraggingDraft === 'start') {
                const newStart = Math.max(0, Math.min(time, draftMoment.end - 1));
                setDraftMoment({ ...draftMoment, start: newStart });
                onSeek(newStart);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleMouseUp);
        };
    }, []); // EMPTY DEPENDENCY ARRAY - Permanent Listeners!

    // Prevent body scroll when confirmation modal is open
    useEffect(() => {
        if (showConfirmation) {
            // Save current scroll position
            const scrollY = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';

            return () => {
                // Restore scroll position
                document.body.style.position = '';
                document.body.style.top = '';
                document.body.style.width = '';
                window.scrollTo(0, scrollY);
            };
        }
    }, [showConfirmation]);

    // =========================================================
    // GROUPING & CLUSTERING LOGIC (Peer-to-Peer + Heatmap)
    // =========================================================
    const derivedClusters = React.useMemo(() => {
        // We'll map to a unified structure
        type UnifiedCluster = {
            time: number;
            chapter?: Chapter;
            moments: Moment[];
            totalRange: { start: number; end: number };
            coreRange: { start: number; end: number };
            id: string; // unique key for React
        };

        const clusters: UnifiedCluster[] = [];

        // 1. Process Moments
        const momentGroups = new Map<string, Moment[]>();

        rootMoments.forEach(m => {
            // Peer-to-Peer grouping key: groupId > id
            const key = m.groupId || m.id;
            if (!momentGroups.has(key)) {
                momentGroups.set(key, []);
            }
            momentGroups.get(key)!.push(m);
        });

        // Convert Map to Clusters
        momentGroups.forEach((groupMoments, key) => {
            const { totalRange, coreRange } = calculateClusterRanges(groupMoments);

            clusters.push({
                id: `cluster-${key}`,
                time: totalRange.start,
                moments: groupMoments,
                totalRange,
                coreRange
            });
        });

        // 2. Add Chapters
        chapters.forEach(ch => {
            clusters.push({
                id: `chapter-${ch.startSec}`,
                time: ch.startSec,
                chapter: ch,
                moments: [],
                totalRange: { start: ch.startSec, end: ch.startSec },
                coreRange: { start: ch.startSec, end: ch.startSec }
            });
        });

        // 3. Sort by Time
        clusters.sort((a, b) => a.time - b.time);

        return clusters;
    }, [rootMoments, chapters]);

    // ============================================
    // DYNAMIC TICKER: Cycle through active moments every 3 seconds
    // ============================================
    useEffect(() => {
        const interval = setInterval(() => {
            setCycleIndex(prev => {
                const next = { ...prev };

                // For each cluster, increment the cycle index if there are multiple active moments
                derivedClusters.forEach((cluster: any) => {
                    const activeMoments = cluster.moments.filter((m: Moment) =>
                        currentTime >= m.startSec && currentTime <= m.endSec
                    );

                    if (activeMoments.length > 1) {
                        next[cluster.id] = ((prev[cluster.id] || 0) + 1) % activeMoments.length;
                    }
                });

                return next;
            });
        }, 3000); // 3 second interval

        return () => clearInterval(interval);
    }, [derivedClusters, currentTime]);

    // ============================================
    // CLICK-AWAY & ESCAPE HANDLERS
    // ============================================

    // Close expanded dropdown on click-away
    useEffect(() => {
        if (!expandedMomentId) return;

        const handleClickAway = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            // Check if click is outside the expanded dropdown
            if (!target.closest('[data-moment-dropdown]')) {
                setExpandedMomentId(null);
            }
        };

        // Small delay to prevent immediate closure from the opening click
        const timer = setTimeout(() => {
            document.addEventListener('click', handleClickAway);
        }, 100);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('click', handleClickAway);
        };
    }, [expandedMomentId]);

    // Cancel draft on click-away or escape
    useEffect(() => {
        const hasDraft = startSec !== null || endSec !== null || note.trim() !== '';
        const hasEngagedWithEditor = note.trim() !== ''; // User has started typing

        // Don't activate click-away when user is actively editing (has typed something) OR when editor is open
        if (!hasDraft || hasEngagedWithEditor || isEditorOpen) return;

        const handleClickAway = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            // Don't cancel if clicking on draft markers, editor, or timeline
            if (target.closest('[data-draft-marker]') ||
                target.closest('[data-moment-editor]') ||
                target.closest('[data-timeline-track]')) {
                return;
            }

            // Cancel draft
            if (onCancelDraft) {
                onCancelDraft();
            }
        };

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (expandedMomentId) {
                    setExpandedMomentId(null);
                } else if (hasDraft && onCancelDraft) {
                    onCancelDraft();
                }
            }
        };

        document.addEventListener('click', handleClickAway);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('click', handleClickAway);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [startSec, endSec, note, expandedMomentId, onCancelDraft]);

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
                    data-timeline-track
                    ref={timelineRef}
                    className="flex-1 h-3 relative cursor-pointer" // made taller (h-3) for easier interaction
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
                        // ONBOARDING: If showing onboarding, dismiss it and enter positioning phase
                        if (showOnboarding) {
                            setShowOnboarding(false);
                            setCapturePhase('positioning');
                            if (typeof window !== 'undefined') {
                                localStorage.setItem('timeline-onboarding-seen', 'true');
                            }
                            // Start capture at current time
                            const time = getTimeFromX(e.clientX);
                            onCaptureStart?.(time);
                            return;
                        }

                        const time = getTimeFromX(e.clientX);

                        // CLICK-TO-DRAFT LOGIC
                        // Ignore if we just finished dragging
                        if (justDraggedRef.current) return;

                        // Ignore if already dragging
                        if (isDraggingDraft) return;

                        // If draft exists, reposition it
                        if (draftMoment) {
                            const defaultDuration = calculateDraftDuration(safeDuration);
                            const endTime = Math.min(time + defaultDuration, safeDuration);
                            setDraftMoment({ start: time, end: endTime });
                            return;
                        }

                        // If in Capture Mode (Start Set, End Not Set), THIS CLICK sets the end
                        // ONE-CLICK DRAFT: Always create a full draft (Start + End) immediately
                        const defaultDuration = calculateDraftDuration(safeDuration);
                        const endTime = Math.min(time + defaultDuration, safeDuration);

                        if (onCaptureStart && onCaptureEnd) {
                            onCaptureStart(time);
                            onCaptureEnd(endTime);
                            setIsEditorOpen(true);
                        } else {
                            setIsEditorOpen(true);
                        }
                    }}
                >
                    {/* Onboarding Overlay */}
                    {showOnboarding && (
                        <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-sm rounded-lg flex items-center justify-center cursor-pointer animate-in fade-in duration-300">
                            <div className="text-center space-y-2 px-4">
                                <div className="text-sm md:text-base font-medium text-white">
                                    <span className="hidden md:inline">Click here to start moment capture</span>
                                    <span className="md:hidden">Tap here to start</span>
                                </div>
                                <div className="text-xs text-white/60">
                                    Drag to find your favorite moment
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Track Background */}
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-white/10 overflow-visible">
                        {/* Green Progress */}
                        <div
                            className="h-full bg-green-500 rounded-full transition-all duration-500 ease-linear relative z-0"
                            style={{ width: `${(currentTime / safeDuration) * 100}%` }}
                        />

                        {/* Draggable Scrubber Handle - Positioned Above Track */}
                        <div
                            className="absolute top-1/2 w-4 h-4 bg-white rounded-full shadow-lg cursor-grab active:cursor-grabbing hover:scale-125 transition-transform z-50 border-2 border-blue-400"
                            style={{
                                left: `${(currentTime / safeDuration) * 100}%`,
                                transform: 'translate(-50%, 100%)'
                            }}
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                const handleDrag = (moveEvent: MouseEvent) => {
                                    const time = getTimeFromX(moveEvent.clientX);
                                    onSeek(time);
                                };
                                const handleRelease = () => {
                                    document.removeEventListener('mousemove', handleDrag);
                                    document.removeEventListener('mouseup', handleRelease);
                                };
                                document.addEventListener('mousemove', handleDrag);
                                document.addEventListener('mouseup', handleRelease);
                            }}
                            onTouchStart={(e) => {
                                e.stopPropagation();
                                const handleDrag = (moveEvent: TouchEvent) => {
                                    const touch = moveEvent.touches[0];
                                    if (touch) {
                                        const time = getTimeFromX(touch.clientX);
                                        onSeek(time);
                                    }
                                };
                                const handleRelease = () => {
                                    document.removeEventListener('touchmove', handleDrag);
                                    document.removeEventListener('touchend', handleRelease);
                                };
                                document.addEventListener('touchmove', handleDrag);
                                document.addEventListener('touchend', handleRelease);
                            }}
                        />

                        {/* RED RECORDING STRIP */}
                        {startSec !== null && (
                            <div
                                data-draft-marker
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
                                    data-draft-marker
                                    className="absolute top-0 bottom-0 z-15 bg-[#1a2332]/90 cursor-grab active:cursor-grabbing flex items-center justify-center group/range"
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
                                    {/* VISUALS: +Create Text & Vertical Borders */}
                                    {/* VISUALS: +Create Text & Vertical Borders */}
                                    <button
                                        className="text-[10px] font-bold text-white tracking-widest uppercase select-none drop-shadow-md hover:scale-110 transition-transform cursor-pointer pointer-events-auto"
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsEditorOpen(true);
                                            // Re-focus logic
                                            textareaRef.current?.focus();
                                            onFocusRequest?.();
                                        }}
                                    >
                                        {isEditorOpen ? 'EDIT' : '+CREATE'}
                                    </button>

                                    {/* Left Border (Extended) */}

                                </div>
                            )}
                        </>
                    )}






                    {/* Moments Overlays (Existing) */}
                    {rootMoments.map((moment) => {
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



                </div>

                <span className="text-xs font-mono text-white/60 w-10">
                    {formatTime(duration)}
                </span>
            </div>

            {/* Note Editor Popover - Only on Mobile (hidden on desktop where it's in sidebar) */}
            {
                isEditorOpen && (
                    <div className="lg:hidden absolute top-full left-1/2 -translate-x-1/2 mt-4 p-4 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-2 z-50 min-w-[340px]">
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
                                    ref={textareaRef}
                                    autoFocus
                                    value={note}
                                    onChange={(e) => onNoteChange?.(e.target.value)}
                                    onKeyDown={async (e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            if (note.trim()) {
                                                if (editingMomentId) {
                                                    if (onUpdateMoment) {
                                                        const success = await onUpdateMoment(editingMomentId, note);
                                                        if (success) {
                                                            setIsEditorOpen(false);
                                                            setEditingMomentId(null);
                                                            onCancelCapture?.();
                                                        }
                                                    }
                                                } else {
                                                    onSaveMoment?.();
                                                    setIsEditorOpen(false);
                                                }
                                            }
                                        }
                                    }}
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

                                        {/* Preview Play Button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // Construct mock moment to play
                                                if (!onMomentClick) return;

                                                // Determine service fallback if not provided
                                                const effectiveService = service || (moments.length > 0 ? moments[0].service : 'youtube');

                                                // Create a temporary moment object
                                                const previewId = 'preview-draft';
                                                const mockMoment: any = {
                                                    id: previewId,
                                                    userId: currentUser?.id || 'me',
                                                    startSec: startSec || 0,
                                                    endSec: endSec || 0,
                                                    note: note,
                                                    createdAt: new Date().toISOString(),
                                                    service: effectiveService
                                                };

                                                onMomentClick(mockMoment);
                                            }}
                                            className={`p-1.5 rounded-md hover:bg-white/10 transition-colors ${activeMomentId === 'preview-draft' ? 'text-orange-400' : 'text-white/60 hover:text-white'}`}
                                            title={activeMomentId === 'preview-draft' ? "Stop Preview" : "Play Preview"}
                                        >
                                            {activeMomentId === 'preview-draft' ? (
                                                <Square size={16} className="fill-current" />
                                            ) : (
                                                <Play size={16} className="fill-current" />
                                            )}
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
                )
            }

            {/* Confirmation Modal (Click-to-Draft Flow) */}
            {
                showConfirmation && draftMoment && createPortal(
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] animate-in fade-in duration-200">
                        <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 max-w-sm mx-4 animate-in zoom-in-95 duration-200">
                            <h3 className="text-lg font-bold mb-2">Complete Capture?</h3>
                            <p className="text-sm text-white/60 mb-4">
                                {formatTime(draftMoment.start)} - {formatTime(draftMoment.end)}
                                <span className="block text-xs text-white/40 mt-1">
                                    Duration: {formatTime(draftMoment.end - draftMoment.start)}
                                </span>
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowConfirmation(false);
                                        // Keep draft active for further adjustment
                                    }}
                                    className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm font-medium"
                                >
                                    Keep Editing
                                </button>
                                <button
                                    onClick={() => {
                                        // Trigger save flow
                                        onCaptureStart?.(draftMoment.start);
                                        onCaptureEnd?.(draftMoment.end);
                                        setShowConfirmation(false);
                                        setDraftMoment(null);
                                        setIsEditorOpen(true);
                                    }}
                                    className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg font-bold transition-colors text-sm"
                                >
                                    Continue
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }

            {/* Unified Labels (Chapters & Moments) */}
            {
                (() => {
                    // Smart Packing Logic (Greedy)
                    let row1End = -10;
                    const LABEL_BUFFER = 12;

                    const packedClusters = derivedClusters.map(cluster => {
                        const isRow1 = ((cluster.time / safeDuration) * 100) > (row1End + 1);
                        if (isRow1) {
                            row1End = ((cluster.time / safeDuration) * 100) + LABEL_BUFFER;
                        }
                        return { ...cluster, assignedRow: isRow1 ? 1 : 2 };
                    });

                    return (
                        <div className="relative h-10 w-full">
                            {packedClusters.map((cluster, i) => {
                                if (cluster.time === 0) return null;
                                const left = (cluster.totalRange.start / safeDuration) * 100;
                                if (left > 100) return null;

                                const primaryMoment = cluster.moments[0];
                                const isChapter = !!cluster.chapter;

                                let isActiveGroup = false;
                                if (!isChapter) {
                                    isActiveGroup = (
                                        activeMomentId === primaryMoment?.id ||
                                        (currentTime >= cluster.totalRange.start && currentTime <= cluster.totalRange.end)
                                    );
                                }

                                const row = isActiveGroup ? 0 : cluster.assignedRow;
                                const topPos = row === 0 ? 'top-1' : row === 1 ? 'top-3.5' : 'top-9';

                                // Z-Index: Expanded > Active > Row
                                const zIndex = (expandedMomentId === primaryMoment?.id) ? 100 : (isActiveGroup ? 50 : 30 - row);

                                // Width Calculations
                                const totalWidthPercent = Math.max(0.5, ((cluster.totalRange.end - cluster.totalRange.start) / safeDuration) * 100);

                                // Core (Hotspot) Relative Calculation
                                const totalDuration = cluster.totalRange.end - cluster.totalRange.start;
                                const safeTotalDuration = totalDuration > 0 ? totalDuration : 1;

                                const coreStartDelta = cluster.coreRange.start - cluster.totalRange.start;
                                const coreDuration = cluster.coreRange.end - cluster.coreRange.start;

                                const coreLeftPercent = (coreStartDelta / safeTotalDuration) * 100;
                                const coreWidthPercent = (coreDuration / safeTotalDuration) * 100;

                                // Calculate Max Width for Label (avoid collision)
                                let nextGroupTime = safeDuration;
                                for (let j = i + 1; j < packedClusters.length; j++) {
                                    if (packedClusters[j].assignedRow === cluster.assignedRow) {
                                        nextGroupTime = packedClusters[j].time;
                                        break;
                                    }
                                }

                                const widthToNext = ((nextGroupTime - cluster.time) / safeDuration) * 100;
                                // We need to constrain the label width relative to the Timeline, NOT the container.
                                // The container width is totalWidthPercent.
                                // So we set maxWidth style on the label div.

                                // ---------------------------------------------------------
                                // ---------------------------------------------------------
                                // RENDER: Group Container
                                // ---------------------------------------------------------
                                return (
                                    <div
                                        key={cluster.id}
                                        className={`absolute transition-all duration-300 ${topPos} ${isActiveGroup ? 'scale-100 z-[60]' : 'z-[40]'}`}
                                        style={{
                                            left: `${left}%`,
                                            width: `${totalWidthPercent}%`,
                                            zIndex,
                                        }}
                                    >
                                        {/* FLOATING LABEL */}
                                        <div // Wrapper to position the label relative to the group start
                                            className={`absolute top-[8px] pointer-events-none ${
                                                // Smart edge clamping
                                                left < 10
                                                    ? 'left-0' // Early moments: left-align
                                                    : left + totalWidthPercent > 90
                                                        ? 'right-0' // Late moments: right-align
                                                        : 'left-1/2 -translate-x-1/2' // Middle: center
                                                }`}
                                            style={{ width: 'auto' }}
                                        >
                                            <div
                                                // Interactive Label Card
                                                className={`pointer-events-auto flex items-center gap-1 transition-all cursor-pointer border px-1.5 py-0.5 rounded-sm relative
                                                bg-black
                                                ${isActiveGroup
                                                        ? 'text-orange-300 font-bold border-orange-500/50 shadow-lg shadow-orange-900/20 scale-105'
                                                        : 'text-orange-400/70 border-orange-900/30 hover:text-orange-300 hover:border-orange-400/50'
                                                    }`}
                                                style={{
                                                    maxWidth: '90vw', // Use VW/Fixed constraint to prevent infinite grow
                                                    minWidth: 'max-content'
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onMomentClick && onMomentClick(primaryMoment);
                                                }}
                                            >
                                                {/* Chapter Variant */}
                                                {isChapter && cluster.chapter ? (
                                                    <span className={`${isActiveGroup ? 'text-green-300' : 'text-green-400/70'}`}>
                                                        {cluster.chapter.title}
                                                    </span>
                                                ) : (
                                                    // Moment Variant
                                                    <>
                                                        {isActiveGroup && <Volume2 size={8} className="text-orange-300 shrink-0" />}

                                                        <span className={`text-[10px] whitespace-nowrap block truncate max-w-[120px] ${currentUser?.id === primaryMoment.userId ? 'font-bold' : ''}`}>
                                                            {currentUser?.id === primaryMoment.userId && <Wrench size={8} className="inline mr-1" />}
                                                            {(() => {
                                                                // Dynamic Ticker Logic
                                                                const activeMoments = cluster.moments.filter(m =>
                                                                    currentTime >= m.startSec && currentTime <= m.endSec
                                                                );

                                                                if (activeMoments.length === 0) {
                                                                    // Gap: Show count
                                                                    return cluster.moments.length > 1 ? `${cluster.moments.length} Moments` : (primaryMoment.note || 'Moment');
                                                                } else if (activeMoments.length === 1) {
                                                                    // Single active: Show its note
                                                                    return activeMoments[0].note || 'Moment';
                                                                } else {
                                                                    // Multiple active: Cycle through them
                                                                    const currentIndex = cycleIndex[cluster.id] || 0;
                                                                    const displayMoment = activeMoments[currentIndex % activeMoments.length];
                                                                    return displayMoment.note || 'Moment';
                                                                }
                                                            })()}
                                                        </span>

                                                        {/* CLUSTER BADGE */}
                                                        {cluster.moments.length > 1 && (
                                                            <span className="ml-1.5 flex items-center justify-center h-3 min-w-[12px] px-0.5 rounded-xs bg-orange-500/20 text-orange-300 text-[8px] font-mono font-bold border border-orange-500/20 shrink-0">
                                                                {cluster.moments.length}
                                                            </span>
                                                        )}

                                                        {/* Expand Toggle */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setExpandedMomentId(prev => prev === primaryMoment.id ? null : primaryMoment.id);
                                                            }}
                                                            className="ml-1 p-0.5 hover:bg-white/10 rounded-full transition-colors shrink-0"
                                                        >
                                                            {expandedMomentId === primaryMoment.id ? <ChevronUp size={8} /> : <ChevronDown size={8} />}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* 3. EXPANDED VIEW (Context Menu) */}
                                        {/* Needs to be OUTSIDE the transform scale context or handled carefully? 
                                        Actually, being inside is fine if z-index is high. */}
                                        {expandedMomentId === primaryMoment.id && (
                                            <div
                                                data-moment-dropdown
                                                className="absolute top-[32px] left-0 w-[300px] p-4 bg-zinc-950 border border-orange-500/50 shadow-2xl shadow-black rounded-xl animate-in fade-in slide-in-from-top-1 z-[999]"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <div className="max-h-[320px] overflow-y-auto scrollbar-thin scrollbar-thumb-orange-500/20 pr-1 flex flex-col gap-3">
                                                    {(() => {
                                                        // Live Sort: Active moment first
                                                        const sortedMoments = [...cluster.moments].sort((a, b) => {
                                                            const aIsActive = currentTime >= a.startSec && currentTime <= a.endSec;
                                                            const bIsActive = currentTime >= b.startSec && currentTime <= b.endSec;

                                                            if (aIsActive && !bIsActive) return -1;
                                                            if (!aIsActive && bIsActive) return 1;
                                                            return a.startSec - b.startSec; // Secondary sort by time
                                                        });

                                                        return sortedMoments.map((m, idx) => (
                                                            <div key={m.id} className={`relative group/stack-item ${idx !== cluster.moments.length - 1 ? 'border-b border-white/5 pb-3' : ''}`}>
                                                                <div className="flex items-center justify-between mb-1.5">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-[9px] font-bold text-white border border-white/10">
                                                                            {m.user?.image ? <img src={m.user.image} className="w-full h-full rounded-full object-cover" /> : (m.user?.name?.[0] || 'U')}
                                                                        </div>
                                                                        <span className="text-[10px] text-white/60 font-medium">{m.user?.name || 'Unknown'}</span>
                                                                    </div>
                                                                    <button onClick={(e) => { e.stopPropagation(); onSeek(m.startSec); onMomentClick(m); }} className="hover:bg-white/10 p-1 rounded-full text-green-400 transition-colors">
                                                                        <Play size={10} className="fill-current" />
                                                                    </button>
                                                                </div>
                                                                <p className="text-xs text-white/90 font-serif">{m.note}</p>
                                                            </div>
                                                        ));
                                                    })()}
                                                </div>
                                            </div>
                                        )}

                                    </div>
                                );
                            })}
                        </div>
                    );
                })()
            }
            {
                disabled && (
                    <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-[1px] rounded-lg flex items-center justify-center cursor-not-allowed">
                        <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg animate-pulse">
                            <span>⚠️</span>
                            <span>Ad Playing - Timeline Locked</span>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
