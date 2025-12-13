import { useState } from 'react';
import { Moment } from '@/types';
import MomentCard from '@/components/MomentCard';
import { ChevronDown, ChevronUp, MessageCircle } from 'lucide-react';

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
}: MomentGroupProps) {
    const [isExpanded, setIsExpanded] = useState(false);

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
                    showCommentButton={false}
                />

                {/* Thread Indicator / Expand Button (Below Card) */}
                {replies.length > 0 && (
                    <div className="flex justify-end pr-2 -mt-1 relative z-10">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsExpanded(!isExpanded);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1 bg-black/40 hover:bg-black/60 text-blue-200 transition-colors backdrop-blur-md border border-blue-500/30 text-[10px] font-medium rounded-b-lg border-t-0"
                        >
                            <MessageCircle size={10} />
                            {replies.length} replies
                            {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                        </button>
                    </div>
                )}
            </div>

            {/* Expanded Thread View */}
            {isExpanded && replies.length > 0 && (
                <div className="pl-6 space-y-2 relative">
                    {/* Thread Line */}
                    <div className="absolute left-3 top-0 bottom-4 w-0.5 bg-white/10" />

                    {replies.map((reply) => (
                        <div key={reply.id} className="relative">
                            {/* Connector */}
                            <div className="absolute left-[-1.5rem] top-6 w-4 h-0.5 bg-white/10" />

                            <div className="glass-panel p-3 flex gap-3 items-start bg-black/20 hover:bg-white/5 transition-colors">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold shrink-0">
                                    {reply.user?.image ? (
                                        <img src={reply.user.image} alt={reply.user.name || 'User'} className="w-full h-full rounded-full" />
                                    ) : (
                                        (reply.user?.name?.[0] || 'U')
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-semibold text-sm">{reply.user?.name || 'Unknown User'}</span>
                                        <span className="text-xs text-white/40">
                                            {new Date(reply.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-sm text-white/80 break-words">{reply.note || 'No comment'}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
