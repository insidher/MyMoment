'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, Check, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CATEGORIES } from '@/lib/categories';

export function CategoryDropdown() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentCategory = searchParams.get('category');

    // Find active category label
    const activeCategory = Object.values(CATEGORIES).find(
        (c) => c.id.toString() === currentCategory
    );

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleCategoryClick = (id: number | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (id === null) {
            params.delete('category');
        } else {
            params.set('category', id.toString());
        }
        router.push(`/?${params.toString()}`);
        setIsOpen(false);
    };

    return (
        <div className="hidden md:block relative z-50 mb-6" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 border",
                    isOpen || activeCategory
                        ? "bg-white/10 border-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                        : "bg-black/20 border-white/5 text-white/70 hover:bg-white/5 hover:text-white"
                )}
            >
                {activeCategory ? (
                    <span className="font-medium text-white">{activeCategory.label}</span>
                ) : (
                    <>
                        <Layers size={16} className="text-white/50" />
                        <span className="font-medium">Categories</span>
                    </>
                )}
                <ChevronDown
                    size={16}
                    className={cn(
                        "ml-1 text-white/50 transition-transform duration-200",
                        isOpen && "rotate-180"
                    )}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute left-0 top-full mt-2 w-56 bg-[#0A0A0A] border border-white/10 rounded-xl shadow-2xl backdrop-blur-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-top-left">
                    <div className="p-1.5 space-y-0.5">
                        {/* All Categories Option */}
                        <button
                            onClick={() => handleCategoryClick(null)}
                            className={cn(
                                "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between",
                                !currentCategory
                                    ? "bg-white/10 text-white font-medium"
                                    : "text-white/60 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <span>All Categories</span>
                            {!currentCategory && <Check size={14} className="text-orange-500" />}
                        </button>

                        <div className="h-px bg-white/5 my-1 mx-2" />

                        {/* Category List */}
                        <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                            {Object.values(CATEGORIES).map((category) => {
                                const isActive = currentCategory === category.id.toString();
                                return (
                                    <button
                                        key={category.id}
                                        onClick={() => handleCategoryClick(category.id)}
                                        className={cn(
                                            "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between group",
                                            isActive
                                                ? "bg-white/10 text-white font-medium"
                                                : "text-white/60 hover:text-white hover:bg-white/5"
                                        )}
                                    >
                                        <span className="truncate">{category.label}</span>
                                        {isActive && <Check size={14} className="text-orange-500" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
