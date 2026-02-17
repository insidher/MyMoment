'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeColor = 'cyan' | 'purple' | 'rose' | 'amber' | 'emerald' | 'indigo';

interface ThemeContextType {
    theme: ThemeColor;
    setTheme: (theme: ThemeColor) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<ThemeColor>('cyan');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Load from local storage
        const savedTheme = localStorage.getItem('app-theme') as ThemeColor;
        if (savedTheme) {
            setTheme(savedTheme);
            document.documentElement.setAttribute('data-theme', savedTheme);
        } else {
            // Default
            document.documentElement.setAttribute('data-theme', 'cyan');
        }
        setMounted(true);
    }, []);

    const handleSetTheme = (newTheme: ThemeColor) => {
        setTheme(newTheme);
        localStorage.setItem('app-theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
    };

    if (!mounted) {
        return <>{children}</>;
    }

    return (
        <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
