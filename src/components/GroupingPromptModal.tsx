'use client';

import { Moment } from '@/types';
import { X, Users, Plus } from 'lucide-react';

interface GroupingPromptModalProps {
    isOpen: boolean;
    parentMoment: Moment;
    draftStart: number;
    draftEnd: number;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function GroupingPromptModal({
    isOpen,
    parentMoment,
    draftStart,
    draftEnd,
    onConfirm,
    onCancel
}: GroupingPromptModalProps) {
    if (!isOpen) return null;

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] animate-in fade-in duration-200"
                onClick={onCancel}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
                <div
                    className="bg-zinc-900 border border-orange-500/30 rounded-2xl shadow-2xl shadow-orange-900/20 max-w-md w-full pointer-events-auto animate-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                                <Users size={20} className="text-orange-400" />
                            </div>
                            <h2 className="text-xl font-bold text-white">Overlap Detected</h2>
                        </div>
                        <button
                            onClick={onCancel}
                            className="p-1 hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X size={20} className="text-white/60" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4">
                        <p className="text-white/80 leading-relaxed">
                            Your new moment <span className="font-mono text-orange-400">{formatTime(draftStart)} → {formatTime(draftEnd)}</span> overlaps with an existing moment:
                        </p>

                        {/* Existing Moment Card */}
                        <div className="bg-black/40 border border-white/10 rounded-lg p-4 space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-[10px] font-bold text-white">
                                    {parentMoment.user?.image ? (
                                        <img src={parentMoment.user.image} className="w-full h-full rounded-full object-cover" alt="" />
                                    ) : (
                                        parentMoment.user?.name?.[0] || 'U'
                                    )}
                                </div>
                                <span className="text-sm text-white/60">{parentMoment.user?.name || 'Unknown'}</span>
                            </div>
                            <p className="text-white font-medium italic">"{parentMoment.note || 'Moment'}"</p>
                            <p className="text-xs text-orange-400 font-mono">
                                {formatTime(parentMoment.startSec)} → {formatTime(parentMoment.endSec)}
                            </p>
                        </div>

                        <p className="text-sm text-white/60">
                            Would you like to group these moments together, or keep them separate?
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="p-6 pt-0 flex gap-3">
                        <button
                            onClick={onCancel}
                            className="flex-1 px-4 py-3 rounded-lg border border-white/20 hover:bg-white/5 transition-colors text-white font-medium flex items-center justify-center gap-2"
                        >
                            <Plus size={16} />
                            Create Separate
                        </button>
                        <button
                            onClick={onConfirm}
                            className="flex-1 px-4 py-3 rounded-lg bg-orange-500 hover:bg-orange-600 transition-colors text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-900/30"
                        >
                            <Users size={16} />
                            Group Together
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
