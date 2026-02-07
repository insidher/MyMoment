'use client';

import React from 'react';
import { X, Youtube, Music } from 'lucide-react';

interface SourceSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SourceSelectorModal({ isOpen, onClose }: SourceSelectorModalProps) {
    if (!isOpen) return null;

    const handleYouTubeClick = () => {
        onClose();
        window.open('https://youtube.com', '_blank');
    };

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 max-w-lg w-full shadow-2xl space-y-8 animate-in zoom-in-95 duration-200 relative overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Background Splashes */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                <div className="text-center space-y-2 relative z-10">
                    <h2 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
                        Find Your Part 🎬
                    </h2>
                    <p className="text-white/60">
                        Pick a platform to start capturing your favorite moments.
                    </p>
                </div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-white/40 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="grid grid-cols-2 gap-4 relative z-10">
                    {/* YouTube Button */}
                    <button
                        onClick={handleYouTubeClick}
                        className="group relative overflow-hidden bg-black border border-white/10 hover:border-white/30 p-6 rounded-xl transition-all active:scale-95 flex flex-col items-center justify-center gap-3"
                    >
                        <div className="w-12 h-12 rounded-full bg-[#ff0000] flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                            <Youtube size={24} />
                        </div>
                        <span className="font-bold text-white tracking-wide">YouTube</span>
                    </button>

                    {/* Spotify Button */}
                    <div className="relative group">
                        <button
                            disabled
                            className="w-full bg-[#1db954]/5 border border-[#1db954]/10 p-6 rounded-xl flex flex-col items-center justify-center gap-3 opacity-50 cursor-not-allowed"
                        >
                            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-[#1db954]">
                                <Music size={24} />
                            </div>
                            <span className="font-bold text-white tracking-wide">Spotify</span>
                        </button>
                        <div className="absolute top-2 right-2 bg-zinc-800 text-[8px] font-bold text-[#1db954] px-1.5 py-0.5 rounded border border-[#1db954]/20 uppercase tracking-tighter shadow-lg group-hover:rotate-2 transition-transform">
                            Coming Soon
                        </div>
                    </div>
                </div>

                <div className="bg-orange-500/5 border border-orange-500/10 rounded-xl p-4 text-center">
                    <p className="text-xs text-orange-200/60 leading-relaxed font-medium">
                        Found a clip? Just paste the URL in the search bar above to start editing!
                    </p>
                </div>
            </div>
        </div>
    );
}
