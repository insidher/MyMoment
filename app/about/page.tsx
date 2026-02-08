'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight, Share2, Youtube, Music, Sparkles, X } from 'lucide-react';

const TimelineIcon = () => (
    <div className="w-full h-24 bg-black/40 rounded-xl border border-white/10 flex flex-col items-center justify-center relative overflow-hidden group-hover:border-white/20 transition-colors">
        {/* Top Controls (Visual Mock) */}
        <div className="flex items-center gap-2 text-[8px] font-mono text-white/30 mb-2 opacity-50">
            <span>-10m</span>
            <span>-1m</span>
            <div className="w-3 h-3 rounded-full border border-white/20" /> {/* Undo */}
            <div className="w-0 h-0 border-l-[6px] border-l-white/60 border-y-[4px] border-y-transparent mx-1" /> {/* Play */}
            <div className="w-3 h-3 rounded-full border border-white/20" /> {/* Redo */}
            <span>+1m</span>
            <span>+10m</span>
        </div>

        {/* Timeline Track */}
        <div className="w-4/5 h-1.5 bg-white/10 rounded-full relative">
            {/* Green Progress */}
            <div className="absolute left-0 top-0 bottom-0 w-[30%] bg-green-500 rounded-l-full" />

            {/* Edit Range Pill */}
            <div className="absolute left-[30%] right-[30%] top-1/2 -translate-y-1/2 h-5 bg-[#1a2332] border-x-2 border-orange-500/50 flex items-center justify-center z-10">
                <span className="text-[8px] font-bold text-blue-200 tracking-wider">EDIT</span>
                {/* Handles */}
                <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-black" />
                <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-black" />
            </div>
        </div>
    </div>
);

export default function Home() {
    const [url, setUrl] = useState('');
    const [showTutorial, setShowTutorial] = useState(false);
    const [showSourcePopup, setShowSourcePopup] = useState(false);
    const router = useRouter();

    const handleSourceClick = (url: string) => {
        window.open(url, '_blank');
        setShowSourcePopup(false);
        // Focus search bar after closing
        setTimeout(() => {
            const input = document.getElementById('navbar-search-input');
            input?.focus();
        }, 300);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (url.trim()) {
            if (url.includes('.') || url.includes('http')) {
                router.push(`/room/new?url=${encodeURIComponent(url)}`);
            } else {
                router.push(`/explore?q=${encodeURIComponent(url)}`);
            }
        }
    };

    return (
        <main className="h-screen w-full bg-black text-white flex flex-col pt-16 overflow-hidden relative selection:bg-green-500/30">
            {/* Background Gradients */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[50vh] bg-green-900/10 rounded-full blur-[120px] -z-10" />
            <div className="absolute bottom-0 right-0 w-[60vw] h-[40vh] bg-orange-900/10 rounded-full blur-[100px] -z-10" />

            <div className="flex-1 flex flex-col justify-start items-center p-4 md:p-8 max-w-7xl mx-auto w-full gap-8 md:gap-12 pt-12 md:pt-24">

                {/* Header */}
                <div className="text-center space-y-12 md:space-y-24 animate-in fade-in slide-in-from-bottom-4 duration-700 relative z-20 w-full">
                    <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-16 text-4xl md:text-6xl font-black tracking-tighter">
                        <span className="text-[#022c22] [-webkit-text-stroke:1.5px_rgb(34_197_94)]">Discover</span>

                        {/* Interactive Curate 'Capture' Pill */}
                        <div
                            className="relative group cursor-pointer inline-flex items-center justify-center px-6 py-1 bg-[#1a2332] rounded-lg hover:scale-105 transition-transform"
                            onClick={() => setShowTutorial(true)}
                        >
                            <span className="text-[#431407] [-webkit-text-stroke:1.5px_rgb(249_115_22)] relative z-10">Curate</span>

                            {/* Left Handle */}
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[140%] w-[3px] bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.3)]">
                                <div className="absolute right-[calc(50%+4px)] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-orange-500 border-2 border-black shadow-md" />
                            </div>

                            {/* Right Handle */}
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-[140%] w-[3px] bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.3)]">
                                <div className="absolute left-[calc(50%+4px)] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-orange-500 border-2 border-black shadow-md" />
                            </div>

                            {/* Tutorial Tooltip */}
                            {showTutorial && (
                                <div className="absolute bottom-full mb-6 left-1/2 -translate-x-1/2 w-80 md:w-96 bg-zinc-900 border border-orange-500/50 p-5 rounded-xl shadow-2xl z-50 animate-in fade-in zoom-in-95 tracking-normal">
                                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-zinc-900 border-b border-r border-orange-500/50 rotate-45" />
                                    <p className="text-sm text-white/90 leading-relaxed font-medium text-left">
                                        Paste a YouTube link of new long-form content.
                                    </p>
                                    <p className="text-xs text-white/50 mt-2 text-left">
                                        Like a video podcast, music video, or learning video.
                                    </p>

                                    {/* Arrow pointing up to navbar search bar */}
                                    <div className="flex justify-center mt-4">
                                        <ArrowRight className="text-orange-500 -rotate-90 animate-bounce" size={20} />
                                    </div>
                                </div>
                            )}
                        </div>

                        <span className="text-[#022c22] [-webkit-text-stroke:1.5px_rgb(34_197_94)]">Share</span>
                    </div>

                    {/* Central Search Bar */}
                    <div className="w-full max-w-2xl mx-auto relative group">
                        <form onSubmit={handleSubmit} className="relative flex items-center">
                            <div className="absolute left-4 text-white/40">
                                <Search size={20} />
                            </div>
                            <input
                                type="text"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="Paste a YouTube or Spotify link..."
                                className="w-full bg-white/5 border border-white/10 rounded-full py-4 pl-12 pr-32 text-lg text-white placeholder-white/30 focus:outline-none focus:bg-white/10 focus:border-white/20 transition-all shadow-xl backdrop-blur-sm"
                                id="navbar-search-input"
                            />
                            <button
                                type="submit"
                                disabled={!url.trim()}
                                className="absolute right-2 px-6 py-2 bg-[#7c2a0c] hover:bg-[#9a3412] text-white font-medium rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Go
                            </button>
                        </form>
                    </div>
                </div>

                {/* Steps Section - Aligned Text */}
                <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 w-full animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100 transition-opacity duration-300 ${showTutorial || showSourcePopup ? 'opacity-20 blur-sm pointer-events-none' : 'opacity-100'}`}>

                    {/* Step 1: Find Source */}
                    <div
                        onClick={() => setShowSourcePopup(true)}
                        className="group flex flex-col items-center text-center gap-4 cursor-pointer"
                    >
                        <div className="h-32 flex items-center justify-center">
                            <div className="w-16 h-16 flex items-center justify-center text-gray-400 group-hover:scale-110 transition-transform">
                                <Search size={48} strokeWidth={1.5} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-bold text-xl text-green-100">Find Source</h3>
                            <p className="text-sm text-white/40 leading-snug max-w-[200px] mx-auto">
                                Paste a YouTube or Spotify link to load it instantly.
                            </p>
                        </div>
                    </div>

                    {/* Step 2: Select Range (Tutorial) */}
                    <div
                        onClick={() => window.open('/room/view?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3D9ijtLo3d_bI', '_blank')}
                        className="group flex flex-col items-center text-center gap-4 cursor-pointer"
                    >
                        <div className="h-32 flex items-center justify-center">
                            <div className="scale-125 group-hover:scale-[1.35] transition-transform duration-300">
                                <TimelineIcon />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-bold text-xl text-orange-100">Select Range</h3>
                            <p className="text-sm text-white/40 leading-snug max-w-[200px] mx-auto">
                                Drag handles to pick your part.
                            </p>
                        </div>
                    </div>

                    {/* Step 3: Share It */}
                    <div className="group flex flex-col items-center text-center gap-4">
                        <div className="h-32 flex items-center justify-center">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center text-blue-400">
                                <Share2 size={28} strokeWidth={2.5} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-bold text-xl text-blue-100 flex items-center gap-2">
                                Share It
                                <span className="text-[9px] uppercase tracking-widest bg-blue-500/20 text-blue-200 px-2 py-0.5 rounded-full border border-blue-500/30">Coming Soon</span>
                            </h3>
                            <p className="text-sm text-white/40 leading-snug max-w-[200px] mx-auto">
                                Save to profile & share.
                            </p>
                        </div>
                    </div>

                </div>
            </div>

            {/* Tutorial Dimmer Overlay */}
            {showTutorial && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-10 animate-in fade-in duration-300"
                    onClick={() => setShowTutorial(false)}
                />
            )}

            {/* Source Selection Popup */}
            {showSourcePopup && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowSourcePopup(false)}>
                    <div
                        className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 max-w-lg w-full shadow-2xl space-y-8 animate-in zoom-in-95 duration-200 relative overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Background Splashes */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                        <div className="text-center space-y-2 relative z-10">
                            <h2 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
                                Let's Go Hunting! 🎬
                            </h2>
                            <p className="text-white/60">
                                Find your content, <span className="text-white font-bold">copy the link</span>, and paste it back here.
                            </p>
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={() => setShowSourcePopup(false)}
                            className="absolute top-4 right-4 p-2 text-white/40 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>

                        {/* Premium Warning */}
                        <div className="bg-green-900/10 border border-green-500/20 rounded-xl p-4 flex gap-3 text-left relative z-10">
                            <div className="shrink-0 mt-0.5 text-green-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" /><path d="M9 18h6" /><path d="M10 22h4" /></svg>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-green-200">Pro Tip: Premium Works Best</p>
                                <p className="text-xs text-green-200/60 leading-relaxed">
                                    Ads can interrupt the capture flow. We're working on a fix, but for now, a premium account gives the smoothest experience!
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 relative z-10">
                            {/* YouTube Button */}
                            <button
                                onClick={() => handleSourceClick('https://www.youtube.com')}
                                className="group relative overflow-hidden bg-black border border-white/10 hover:border-white/30 p-6 rounded-xl transition-all active:scale-95 flex flex-col items-center justify-center gap-3"
                            >
                                <div className="w-12 h-12 rounded-full bg-[#ff0000] flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor"></polygon></svg>
                                </div>
                                <span className="font-bold text-white tracking-wide">YouTube</span>
                            </button>

                            {/* Spotify Button */}
                            <button
                                onClick={() => handleSourceClick('https://open.spotify.com')}
                                className="group relative overflow-hidden bg-[#1db954]/10 hover:bg-[#1db954]/20 border border-[#1db954]/20 hover:border-[#1db954]/50 p-6 rounded-xl transition-all active:scale-95 flex flex-col items-center justify-center gap-3"
                            >
                                <div className="w-12 h-12 rounded-full bg-[#1db954] flex items-center justify-center text-black shadow-lg group-hover:scale-110 transition-transform">
                                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14.5c2.5 1.5 6.5 1.5 8 0"></path><path d="M7 11.5c2.5 1.5 7.5 1.5 10 0"></path><path d="M6 8.5c2.5 1.5 9.5 1.5 12 0"></path></svg>
                                </div>
                                <span className="font-bold text-white tracking-wide">Spotify</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
