'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Sparkles, Compass, User, LogOut, Search, Music, Home, Menu, ArrowRight, X, Info, MessageSquare, ChevronDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFilter } from '@/context/FilterContext';
import { useState, useEffect } from 'react';
import { checkIsAdmin } from '../../app/admin/feedback/actions';
import FeedbackModal from './FeedbackModal';

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, signOut } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [showMenu, setShowMenu] = useState(false);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const checkAdmin = async () => {
            if (!user) {
                setIsAdmin(false);
                return;
            }
            const { isAdmin } = await checkIsAdmin();
            setIsAdmin(isAdmin || false);
        };
        checkAdmin();
    }, [user]);


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
        <>
            <nav className="fixed top-0 left-0 right-0 h-16 bg-black/50 backdrop-blur-xl border-b border-white/5 z-50 flex items-center px-4 justify-between gap-4">

                {/* Left: Mobile Menu & Logo */}
                <div className="flex items-center gap-4 shrink-0">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-2 -ml-2 text-white/70 hover:text-white transition-colors"
                    >
                        {showMenu ? <X size={20} /> : <Menu size={20} />}
                    </button>

                    <Link href="/" className="font-bold text-xl tracking-tight flex items-center">
                        <span className="text-green-500">My</span>
                        <span className="ml-[0.2em] text-green-500">M</span>
                        <span className="relative inline-block px-[1px]">
                            <span className="absolute inset-0 bg-orange-600/60 rounded md:bg-orange-600/60 ring-1 ring-inset ring-orange-400/80" />
                            <span className="relative z-10 text-black">ome</span>
                        </span>
                        <span className="text-green-500">nt</span>
                    </Link>
                </div>

                {/* Center: Search Bar (Hidden on Home Page) */}
                {pathname !== '/' && (
                    <form onSubmit={handleSearch} className="flex-1 max-w-2xl flex items-center group">
                        <div className="flex-1 flex items-center bg-white/5 border border-white/5 border-r-0 rounded-l-full px-4 h-10 transition-colors focus-within:bg-white/10 focus-within:border-white/10">
                            <Search size={16} className="text-white/40 mr-3 shrink-0" />
                            <input
                                id="navbar-search-input"
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Paste a YouTube or Spotify link..."
                                className="bg-transparent border-none outline-none text-sm text-white placeholder-white/40 w-full"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!searchQuery.trim()}
                            className="px-6 h-10 bg-[#7c2a0c] hover:bg-[#9a3412] text-white/90 text-sm font-medium rounded-r-full transition-colors border-l border-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Search
                        </button>
                    </form>
                )}

                {/* Right: Actions */}
                <div className="flex items-center gap-4 shrink-0">
                    <button
                        onClick={() => setIsFeedbackOpen(true)}
                        className="hidden md:flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 px-4 py-2 rounded-full transition-colors text-sm font-medium text-white/80 hover:text-white"
                    >
                        <span>Send Feedback</span>
                    </button>

                    {user ? (
                        <div className="relative group">
                            <Link href="/profile">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-purple-500/20 transform transition-transform group-hover:scale-105">
                                    {user.user_metadata?.avatar_url ? (
                                        <img src={user.user_metadata.avatar_url} alt="User" className="w-full h-full rounded-full" />
                                    ) : (
                                        (user.email?.[0]?.toUpperCase() || 'U')
                                    )}
                                </div>
                            </Link>
                        </div>
                    ) : (
                        <Link
                            href="/login"
                            className="text-sm font-medium text-white/70 hover:text-white transition-colors"
                        >
                            Log in
                        </Link>
                    )}
                </div>
            </nav>

            {/* Mobile Menu Dropdown */}
            {showMenu && (
                <div className="fixed top-16 left-0 w-64 h-[calc(100vh-4rem)] bg-black/95 backdrop-blur-xl border-r border-white/10 z-40 p-4 space-y-2 animate-in slide-in-from-left duration-200">
                    <Link
                        href="/"
                        onClick={() => setShowMenu(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive('/') ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                    >
                        <Home size={20} />
                        <span className="font-medium">Home</span>
                    </Link>
                    <Link
                        href="/explore"
                        onClick={() => setShowMenu(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive('/explore') ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                    >
                        <Compass size={20} />
                        <span className="font-medium">Explore</span>
                    </Link>
                    <Link
                        href="/about"
                        onClick={() => setShowMenu(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive('/about') ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                    >
                        <Info size={20} />
                        <span className="font-medium">Community Notes</span>
                    </Link>

                    {isAdmin && (
                        <Link
                            href="/admin/feedback"
                            onClick={() => setShowMenu(false)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive('/admin/feedback') ? 'bg-white/10 text-white' : 'text-purple-400 hover:bg-white/5 hover:text-purple-300'}`}
                        >
                            <MessageSquare size={20} />
                            <span className="font-medium">Admin Feedback</span>
                        </Link>
                    )}

                    <div className="h-px bg-white/10 my-4" />

                    {user && (
                        <button
                            onClick={() => setIsFeedbackOpen(true)}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:bg-white/5 hover:text-white transition-colors text-left"
                        >
                            <MessageSquare size={20} />
                            <span className="font-medium">Send Feedback</span>
                        </button>
                    )}
                </div>
            )}

            <FeedbackModal
                isOpen={isFeedbackOpen}
                onClose={() => setIsFeedbackOpen(false)}
            />
        </>
    );
}
