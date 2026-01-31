'use client';

import { useRef, useEffect } from 'react';

import { X, Star, Send, Play, Square } from 'lucide-react';

interface MomentEditorProps {
    isOpen: boolean;
    note: string;
    startSec: number | null;
    endSec: number | null;
    editingMomentId: string | null;
    currentUser?: { name?: string | null; image?: string | null };
    onNoteChange: (note: string) => void;
    onSave: () => void;
    onUpdate?: (momentId: string, note: string) => Promise<boolean>;
    onCancel: () => void;
    formatTime: (seconds: number) => string;
    onPreview?: () => void;
    isPreviewing?: boolean;
    focusTrigger?: number;
}

export default function MomentEditor({
    isOpen,
    note,
    startSec,
    endSec,
    editingMomentId,
    currentUser,
    onNoteChange,
    onSave,
    onUpdate,
    onCancel,
    formatTime,
    onPreview,
    isPreviewing,
    focusTrigger
}: MomentEditorProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Focus on trigger change
    useEffect(() => {
        if (isOpen && focusTrigger && focusTrigger > 0) {
            textareaRef.current?.focus();
        }
    }, [focusTrigger, isOpen]);

    if (!isOpen) return null;

    const handleSaveClick = async () => {
        if (editingMomentId && onUpdate) {
            const success = await onUpdate(editingMomentId, note);
            if (success) {
                onCancel();
            }
        } else {
            onSave();
        }
    };

    const handleKeyDown = async (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (note.trim()) {
                await handleSaveClick();
            }
        }
    };

    return (
        <div data-moment-editor className="glass-panel p-3 space-y-3 animate-in slide-in-from-right-2 duration-200">
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
                    <span className="text-xs font-medium text-white/80">
                        {editingMomentId ? 'Editing Moment' : 'New Moment Note'}
                    </span>
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
                    onChange={(e) => onNoteChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="What's happening in this moment?"
                    className="w-full h-24 bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-orange-500/50 resize-none scrollbar-thin scrollbar-thumb-white/20 font-serif leading-relaxed"
                />

                <div className="flex items-center justify-between gap-2 mt-2">
                    <div className="flex gap-2">
                        <button
                            onClick={onCancel}
                            className="p-1.5 rounded-md hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                            title="Cancel"
                        >
                            <X size={16} />
                        </button>

                        {/* Preview Play Button */}
                        {onPreview && (
                            <button
                                onClick={onPreview}
                                className={`p-1.5 rounded-md hover:bg-white/10 transition-colors ${isPreviewing ? 'text-orange-400' : 'text-white/60 hover:text-white'}`}
                                title={isPreviewing ? "Stop Preview" : "Play Preview"}
                            >
                                {isPreviewing ? (
                                    <Square size={16} className="fill-current" />
                                ) : (
                                    <Play size={16} className="fill-current" />
                                )}
                            </button>
                        )}
                    </div>

                    {/* Save/Update Button */}
                    <button
                        onClick={handleSaveClick}
                        disabled={!note.trim()}
                        className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed text-black text-xs font-bold rounded-lg shadow-lg shadow-orange-500/20 flex items-center gap-1.5 animate-in slide-in-from-left-2 transition-colors"
                    >
                        <Star size={12} className={!note.trim() ? "fill-gray-400" : "fill-black"} />
                        {editingMomentId ? 'Update Moment' : 'Save Moment'}
                    </button>
                </div>
            </div>
        </div>
    );
}
