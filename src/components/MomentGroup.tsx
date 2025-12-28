import { useState } from 'react';
import { Moment } from '@/types';
import MomentCard from '@/components/MomentCard';
import { ChevronDown, ChevronUp, MessageCircle, Loader2, Send, X } from 'lucide-react';
import ThreadComment from './ThreadComment';
import { createComment } from '../../app/actions/moments';
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
    onReply?: (momentId: string, username: string) => void; // Optional for now
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
    onReply,
}: MomentGroupProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const pathname = usePathname();
    const [isReplying, setIsReplying] = useState(false);
    const [replyText, setReplyText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [optimisticReplies, setOptimisticReplies] = useState<Moment[]>([]);

    // Combine props.replies + optimisticReplies, sort by Date DESC (newest top)
    const allReplies = [...replies, ...optimisticReplies].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const handleMainReplySubmit = async () => {
        if (!replyText.trim()) return;

        setIsSubmitting(true);
        try {
            const newComment = await createComment(mainMoment.id, replyText, pathname, true);
            if (newComment) {
                // Map DB response to Moment type
                const optimReply = {
                    ...newComment,
                    // Ensure user object is structured correctly for UI
                    user: {
                        name: newComment.profiles?.name || 'Me',
                        image: newComment.profiles?.image || null
                    },
                    // Fallbacks for safety
                    createdAt: new Date().toISOString(),
                    id: newComment.id,
                    replies: []
                } as unknown as Moment; // Type assertion needed due to potential mismatch with server action return

                setOptimisticReplies(prev => [...prev, optimReply]);

                toast.success("Reply posted!");
                setReplyText("");
                setIsReplying(false);
                setIsExpanded(true); // Ensure thread is open
            }
        } catch (error) {
            console.error('Failed to reply', error);
            toast.error("Failed to post reply");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-2">
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
                />
            </div>

            {/* Inline Reply Input for Main Moment */}
            {isReplying && (
                <div className="mt-4 px-4">
                    <div className="relative">
                        <div className="absolute left-[-0.5rem] top-[-0.5rem] w-3 h-3 border-l text-white/10" /> {/* Visual connector hint */}

                        <div className="glass-panel p-2 bg-black/40 border border-white/10 flex items-center gap-2">
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
                                className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-white/30 min-w-0"
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
                <div className="pl-6 space-y-2 relative">
                    {/* Thread Line */}
                    <div className="absolute left-3 top-0 bottom-4 w-0.5 bg-white/10" />

                    <div className="space-y-4">
                        {allReplies.map((reply) => (
                            <ThreadComment
                                key={reply.id}
                                comment={reply}
                                currentUserId={currentUserId}
                                onReply={(id, username) => onReply && onReply(id, username)}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
