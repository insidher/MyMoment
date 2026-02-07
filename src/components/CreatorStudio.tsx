import React, { useEffect, useRef } from 'react';

interface CreatorStudioProps {
    note: string;
    onNoteChange: (val: string) => void;
    onSave: () => void;
    onCancel: () => void;
    isUpdate?: boolean;
}

export default function CreatorStudio({
    note,
    onNoteChange,
    onSave,
    onCancel,
    isUpdate = false
}: CreatorStudioProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        // Auto-focus on mount
        textareaRef.current?.focus();
    }, []);

    return (
        <div className="flex flex-col min-h-[60vh] bg-neutral-900 p-4 border-t border-white/10 animate-in slide-in-from-bottom-5 duration-300">
            {/* Header: Actions */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-white/30 uppercase tracking-widest">
                    Post Note
                </h3>
                <div className="flex items-center gap-3">
                    <button
                        onClick={onCancel}
                        className="px-3 py-1.5 text-xs font-medium text-white/40 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onSave}
                        className="px-4 py-1.5 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors shadow-lg shadow-orange-500/20"
                    >
                        {isUpdate ? 'Update Moment' : 'Save Moment'}
                    </button>
                </div>
            </div>

            {/* Text Area */}
            <textarea
                ref={textareaRef}
                value={note}
                onChange={(e) => onNoteChange(e.target.value)}
                className="flex-1 w-full bg-transparent text-lg text-white resize-none focus:outline-none placeholder:text-white/20"
                placeholder="What's happening in this moment?"
            />
        </div>
    );
}
