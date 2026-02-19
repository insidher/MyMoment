"use client";

import { X } from "lucide-react";
import { Moment } from "@/types";
import MomentCard from "./MomentCard";
import { useEffect } from "react";

interface MomentDetailModalProps {
    moment: Moment | null;
    onClose: () => void;
    onPlayMoment?: (moment: Moment) => void;
    onPauseMoment?: (moment: Moment) => void;
    isPlaying?: boolean;
    currentTime?: number;
    currentTime?: number;
    currentUserId?: string;
    currentUser?: { id: string; name?: string | null; image?: string | null };
    onShare?: (moment: Moment) => void;
}

export default function MomentDetailModal({
    moment,
    onClose,
    onPlayMoment,
    onPauseMoment,
    isPlaying,
    currentTime,
    currentUserId,
    currentUser,
    onShare,
}: MomentDetailModalProps) {
    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    if (!moment) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-lg bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl overflow-visible animate-in zoom-in-95 duration-200">
                {/* Close Button - Exterior */}
                <button
                    onClick={onClose}
                    className="absolute -top-12 right-0 z-50 p-2 rounded-full bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-colors border border-white/10 backdrop-blur-md"
                >
                    <X size={20} />
                </button>

                {/* Reuse MomentCard with all features enabled */}
                <MomentCard
                    moment={moment}
                    showCommentButton={true}
                    isActive={false} // Static view, but allow playback interaction
                    variant="modal"
                    onShare={onShare}
                    isPlaying={isPlaying}
                    currentTime={currentTime}
                    onPlayMoment={(m) => {
                        onClose(); // Close modal first
                        onPlayMoment?.(m); // Then play
                    }}
                    onPauseMoment={onPauseMoment}
                    // Pass implied props for full interactivity if needed
                    onDelete={undefined} // don't allow delete from modal for now
                />
            </div>
        </div>
    );
}
