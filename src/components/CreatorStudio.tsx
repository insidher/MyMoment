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
            {/* Header / Title (Optional, keeping it clean for now as requested) */}

            {/* Text Area */}
            <textarea
                ref={textareaRef}
                value={note}
                onChange={(e) => onNoteChange(e.target.value)}
                className="flex-1 w-full bg-transparent text-lg text-white resize-none focus:outline-none placeholder:text-white/30"
                placeholder="What's happening in this moment?"
            />

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 mt-auto">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={onSave}
                    className="px-6 py-2 text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors shadow-lg shadow-orange-500/20"
                >
                    {isUpdate ? 'Update Moment' : 'Save Moment'}
                </button>
            </div>
        </div>
    );
}
