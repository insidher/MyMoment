'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Sparkles, Compass, User, LogOut, Search, Music, Home, Menu, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFilter } from '@/context/FilterContext';
import { useState } from 'react';

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, signOut } = useAuth();
    const { showSpotify, toggleSpotify } = useFilter();
    const [searchQuery, setSearchQuery] = useState('');
    const [showMenu, setShowMenu] = useState(false);

    const isActive = (path: string) => pathname === path;

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        if (searchQuery.includes('.') || searchQuery.includes('http')) {
            router.push(`/room/view?url=${encodeURIComponent(searchQuery)}`);
        } else {
            router.push(`/explore?q=${encodeURIComponent(searchQuery)}`);
        }
        setSearchQuery('');
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
            <div className="max-w-7xl mx-auto px-4">
                {/* Single Row: Logo with Menu, Search, User */}
                <div className="h-14 flex items-center justify-between gap-4">
                    {/* Logo with Dropdown Menu */}
                    <div className="relative flex-shrink-0">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="flex items-center gap-2 group"
                        >
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Sparkles size={18} className="text-white" />
                            </div>
                            <span className="font-bold text-xl tracking-tight hidden sm:block">MyMoment.io</span>
                        </button>

                        {/* Dropdown Menu */}
                        {showMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowMenu(false)}
                                />
                                <div className="absolute top-full left-0 mt-2 w-48 bg-black/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
                                    <Link
                                        href="/"
                                        onClick={() => setShowMenu(false)}
                                        className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${isActive('/')
                                            ? 'bg-white/10 text-white'
                                            : 'text-white/70 hover:bg-white/5 hover:text-white'
                                            }`}
                                    >
                                        <Home size={16} />
                                        Home
                                    </Link>
                                    <Link
                                        href="/explore"
                                        onClick={() => setShowMenu(false)}
                                        className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${isActive('/explore')
                                            ? 'bg-white/10 text-white'
                                            : 'text-white/70 hover:bg-white/5 hover:text-white'
                                            }`}
                                    >
                                        <Compass size={16} />
                                        Explore
                                    </Link>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Search Bar (Centered) */}
                    <form onSubmit={handleSearch} className="flex-1 max-w-xl mx-4">
                        <div className="relative group flex items-center gap-2">
                            <div className="flex-1 relative">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-white/30 group-focus-within:text-purple-400 transition-colors">
                                    <Search size={16} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Paste a YouTube or Spotify link..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:bg-white/10 focus:border-purple-500/50 transition-all"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={!searchQuery.trim()}
                                className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-orange-900/30 hover:scale-105 active:scale-95 flex-shrink-0"
                                title="Submit"
                            >
                                <Search size={16} strokeWidth={2.5} />
                            </button>
                        </div>
                    </form>

                    {/* User Menu */}
                    <div className="flex-shrink-0">
                        {user ? (
                            <div className="flex items-center gap-3">
                                {/* Spotify Filter Toggle */}
                                <button
                                    onClick={toggleSpotify}
                                    className={`p-2 rounded-full transition-all ${showSpotify
                                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                        : 'bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/50'
                                        }`}
                                    title={showSpotify ? 'Hide Spotify moments' : 'Show Spotify moments'}
                                >
                                    <Music size={18} />
                                </button>
                                <Link href="/profile" className="flex items-center gap-2 hover:bg-white/5 px-2 py-1.5 rounded-full transition-colors">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold">
                                        {user.email?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                    <span className="text-sm font-medium hidden md:block">{user.email?.split('@')[0] || 'User'}</span>
                                </Link>
                                <button
                                    onClick={() => signOut()}
                                    className="text-white/40 hover:text-white transition-colors p-2"
                                    title="Sign Out"
                                >
                                    <LogOut size={18} />
                                </button>
                            </div>
                        ) : (
                            <Link
                                href="/login"
                                className="px-5 py-2 rounded-full bg-white text-black text-sm font-bold hover:bg-gray-200 transition-colors"
                            >
                                Sign In
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
