'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Trash2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { deleteFeedback } from './actions';

interface Feedback {
    id: string;
    user_id: string;
    user_name: string | null;
    feedback_text: string;
    category: string;
    page_url: string | null;
    created_at: string;
}

export default function FeedbackDashboard() {
    const [feedback, setFeedback] = useState<Feedback[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const supabase = createClient();

        // Initial fetch
        const fetchFeedback = async () => {
            const { data, error } = await supabase
                .from('user_feedback' as any)
                .select('*')
                .order('created_at', { ascending: false });

            if (!error && data) {
                setFeedback(data as unknown as Feedback[]);
            }
            setLoading(false);
        };

        fetchFeedback();

        // Subscribe to real-time changes
        const channel = supabase
            .channel('feedback-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'user_feedback' as any,
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setFeedback((prev) => [payload.new as Feedback, ...prev]);
                    } else if (payload.eventType === 'DELETE') {
                        setFeedback((prev) => prev.filter((f) => f.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this feedback?')) return;

        setDeletingId(id);
        const result = await deleteFeedback(id);

        if (result.success) {
            setFeedback((prev) => prev.filter((f) => f.id !== id));
            if (expandedId === id) setExpandedId(null);
        } else {
            alert('Failed to delete feedback');
        }

        setDeletingId(null);
    };

    const formatUsername = (email: string | null) => {
        if (!email) return 'Anonymous';
        return email.split('@')[0];
    };

    const truncateText = (text: string, maxLength: number = 100) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="animate-spin text-white" size={32} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl md:text-4xl font-black mb-2">Feedback Dashboard</h1>
                    <p className="text-white/50">
                        {feedback.length} {feedback.length === 1 ? 'item' : 'items'}
                    </p>
                </div>

                <div className="space-y-3">
                    {feedback.length === 0 ? (
                        <div className="text-center py-12 text-white/30">
                            No feedback yet
                        </div>
                    ) : (
                        feedback.map((item) => {
                            const isExpanded = expandedId === item.id;
                            const isDeleting = deletingId === item.id;

                            return (
                                <div
                                    key={item.id}
                                    className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-colors"
                                >
                                    {/* Header - Always Visible */}
                                    <button
                                        onClick={() => handleExpand(item.id)}
                                        className="w-full p-4 flex items-start gap-4 text-left touch-manipulation active:bg-white/5 transition-colors"
                                        disabled={isDeleting}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold text-sm text-purple-400">
                                                    {formatUsername(item.user_name)}
                                                </span>
                                                <span className="text-xs text-white/30">•</span>
                                                <span className="text-xs text-white/30">
                                                    {new Date(item.created_at).toLocaleDateString()}
                                                </span>
                                                <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">
                                                    {item.category}
                                                </span>
                                            </div>
                                            <p className="text-sm text-white/70 line-clamp-2">
                                                {isExpanded ? item.feedback_text : truncateText(item.feedback_text)}
                                            </p>
                                        </div>
                                        <div className="flex-shrink-0">
                                            {isExpanded ? (
                                                <ChevronUp size={20} className="text-white/40" />
                                            ) : (
                                                <ChevronDown size={20} className="text-white/40" />
                                            )}
                                        </div>
                                    </button>

                                    {/* Expanded Content */}
                                    {isExpanded && (
                                        <div className="border-t border-white/10 p-4 bg-black/20 space-y-3">
                                            <div className="text-sm">
                                                <p className="text-white/90 whitespace-pre-wrap">
                                                    {item.feedback_text}
                                                </p>
                                            </div>

                                            {item.page_url && (
                                                <div className="text-xs text-white/40">
                                                    <span className="font-mono">From: {item.page_url}</span>
                                                </div>
                                            )}

                                            <div className="flex justify-end pt-2">
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    disabled={isDeleting}
                                                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 touch-manipulation active:scale-95"
                                                >
                                                    {isDeleting ? (
                                                        <>
                                                            <Loader2 size={14} className="animate-spin" />
                                                            Deleting...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Trash2 size={14} />
                                                            Delete
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
