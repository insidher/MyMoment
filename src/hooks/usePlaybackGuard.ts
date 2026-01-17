import { useState, useEffect, useRef } from 'react';

interface UsePlaybackGuardProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    player: any; // YouTube player instance
    expectedDuration: number;
    startParam: string | null;
    isEnabled: boolean;
    debug_forcePlayerDuration?: number;
}

interface PlaybackGuardResult {
    currentTime: number;
    duration: number;
    isAd: boolean;
    playbackState: 'IDLE' | 'LOADING' | 'AD_PLAYING' | 'CONTENT_PLAYING';
    controlsDisabled: boolean;
}

export function usePlaybackGuard({
    player,
    expectedDuration,
    startParam,
    isEnabled,
    debug_forcePlayerDuration,
}: UsePlaybackGuardProps): PlaybackGuardResult {
    // Internal State
    const [playbackState, setPlaybackState] = useState<'IDLE' | 'LOADING' | 'AD_PLAYING' | 'CONTENT_PLAYING'>('IDLE');
    const [sanitizedCurrentTime, setSanitizedCurrentTime] = useState(0);
    const [sanitizedDuration, setSanitizedDuration] = useState(expectedDuration || 0);
    const [isAd, setIsAd] = useState(false);

    // Refs
    const queuedSeek = useRef<number | null>(null);
    const consecutiveMatches = useRef(0);

    // Initialize queuedSeek on mount if startParam exists
    useEffect(() => {
        if (startParam) {
            const start = parseInt(startParam, 10);
            if (!isNaN(start)) {
                queuedSeek.current = start;
            }
        }
    }, [startParam]);

    // Polling Engine
    useEffect(() => {
        const interval = setInterval(() => {
            // Condition A: Safety Bypass
            if (!isEnabled || !player || typeof player.getCurrentTime !== 'function' || typeof player.getDuration !== 'function') {
                if (player && typeof player.getCurrentTime === 'function') {
                    try {
                        const current = Math.floor(player.getCurrentTime() || 0);
                        const duration = Math.floor(player.getDuration() || 0);
                        setSanitizedCurrentTime(current);
                        // If disabled, just pass through player duration, but fallback to expected if 0
                        setSanitizedDuration(duration > 0 ? duration : expectedDuration);
                        setPlaybackState('IDLE'); // Or just keep it IDLE/CONTENT_PLAYING? Defaulting to IDLE implied by bypass.
                        setIsAd(false); // SAFETY: Ensure we don't get stuck in Ad Mode if disabled
                    } catch (e) {
                        // Player error
                    }
                }
                return;
            }

            try {
                const playerDuration = debug_forcePlayerDuration ?? player.getDuration();

                // Ignore 0 duration (Loading state)
                if (playerDuration === 0) {
                    return;
                }

                const delta = Math.abs(playerDuration - expectedDuration);

                // Condition B: The Guard
                if (delta > 2) {
                    // Ad Detected
                    setIsAd(true);
                    setPlaybackState('AD_PLAYING');

                    // Crucial: Do NOT update sanitizedCurrentTime (freeze it)
                    // Crucial: Force sanitizedDuration to return expectedDuration
                    setSanitizedDuration(expectedDuration);

                    // Reset stability check
                    consecutiveMatches.current = 0;
                } else {
                    // Content Candidate
                    consecutiveMatches.current += 1;

                    // Stability Check (300ms)
                    if (consecutiveMatches.current >= 3) {
                        setIsAd(false);
                        setPlaybackState('CONTENT_PLAYING');

                        const current = Math.floor(player.getCurrentTime() || 0);
                        setSanitizedCurrentTime(current);
                        setSanitizedDuration(expectedDuration); // Use expected duration for consistency

                        // Seek Execution
                        if (queuedSeek.current !== null) {
                            player.seekTo(queuedSeek.current, true);
                            queuedSeek.current = null;
                        }
                    }
                }
            } catch (e) {
                console.error('[PlaybackGuard] Polling error:', e);
            }
        }, 100);

        return () => clearInterval(interval);
    }, [player, expectedDuration, isEnabled]);

    return {
        currentTime: sanitizedCurrentTime,
        duration: sanitizedDuration,
        isAd,
        playbackState,
        controlsDisabled: isEnabled && isAd,
    };
}
