'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Music, Film, User as UserIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import UserAvatar from './UserAvatar';

interface SearchResult {
    type: 'moment' | 'video' | 'user';
    id: string;
    title: string;
    subtitle: string;
    thumbnail: string | null;
    url: string;
    user?: {
        name: string;
        image: string | null;
    };
    service?: string;
}

interface SearchBarProps {
    placeholder?: string;
}

export default function SearchBar({ placeholder = 'Search or paste link...' }: SearchBarProps) {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    // Detect if input is a URL
    const isURL = (text: string): boolean => {
        const urlPattern = /(youtube\.com|youtu\.be|spotify\.com|open\.spotify\.com)/i;
        return urlPattern.test(text) || text.includes('http');
    };

    const mode = query.trim() ? (isURL(query) ? 'url' : 'text') : 'idle';

    // Debounced search function
    useEffect(() => {
        if (mode === 'text' && query.trim().length >= 2) {
            setIsSearching(true);

            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }

            debounceTimer.current = setTimeout(async () => {
                try {
                    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
                    const data = await response.json();
                    setResults(data.results || []);
                    setShowDropdown(true);
                } catch (error) {
                    console.error('Search error:', error);
                    setResults([]);
                } finally {
                    setIsSearching(false);
                }
            }, 300);
        } else {
            setResults([]);
            setShowDropdown(false);
            setIsSearching(false);
        }

        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, [query, mode]);

    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!query.trim()) return;

        if (mode === 'url') {
            if (query.includes('.') || query.includes('http')) {
                router.push(`/room/view?url=${encodeURIComponent(query)}`);
            } else {
                router.push(`/?q=${encodeURIComponent(query)}`);
            }
            setQuery('');
            setShowDropdown(false);
        }
    };

    const handleResultClick = (result: SearchResult) => {
        router.push(result.url);
        setQuery('');
        setShowDropdown(false);
        setResults([]);
    };

    const getResultIcon = (result: SearchResult) => {
        if (result.type === 'user') {
            return (
                <UserAvatar
                    name={result.title}
                    image={result.thumbnail}
                    size="w-10 h-10"
                />
            );
        }

        if (result.type === 'moment') {
            return (
                <div className="w-10 h-10 shrink-0 rounded bg-orange-500/20 flex items-center justify-center text-orange-500 font-bold text-sm">
                    M
                </div>
            );
        }

        if (result.thumbnail) {
            return (
                <img
                    src={result.thumbnail}
                    alt={result.title}
                    className="w-10 h-10 rounded object-cover shrink-0 bg-white/5"
                />
            );
        }

        return (
            <div className="w-10 h-10 shrink-0 rounded bg-white/5 flex items-center justify-center">
                {result.type === 'video' ? <Film size={18} className="text-white/40" /> : <Music size={18} className="text-white/40" />}
            </div>
        );
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'moment': return 'Moment';
            case 'video': return 'Video';
            case 'user': return 'User';
            default: return '';
        }
    };

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <form
                onSubmit={handleSubmit}
                className="w-full transition-all duration-300 ease-out flex items-center group max-w-2xl mx-auto"
            >
                <div className={`flex-1 flex items-center bg-white/5 border border-white/5 border-r-0 rounded-l-full px-2 md:px-4 h-9 md:h-10 transition-all duration-300 ${isFocused ? 'bg-white/12 border-white/20 ring-1 ring-orange-500/20' : 'focus-within:bg-white/10'}`}>
                    <Search size={14} className={`transition-colors duration-300 ${isFocused ? 'text-white' : 'text-white/40'} mr-2 md:mr-3 shrink-0`} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onFocus={() => {
                            setIsFocused(true);
                            if (mode === 'text' && results.length > 0) {
                                setShowDropdown(true);
                            }
                        }}
                        onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={placeholder}
                        className="bg-transparent border-none outline-none text-[13px] md:text-sm text-white placeholder-white/30 w-full"
                    />
                </div>
                <button
                    type="submit"
                    disabled={!query.trim() || (mode === 'text')}
                    className={`px-3 md:px-6 h-9 md:h-10 bg-[#7c2a0c] hover:bg-[#9a3412] text-white/90 text-xs md:text-sm font-bold rounded-r-full transition-all duration-300 border-l border-white/5 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {isSearching ? '...' : 'Go'}
                </button>
            </form>

            {/* Dropdown Results */}
            {showDropdown && mode === 'text' && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-neutral-900 border border-white/10 rounded-lg shadow-xl z-50 max-w-2xl mx-auto overflow-hidden">
                    {results.length === 0 ? (
                        <div className="p-4 text-center text-white/40 text-sm">
                            No results found for "{query}"
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {results.map((result) => (
                                <button
                                    key={`${result.type}-${result.id}`}
                                    onClick={() => handleResultClick(result)}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-white/5 cursor-pointer transition-colors text-left"
                                >
                                    {getResultIcon(result)}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-white text-sm font-medium truncate">
                                                {result.title}
                                            </p>
                                            <span className="text-[10px] text-white/40 uppercase tracking-wide shrink-0">
                                                {getTypeLabel(result.type)}
                                            </span>
                                        </div>
                                        {result.subtitle && (
                                            <p className="text-white/60 text-xs truncate">
                                                {result.subtitle}
                                            </p>
                                        )}
                                    </div>
                                    {result.service && (
                                        <div className={`w-2 h-2 rounded-full shrink-0 ${result.service === 'youtube' ? 'bg-red-500' : 'bg-green-500'}`} />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
