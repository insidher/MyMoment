import { useCallback } from 'react';

export function useSoundEffects() {
    const playStart = useCallback(() => {
        const audio = new Audio('/sounds/tape-start.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => console.error('Failed to play start sound', e));
    }, []);

    const playStop = useCallback(() => {
        const audio = new Audio('/sounds/tape-stop.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => console.error('Failed to play stop sound', e));
    }, []);

    return { playStart, playStop };
}
