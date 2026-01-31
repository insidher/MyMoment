import { useState } from 'react';
import { X, Send, Loader2, ChevronDown } from 'lucide-react';
import { submitFeedback } from '../../app/explore/actions';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CATEGORIES = [
    'Player Timeline',
    'Moment Capture',
    'Moment Replay',
    'Design / Aesthetics',
    'User Profile',
    'Modal / Overlays',
    'Search & Explore',
    'Moment Cards',
    'Settings & Account',
    'Login & Signup',
    'Other Idea'
];

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
    const [content, setContent] = useState('');
    const [category, setCategory] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || !category) return;

        setIsSubmitting(true);
        setStatus('idle');

        try {
            const result = await submitFeedback(content, category);
            if (result.success) {
                setStatus('success');
                setTimeout(() => {
                    onClose();
                    // Reset after close animation would finish
                    setTimeout(() => {
                        setContent('');
                        setCategory('');
                        setStatus('idle');
                    }, 300);
                }, 1500);
            } else {
                setStatus('error');
            }
        } catch (error) {
            setStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-4 pointer-events-none flex justify-center">
            {/* 
                Container is pointer-events-none so we can click through side areas basically,
                but the modal itself will be pointer-events-auto.
                We want it to sit on top of everything.
            */}

            <div className="w-full max-w-2xl bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-t-2xl shadow-2xl overflow-hidden pointer-events-auto transform transition-all animate-in slide-in-from-bottom duration-300">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5">
                    <h3 className="font-bold flex items-center gap-2">
                        <Send size={16} className="text-purple-400" />
                        Send Feedback
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">

                    {/* Category Dropdown */}
                    <div className="relative">
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full appearance-none bg-black/40 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors cursor-pointer hover:bg-black/60"
                            required
                        >
                            <option value="" disabled>Select a topic...</option>
                            {CATEGORIES.map(cat => (
                                <option key={cat} value={cat} className="bg-zinc-900">{cat}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                    </div>

                    {/* Text Area */}
                    <div className="relative">
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Tell us what's on your mind... (max 2000 characters)"
                            maxLength={2000}
                            rows={4}
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-sm resize-none focus:outline-none focus:border-purple-500 transition-colors placeholder:text-white/20"
                            autoComplete="off"
                        />
                        <div className="absolute bottom-3 right-3 text-xs text-white/20 font-mono">
                            {content.length}/2000
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-2">
                        <div className="text-xs text-white/30">
                            Saved to your profile history.
                        </div>

                        {status === 'success' ? (
                            <button
                                type="button"
                                disabled
                                className="bg-green-500/20 text-green-400 px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2"
                            >
                                Thank You!
                            </button>
                        ) : status === 'error' ? (
                            <button
                                type="submit"
                                className="bg-red-500/20 text-red-400 px-6 py-2 rounded-full text-sm font-bold hover:bg-red-500/30 transition-colors"
                            >
                                Try Again
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={!content.trim() || !category || isSubmitting}
                                className="bg-white text-black px-6 py-2 rounded-full text-sm font-bold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                                Send Feedback
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
