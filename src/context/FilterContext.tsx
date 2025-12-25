'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface FilterContextType {
    showSpotify: boolean;
    toggleSpotify: () => void;
    isLoading: boolean;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: React.ReactNode }) {
    const [showSpotify, setShowSpotify] = useState(true);
    const [isLoading, setIsLoading] = useState(true);

    // Initialize from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem('showSpotify');
            if (stored !== null) {
                setShowSpotify(JSON.parse(stored));
            }
        } catch (error) {
            console.error('Failed to read filter preference:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Persist to localStorage when changed
    useEffect(() => {
        if (!isLoading) {
            try {
                localStorage.setItem('showSpotify', JSON.stringify(showSpotify));
            } catch (error) {
                console.error('Failed to save filter preference:', error);
            }
        }
    }, [showSpotify, isLoading]);

    const toggleSpotify = () => {
        setShowSpotify(prev => !prev);
    };

    return (
        <FilterContext.Provider value={{ showSpotify, toggleSpotify, isLoading }}>
            {children}
        </FilterContext.Provider>
    );
}

export function useFilter() {
    const context = useContext(FilterContext);
    if (context === undefined) {
        throw new Error('useFilter must be used within a FilterProvider');
    }
    return context;
}
