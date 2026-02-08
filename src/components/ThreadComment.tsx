import { useState, useRef, useEffect } from 'react';
import { Moment } from '@/types';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { createComment } from '../../app/actions/moments';
import { toast } from 'sonner';
import { usePathname } from 'next/navigation';
import UserAvatar from './UserAvatar';

// Helper for relative time (e.g. "2h", "3d")
function getRelativeTime(dateString: string | Date): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 604800)}w`;
    return `${Math.floor(diffInSeconds / 31536000)}y`;
}

interface ThreadCommentProps {
    comment: Moment;
    currentUserId: string;
    onReply: (momentId: string, username: string) => void;
    onRefresh?: () => void;
}

export default function ThreadComment({ comment, currentUserId, onReply, onRefresh }: ThreadCommentProps) {
    const pathname = usePathname();
    const [showReplies, setShowReplies] = useState(false);

    // Local State
    const [isReplying, setIsReplying] = useState(false);
    const [replyText, setReplyText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [optimisticReplies, setOptimisticReplies] = useState<Moment[]>([]);

    // Merge & Sort (Newest first for conversation flow)
    const effectiveOptimistic = optimisticReplies.filter(op =>
        !comment.replies?.some(r => r.id === op.id)
    );

    const allReplies = [
        ...(comment.replies || []),
        ...effectiveOptimistic
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const hasReplies = allReplies.length > 0;

    // Auto-Expand Logic: Track reply count and auto-open drawer when new replies arrive
    // Initialize with current length so it doesn't auto-open on initial page load
    const prevReplyCount = useRef(allReplies.length);

    useEffect(() => {
        // If the reply count has increased, auto-expand the drawer
        if (allReplies.length > prevReplyCount.current) {
            setShowReplies(true);
        }
        // Update the ref to the current count for next comparison
        prevReplyCount.current = allReplies.length;
    }, [allReplies.length]);

    const handleReplySubmit = async () => {
        if (!replyText.trim()) return;
        setIsSubmitting(true);

        try {
            const newReply = await createComment(comment.id, replyText, pathname, false);

            if (newReply) {
                // Optimistic Update Object
                const optimReply = {
                    id: newReply.id,
                    userId: newReply.user_id,
                    createdAt: newReply.created_at,
                    note: newReply.note,
                    user: {
                        name: newReply.profiles?.name || 'Me',
                        image: newReply.profiles?.image || null
                    },
                    // Defaults for TS satisfaction
                    service: (newReply.platform as any) || 'unknown', // Cast to any to avoid strict type mismatch if needed, or map correctly
                    sourceUrl: '', // DB might not return source_url directly if not selected/computed
                    startSec: newReply.start_time || 0,
                    endSec: newReply.end_time || 0,
                    likeCount: 0,
                    replies: []
                } as unknown as Moment;

                setOptimisticReplies(prev => [...prev, optimReply]);
                setReplyText("");
                setIsReplying(false);
                setShowReplies(true); // Auto-Expand!
                toast.success("Reply posted!");

                // Trigger full refresh
                if (onRefresh) {
                    setTimeout(() => {
                        onRefresh();
                    }, 500);
                }
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to post reply");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="relative">
            {/* Connector Line */}
            <div className="absolute left-[-1.5rem] top-6 w-4 h-0.5 bg-white/10" />

            {/* LEVEL 2 CARD (The Comment) */}
            <div className="glass-panel p-2 bg-black/20 hover:bg-white/5 transition-colors">
                <div className="flex gap-2 items-start">
                    <UserAvatar
                        name={comment.user?.name}
                        image={comment.user?.image}
                        size="w-7 h-7"
                    />

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-sm">{comment.user?.name || 'Unknown User'}</span>
                            <span className="text-xs text-white/40">
                                {getRelativeTime(comment.createdAt)}
                            </span>
                        </div>
                        <p className="text-sm text-white/80 break-words">{comment.note || 'No comment'}</p>

                        {/* Action Bar (Only for Level 2) */}
                        <div className="flex items-center gap-3 mt-1.5">
                            <button
                                onClick={() => setIsReplying(!isReplying)}
                                className={`text-xs flex items-center gap-1 transition-colors ${isReplying ? 'text-white' : 'text-white/40 hover:text-white'}`}
                            >
                                <MessageCircle size={12} />
                                Reply
                            </button>

                            {hasReplies && (
                                <button
                                    onClick={() => setShowReplies(!showReplies)}
                                    className="text-xs text-blue-300 hover:text-blue-200 transition-colors font-medium"
                                >
                                    {showReplies ? "Hide Replies" : `View ${allReplies.length} Replies`}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* INLINE INPUT (Appears under Level 2) */}
            {isReplying && (
                <div className="mt-2 pl-3 border-l-2 border-white/10">
                    <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <textarea
                            autoFocus
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleReplySubmit();
                                }
                            }}
                            placeholder={`Reply to ${comment.user?.name}...`}
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-base text-white focus:outline-none focus:border-white/30 resize-none min-h-[60px] touch-manipulation"
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setIsReplying(false)}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X size={16} className="text-white/60" />
                            </button>
                            <button
                                onClick={handleReplySubmit}
                                disabled={isSubmitting || !replyText.trim()}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-full text-xs font-bold transition-colors disabled:opacity-50"
                            >
                                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                Reply
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* LEVEL 3 REPLIES (Rendered recursively, but NO reply buttons here) */}
            {showReplies && hasReplies && (
                <div className="mt-2 pl-3 border-l-2 border-white/10 space-y-2">
                    {allReplies.map((reply) => (
                        <div key={reply.id} className="relative animate-in fade-in slide-in-from-top-1">
                            <div className="glass-panel p-2 bg-black/40 border border-white/5">
                                <div className="flex gap-3 items-start">
                                    <UserAvatar
                                        name={reply.user?.name}
                                        image={reply.user?.image}
                                        size="w-6 h-6"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className="font-semibold text-xs text-white/90">{reply.user?.name || 'Unknown User'}</span>
                                            <span className="text-[10px] text-white/40">
                                                {getRelativeTime(reply.createdAt)} <span className="text-purple-400 font-mono" title="Debug ID">{reply.id.slice(0, 8)}</span>
                                            </span>
                                        </div>
                                        <p className="text-xs text-white/70 break-words">{reply.note || 'No comment'}</p>
                                        {/* NO REPLY BUTTON HERE - Capped at Level 3 */}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
