'use client';

import { Music, Laugh, BookOpen, Gamepad2, Film, Tv, Mic, Newspaper, Cpu, Sparkles, MessageSquare, Landmark } from 'lucide-react';

/**
 * CategoryBadge – Renders a category icon + label based on internal category ID (1-9).
 *
 * Mapping:
 *   1 = Music, 2 = Podcast, 3 = Comedy, 4 = Education,
 *   5 = Gaming, 6 = Sports, 7 = News, 8 = Technology, 9 = Entertainment,
 *   10 = Debate, 11 = Politics
 */

interface CategoryBadgeProps {
    categoryId: number | string | null | undefined;
    className?: string;
}

const CATEGORY_CONFIG: Record<number, { label: string; icon: typeof Music; color: string; bg: string }> = {
    1: { label: 'Music', icon: Music, color: 'text-pink-400', bg: 'bg-pink-500/10' },
    2: { label: 'Podcast', icon: Mic, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    3: { label: 'Comedy', icon: Laugh, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    4: { label: 'Education', icon: BookOpen, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    5: { label: 'Gaming', icon: Gamepad2, color: 'text-green-400', bg: 'bg-green-500/10' },
    6: { label: 'Sports', icon: Tv, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    7: { label: 'News', icon: Newspaper, color: 'text-slate-400', bg: 'bg-slate-500/10' },
    8: { label: 'Technology', icon: Cpu, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    9: { label: 'Entertainment', icon: Film, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    10: { label: 'Debate', icon: MessageSquare, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    11: { label: 'Politics', icon: Landmark, color: 'text-slate-500', bg: 'bg-slate-600/10' },
};

export default function CategoryBadge({ categoryId, className = '' }: CategoryBadgeProps) {
    const id = Number(categoryId);
    if (!id || !CATEGORY_CONFIG[id]) return null;

    const config = CATEGORY_CONFIG[id];
    const Icon = config.icon;

    return (
        <div className={`${config.bg} ${config.color} text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 ${className}`}>
            <Icon size={10} />
            {config.label}
        </div>
    );
}

/** Utility to get category label from ID (for non-React contexts) */
export function getCategoryLabel(categoryId: number | string | null | undefined): string | null {
    const id = Number(categoryId);
    return CATEGORY_CONFIG[id]?.label || null;
}
