'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight, Compass } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
    const [url, setUrl] = useState('');
    const router = useRouter();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (url.trim()) {
            router.push(`/room/new?url=${encodeURIComponent(url)}`);
        }
    };

    return (
        <main className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] -z-10" />
            <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-blue-600/10 rounded-full blur-[100px] -z-10" />

            <div className="w-full max-w-3xl text-center space-y-10">

                {/* Hero Text */}
                <div className="space-y-4 animate-fade-in">
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">
                        Capture the feeling.
                    </h1>
                    <p className="text-xl text-white/60 max-w-2xl mx-auto">
                        Save and share your favorite parts of songs and videos.
                        <br />
                        No more "skip to 2:45".
                    </p>
                </div>

                {/* Search / Paste Input */}
                <form onSubmit={handleSubmit} className="relative group max-w-2xl mx-auto w-full">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity" />
                    <div className="relative flex items-center bg-white/5 border border-white/10 rounded-2xl p-2 backdrop-blur-xl transition-all focus-within:bg-white/10 focus-within:border-white/20 focus-within:ring-1 focus-within:ring-white/20">
                        <Search className="ml-4 text-white/40" size={24} />
                        <input
                            type="text"
                            placeholder="Paste a Spotify or YouTube link..."
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className="w-full bg-transparent border-none px-4 py-4 text-lg text-white placeholder:text-white/30 focus:outline-none"
                        />
                        <button
                            type="submit"
                            disabled={!url.trim()}
                            className="bg-white text-black p-3 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ArrowRight size={24} />
                        </button>
                    </div>
                </form>

                {/* Spotify Helper (Only visible when Spotify link is detected) */}
                {url.includes('spotify.com') && (
                    <div className="animate-fade-in max-w-2xl mx-auto w-full glass-panel p-4 text-left space-y-3">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-[#1DB954]/20 rounded-lg">
                                <svg className="w-6 h-6 text-[#1DB954]" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                                </svg>
                            </div>
                            <div className="space-y-2 flex-1">
                                <p className="text-white font-medium">Spotify Premium Required</p>
                                <p className="text-sm text-white/60">
                                    To play full songs, you must be signed in to Spotify Premium in this browser.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => window.open('https://accounts.spotify.com/login', '_blank', 'noopener,noreferrer')}
                                    className="text-sm bg-[#1DB954] text-black font-bold px-4 py-2 rounded-full hover:bg-[#1ed760] transition-colors"
                                >
                                    Sign in to Spotify
                                </button>
                            </div>
                        </div>
                        <div className="pt-3 border-t border-white/10">
                            <p className="text-xs text-white/40">
                                Don't have Premium? <span className="text-white/60">Paste a YouTube link instead.</span>
                            </p>
                        </div>
                    </div>
                )}

                {/* Secondary CTA: Plaza */}
                <div className="pt-4 animate-fade-in-delay">
                    <Link
                        href="/explore"
                        className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors px-6 py-3 rounded-full hover:bg-white/5"
                    >
                        <Compass size={18} />
                        <span>Just looking? <strong>Explore the Plaza</strong></span>
                    </Link>
                </div>

            </div>
        </main>
    );
}
