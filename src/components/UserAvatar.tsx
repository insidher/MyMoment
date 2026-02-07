'use client';

import React from 'react';

interface UserAvatarProps {
    name?: string | null;
    image?: string | null;
    size?: string; // e.g., 'w-8 h-8'
}

export default function UserAvatar({ name, image, size = 'w-8 h-8' }: UserAvatarProps) {
    const displayName = name || 'Anonymous';
    const firstLetter = displayName.charAt(0).toUpperCase();

    // Deterministic color generation based on name
    const colors = [
        'bg-blue-500',
        'bg-purple-500',
        'bg-pink-500',
        'bg-indigo-500',
        'bg-teal-500',
        'bg-emerald-500',
        'bg-orange-500',
        'bg-rose-500',
        'bg-cyan-500',
        'bg-amber-500'
    ];

    const getColor = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % colors.length;
        return colors[index];
    };

    if (image) {
        return (
            <img
                src={image}
                alt={displayName}
                className={`${size} rounded-full object-cover border border-white/10`}
            />
        );
    }

    return (
        <div className={`${size} rounded-full ${getColor(displayName)} flex items-center justify-center text-white font-bold text-xs border border-white/20 shadow-inner`}>
            {firstLetter}
        </div>
    );
}
