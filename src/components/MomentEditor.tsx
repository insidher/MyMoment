'use client';

import { useRef, useEffect } from 'react';

import { X, Star, Send, Play, Square } from 'lucide-react';
import UserAvatar from './UserAvatar';

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
                    <UserAvatar
                        name={currentUser?.name}
                        image={currentUser?.image}
                        size="w-6 h-6"
                    />
                    <span className="text-xs font-medium text-white/80">
                        {editingMomentId ? 'Editing Moment' : 'New Moment Note'}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={onCancel}
                        className="p-1.5 rounded-md hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                        title="Cancel"
                    >
                        <X size={14} />
                    </button>

                    {onPreview && (
                        <button
                            onClick={onPreview}
                            className={`p-1.5 rounded-md hover:bg-white/10 transition-colors ${isPreviewing ? 'text-orange-400' : 'text-white/40 hover:text-white'}`}
                            title={isPreviewing ? "Stop Preview" : "Play Preview"}
                        >
                            {isPreviewing ? (
                                <Square size={14} className="fill-current" />
                            ) : (
                                <Play size={14} className="fill-current" />
                            )}
                        </button>
                    )}

                    <button
                        onClick={handleSaveClick}
                        disabled={!note.trim()}
                        className="px-3 py-1 bg-orange-500 hover:bg-orange-600 disabled:bg-white/5 disabled:text-white/20 disabled:cursor-not-allowed text-black text-[10px] font-black uppercase rounded-md shadow-lg shadow-orange-500/10 transition-colors"
                    >
                        {editingMomentId ? 'Update' : 'Save'}
                    </button>
                </div>
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

            </div>
        </div>
    );
}
