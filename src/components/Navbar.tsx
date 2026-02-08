'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Sparkles, Compass, User, LogOut, Search, Music, Home, Menu, ArrowRight, ArrowLeft, X, Info, MessageSquare, ChevronDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFilter } from '@/context/FilterContext';
import { useState, useEffect, useRef } from 'react';
import { checkIsAdmin } from '../../app/admin/feedback/actions';
import FeedbackModal from './FeedbackModal';
import SourceSelectorModal from './SourceSelectorModal';
import UserAvatar from './UserAvatar';
import SearchBar from './SearchBar';

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, signOut } = useAuth();
    const [showMenu, setShowMenu] = useState(false);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isCreatorMode, setIsCreatorMode] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [isSourceSelectorOpen, setIsSourceSelectorOpen] = useState(false);

    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                showMenu &&
                menuRef.current &&
                !menuRef.current.contains(event.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setShowMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showMenu]);

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

    // Sync Creator Mode from body class
    useEffect(() => {
        const checkMode = () => {
            const hasClass = document.body.classList.contains('is-creator-mode');
            if (hasClass !== isCreatorMode) {
                setIsCreatorMode(hasClass);
            }
        };

        const observer = new MutationObserver(checkMode);
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

        // Initial check
        checkMode();

        return () => observer.disconnect();
    }, [isCreatorMode]);


    const isActive = (path: string) => pathname === path;


    return (
        <>
            <nav className="fixed top-0 left-0 right-0 h-16 bg-black/50 backdrop-blur-xl border-b border-white/5 z-[50] flex items-center px-4 gap-4">

                {/* Left Area: Menu & Logo */}
                <div className={`flex-1 flex items-center transition-all duration-300 opacity-100 visible`}>
                    <div className="flex items-center gap-1 md:gap-4 shrink-0">
                        <button
                            ref={buttonRef}
                            onClick={() => setShowMenu(!showMenu)}
                            className="p-2 -ml-2 text-white/70 hover:text-white transition-colors"
                        >
                            {showMenu ? <X size={20} /> : <Menu size={20} />}
                        </button>

                        <Link href="/" className="font-bold text-lg md:text-xl tracking-tight flex items-center shrink-0 -ml-1 md:ml-0">
                            <span className="text-green-500">My</span>
                            <span className="ml-[0.1em] text-green-500">M</span>
                            <span className="relative inline-block px-[1px]">
                                <span className="absolute inset-0 bg-orange-600/60 rounded ring-1 ring-inset ring-orange-400/80" />
                                <span className="relative z-10 text-black hidden sm:inline">ome</span>
                                <span className="relative z-10 text-black sm:hidden">o</span>
                            </span>
                            <span className="text-green-500 hidden sm:inline">nt</span>
                        </Link>

                        {isCreatorMode && (
                            <div className="flex items-center ml-2 border-l border-white/10 pl-4 h-6 animate-in fade-in slide-in-from-left-2 duration-500">
                                <h1 className="text-[11px] font-black tracking-[0.2em] uppercase text-[#E5D3B3] flex items-center gap-2"
                                    style={{
                                        textShadow: '0px 0px 10px rgba(229, 211, 179, 0.2)'
                                    }}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#E5D3B3] animate-pulse" />
                                    Capture Studio
                                </h1>
                            </div>
                        )}
                    </div>
                </div>

                {/* Center Area: Search Bar - Locked Visible */}
                <div className={`flex-[3] md:flex-[2] transition-all duration-300 flex justify-center items-center`}>
                    {!isCreatorMode && <SearchBar />}
                </div>

                {/* Right Area: Actions */}
                <div className={`flex-1 flex items-center justify-end gap-2 md:gap-4 shrink-0 transition-opacity duration-300 opacity-100 visible`}>
                    {/* Send Feedback removed from here as requested */}

                    {user ? (
                        <div className="relative group">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowProfileMenu(!showProfileMenu);
                                }}
                                className="w-9 h-9 transform transition-transform active:scale-95 md:group-hover:scale-105"
                            >
                                <UserAvatar
                                    name={user.email}
                                    image={user.user_metadata?.avatar_url}
                                    size="w-9 h-9"
                                />
                            </button>

                            {/* Dropdown Menu */}
                            <div className={`absolute right-0 top-full mt-2 w-64 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl transition-all duration-200 z-50 ${showProfileMenu ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}`}>
                                <div className="p-4 border-b border-white/10">
                                    <p className="font-bold text-white truncate">{user.email?.split('@')[0] || 'User'}</p>
                                    <p className="text-xs text-white/40 truncate">{user.email}</p>
                                </div>
                                <div className="p-2">
                                    <Link
                                        href="/profile"
                                        onClick={() => setShowProfileMenu(false)}
                                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-white/80 hover:text-white"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        <span className="text-sm">Profile</span>
                                    </Link>
                                    <button
                                        onClick={() => {
                                            setShowProfileMenu(false);
                                            // Navigate to profile with settings open
                                            window.location.href = '/profile?settings=true';
                                        }}
                                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-white/80 hover:text-white"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span className="text-sm">Settings</span>
                                    </button>
                                    <div className="mt-2 pt-2 border-t border-white/5 px-3 pb-1">
                                        <span className="text-white/40 text-xs">v0.1.8</span>
                                    </div>
                                </div>
                            </div>
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

            {/* Profile Menu Backdrop */}
            {showProfileMenu && (
                <div
                    className="fixed inset-0 bg-transparent z-40"
                    onClick={() => setShowProfileMenu(false)}
                />
            )}

            {/* Mobile Menu Dropdown */}
            {showMenu && (
                <div ref={menuRef} className="fixed top-16 left-0 w-72 h-[calc(100vh-4rem)] bg-[#050505]/95 backdrop-blur-2xl border-r border-white/10 z-[60] p-4 flex flex-col animate-in slide-in-from-left duration-300 shadow-2xl">
                    <div className="flex-1 space-y-1">
                        <Link
                            href="/"
                            onClick={() => setShowMenu(false)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive('/explore') ? 'bg-white/10 text-white shadow-inner' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                        >
                            <Compass size={20} />
                            <span className="font-semibold">Discover</span>
                        </Link>

                        <button
                            onClick={() => {
                                setShowMenu(false);
                                setIsSourceSelectorOpen(true);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:bg-white/5 hover:text-white transition-all duration-200 text-left"
                        >
                            <Search size={20} />
                            <span className="font-semibold">Find Source</span>
                        </button>

                        <Link
                            href="/profile"
                            onClick={() => setShowMenu(false)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive('/profile') ? 'bg-white/10 text-white shadow-inner' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                        >
                            <User size={20} />
                            <span className="font-semibold">Profile</span>
                        </Link>

                        <Link
                            href="/profile?settings=true"
                            onClick={() => setShowMenu(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:bg-white/5 hover:text-white transition-all duration-200"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="font-semibold">Settings</span>
                        </Link>
                    </div>

                    <div className="pt-4 border-t border-white/10 mt-auto">
                        <button
                            onClick={() => {
                                setShowMenu(false);
                                setIsFeedbackOpen(true);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:bg-orange-500/10 hover:text-orange-400 transition-all duration-200 text-left mb-2"
                        >
                            <MessageSquare size={20} />
                            <span className="font-semibold">Send Feedback</span>
                        </button>

                        {isAdmin && (
                            <Link
                                href="/admin/feedback"
                                onClick={() => setShowMenu(false)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive('/admin/feedback') ? 'bg-purple-500/20 text-purple-300' : 'text-purple-400/60 hover:bg-purple-500/10 hover:text-purple-400'}`}
                            >
                                <Sparkles size={20} />
                                <span className="font-semibold">Admin Panel</span>
                            </Link>
                        )}
                    </div>
                </div>
            )}

            <FeedbackModal
                isOpen={isFeedbackOpen}
                onClose={() => setIsFeedbackOpen(false)}
            />

            <SourceSelectorModal
                isOpen={isSourceSelectorOpen}
                onClose={() => setIsSourceSelectorOpen(false)}
            />
        </>
    );
}
