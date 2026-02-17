'use client';

import { CATEGORIES } from '@/lib/categories';
import { cn } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRef } from 'react';

export default function CategoryPillBar() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentCategory = searchParams.get('category');
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleCategoryClick = (id: number) => {
        const params = new URLSearchParams(searchParams.toString());
        if (currentCategory === id.toString()) {
            params.delete('category');
        } else {
            params.set('category', id.toString());
        }
        router.push(`/?${params.toString()}`);
    };

    return (
        <div className="lg:hidden sticky top-[56px] z-30 bg-black/90 backdrop-blur-xl border-b border-white/5 py-3 -mx-4 px-4 mb-4">
            <div
                ref={scrollRef}
                className="flex items-center gap-2 overflow-x-auto scrollbar-hide snap-x"
            >
                {/* All / Clear Button */}
                <button
                    onClick={() => router.push('/')}
                    className={cn(
                        "snap-start shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all border",
                        !currentCategory
                            ? "bg-white text-black border-white"
                            : "bg-neutral-900 text-white/60 border-white/10 hover:bg-white/10 hover:text-white"
                    )}
                >
                    All
                </button>

                {Object.values(CATEGORIES).map((category) => {
                    const isActive = currentCategory === category.id.toString();
                    return (
                        <button
                            key={category.id}
                            onClick={() => handleCategoryClick(category.id)}
                            className={cn(
                                "snap-start shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all border whitespace-nowrap",
                                isActive
                                    ? "bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/20"
                                    : "bg-neutral-900/50 text-white/60 border-white/10 hover:bg-white/10 hover:text-white"
                            )}
                        >
                            {category.label}
                        </button>
                    );
                })}

                {/* Spacer for proper padding at end */}
                <div className="w-2 shrink-0" />
            </div>
        </div>
    );
}
