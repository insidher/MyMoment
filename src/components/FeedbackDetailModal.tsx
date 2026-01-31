'use client';

import { X, Calendar, Tag, MessageSquare } from 'lucide-react';

interface FeedbackDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    feedback: {
        id: string;
        content: string;
        category: string | null;
        created_at: string;
    } | null;
}

export default function FeedbackDetailModal({ isOpen, onClose, feedback }: FeedbackDetailModalProps) {
    if (!isOpen || !feedback) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] transition-opacity animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
                <div className="w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto transform transition-all animate-in zoom-in-95 duration-200">

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5">
                        <h3 className="font-bold flex items-center gap-2 text-white">
                            <MessageSquare size={18} className="text-purple-400" />
                            Feedback Details
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">

                        {/* Metadata */}
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-white/60 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                                <Tag size={14} className="text-purple-400" />
                                {feedback.category || 'General'}
                            </div>
                            <div className="flex items-center gap-2 text-white/40">
                                <Calendar size={14} />
                                {new Date(feedback.created_at).toLocaleDateString()}
                            </div>
                        </div>

                        {/* Text */}
                        <div className="bg-white/5 rounded-xl p-5 border border-white/5 text-white/80 leading-relaxed whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
                            {feedback.content}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-white/5 border-t border-white/5 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-white text-black text-sm font-bold rounded-full hover:bg-gray-200 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
