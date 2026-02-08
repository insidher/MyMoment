import { useState, useRef, useEffect } from 'react';
import { Moment } from '@/types';
import MomentCard from '@/components/MomentCard';
import { ChevronDown, ChevronUp, MessageCircle, Loader2, Send, X } from 'lucide-react';
import ThreadComment from './ThreadComment';
import { createComment } from '../../app/actions/moments';
import { sanitizeMoment } from '@/lib/sanitize';
import { toast } from 'sonner';
import { usePathname } from 'next/navigation';

interface MomentGroupProps {
    mainMoment: Moment;
    replies: Moment[];
    onPlayFull?: (moment: Moment) => void;
    onPlayMoment?: (moment: Moment) => void;
    onPauseMoment?: (moment: Moment) => void;
    onDelete?: (id: string) => void;
    showDelete?: boolean;
    currentTime?: number;
    activeMomentId?: string;
    isPlaying?: boolean;
    trackDuration?: number;
    currentUserId: string;
    currentUser?: { id: string; name?: string | null; image?: string | null };
    onReply?: (momentId: string, username: string) => void;
    onRefresh?: () => void;
    onNewReply?: (parentId: string, reply: any) => void;
}

export default function MomentGroup({
    mainMoment,
    replies,
    onPlayFull,
    onPlayMoment,
    onPauseMoment,
    onDelete,
    showDelete,
    currentTime,
    activeMomentId,
    isPlaying,
    trackDuration,
    currentUserId,
    currentUser,
    onReply,
    onRefresh,
    onNewReply,
}: MomentGroupProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const pathname = usePathname();
    const [isReplying, setIsReplying] = useState(false);
    const [replyText, setReplyText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [optimisticReplies, setOptimisticReplies] = useState<Moment[]>([]);

    // Filter out optimistic replies that have now arrived in props (deduplication)
    const effectiveOptimistic = optimisticReplies.filter(op =>
        !replies.some(r => r.id === op.id) &&
        op.parentId === mainMoment.id
    );

    // 🛠️ FIX: Normalize incoming replies.
    // If 'profiles' is undefined, grab the data from 'user' so the UI doesn't crash.
    const normalizedReplies = replies.map(r => ({
        ...r,
        profiles: (r as any).profiles || (r as any).user
    }));

    // Combine normalized props + effective optimistic, sort by Date DESC
    // FILTER: Ensure we ONLY show direct replies to this moment (Level 2), excluding nested ones (Level 3+)
    const allReplies = [...normalizedReplies, ...effectiveOptimistic]
        .filter(r => r.parentId === mainMoment.id)
        .sort(
            (a, b) => {
                const timeA = new Date(a.createdAt || 0).getTime();
                const timeB = new Date(b.createdAt || 0).getTime();
                return timeB - timeA;
            }
        );

    // Auto-Expand Logic: Track reply count and auto-open drawer when new Level 2 comments arrive
    // Initialize with current length so it doesn't auto-open on initial page load
    const prevReplyCount = useRef(allReplies.length);

    useEffect(() => {
        // If the reply count has increased, auto-expand the drawer
        if (allReplies.length > prevReplyCount.current) {
            setIsExpanded(true);
        }
        // Update the ref to the current count for next comparison
        prevReplyCount.current = allReplies.length;
    }, [allReplies.length]);

    const handleMainReplySubmit = async () => {
        if (!replyText.trim()) return;

        const textToSubmit = replyText;
        setReplyText(""); // Clear immediately for speed

        // 1. Prepare Robust Data (The "Perfect Fake")
        const nowISO = new Date().toISOString();
        const currentUserData = {
            id: currentUser?.id || currentUserId || "unknown",
            name: currentUser?.name || "Me",
            image: currentUser?.image || null,
        };

        const tempId = `temp-${Date.now()}`;
        const optimReply = {
            id: tempId,
            content: textToSubmit,
            note: textToSubmit,
            createdAt: nowISO,
            userId: currentUserData.id,
            user: currentUserData,
            profiles: currentUserData, // Fallback for specific schemas
            momentId: mainMoment.id,
            parentId: mainMoment.id,
            likes: [],
            replies: [],
            _count: { likes: 0, replies: 0 }
        } as unknown as Moment;

        // 2. Optimistic Update (Show it NOW)
        setIsExpanded(true);
        setOptimisticReplies(prev => [optimReply, ...prev]);

        try {
            // 3. API Call
            const serverResponse = await createComment(mainMoment.id, textToSubmit, pathname, true);

            if (serverResponse) {
                // 4. DATA PATCHING (The Fix for "NaNy")
                // If server misses date/user, force our local versions
                const finalReply = sanitizeMoment(serverResponse);

                // 5. Reconciliation (Swap Temp -> Real)
                setOptimisticReplies(prev =>
                    prev.map(item => item.id === tempId ? finalReply : item)
                );

                // 6. Notify Parent (if prop exists)
                if (onNewReply) {
                    onNewReply(mainMoment.id, finalReply);
                }
            }
        } catch (e) {
            console.error("Failed to submit reply", e);
            // Rollback on error
            setOptimisticReplies(prev => prev.filter(i => i.id !== tempId));
            setReplyText(textToSubmit); // Restore text
        }
    };

    return (
        <div className="space-y-1 min-w-0">
            {/* Main Moment Card - Always Visible */}
            <div className="relative">
                <MomentCard
                    moment={mainMoment}
                    onPlayFull={onPlayFull}
                    onPlayMoment={onPlayMoment}
                    onPauseMoment={onPauseMoment}
                    onDelete={onDelete}
                    showDelete={showDelete}
                    currentTime={currentTime}
                    isActive={activeMomentId === mainMoment.id}
                    isPlaying={isPlaying}
                    trackDuration={trackDuration}
                    showCommentButton={true} // Enable reply on main card
                    onToggleReplies={() => setIsExpanded(!isExpanded)}
                    isRepliesExpanded={isExpanded}
                    replyCount={allReplies.length}
                    onReplyClick={() => setIsReplying(!isReplying)}
                    onNewReply={onNewReply}
                />
            </div>

            {/* Inline Reply Input for Main Moment */}
            {isReplying && (
                <div className="mt-2 px-3">
                    <div className="relative">
                        <div className="absolute left-[-0.5rem] top-[-0.5rem] w-3 h-3 border-l text-white/10" /> {/* Visual connector hint */}

                        <div className="glass-panel p-1.5 bg-black/40 border border-white/10 flex items-center gap-2">
                            <input
                                autoFocus
                                type="text"
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleMainReplySubmit();
                                    }
                                }}
                                placeholder="Reply to this moment..."
                                className="flex-1 bg-transparent border-none outline-none text-base text-white placeholder:text-white/30 min-w-0 touch-manipulation"
                            />

                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setIsReplying(false)}
                                    className="p-1.5 text-white/40 hover:text-white transition-colors rounded-full hover:bg-white/10"
                                >
                                    <X size={14} />
                                </button>
                                <button
                                    onClick={handleMainReplySubmit}
                                    disabled={!replyText.trim() || isSubmitting}
                                    className="p-1.5 text-blue-400 hover:text-blue-300 transition-colors rounded-full hover:bg-blue-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Expanded Thread View */}
            {isExpanded && allReplies.length > 0 && (
                <div className="pl-4 space-y-1 relative">
                    {/* Thread Line */}
                    <div className="absolute left-3 top-0 bottom-4 w-0.5 bg-white/10" />

                    <div className="space-y-2">
                        {allReplies.map((reply) => (
                            <ThreadComment
                                key={reply.id}
                                comment={reply}
                                currentUserId={currentUserId}
                                onReply={(id, username) => onReply && onReply(id, username)}
                                onRefresh={onRefresh}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
