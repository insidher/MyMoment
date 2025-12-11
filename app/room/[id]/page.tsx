'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Play, Pause, Save, Clock, ArrowLeft, Check, RotateCcw, ListMusic, Loader2, FastForward } from 'lucide-react';
import Link from 'next/link';
import YouTube, { YouTubeEvent } from 'react-youtube';
import { fetchSpotifyMetadata } from '@/lib/metadata';
import { Moment } from '@/types';
import RelatedStrip from '@/components/RelatedStrip';
import MomentTimeline from '@/components/MomentTimeline';
import MomentCard from '@/components/MomentCard';
import PlayerTimeline from '@/components/PlayerTimeline';
import { RelatedItem } from '@/lib/related';
import { useSession } from 'next-auth/react';
import { useSoundEffects } from '@/hooks/useSoundEffects';

type CaptureState = 'idle' | 'start-captured' | 'end-captured';

// Minimal interface for Spotify IFrame API Controller
interface SpotifyController {
    loadUri: (uri: string) => void;
    play: () => void;
    pause: () => void;
    seek: (seconds: number) => void;
    togglePlay: () => void;
    addListener: (event: string, callback: (data: any) => void) => void;
    removeListener: (event: string, callback: (data: any) => void) => void;
    destroy: () => void;
}

export default function Room({ params }: { params: { id: string } }) {
    const { data: session, status } = useSession();
    console.log('[Room] Client Session:', status, session);

    const searchParams = useSearchParams();
    const router = useRouter();
    const rawUrl = searchParams.get('url');
    const url = rawUrl ? decodeURIComponent(rawUrl) : '';

    const [startSec, setStartSec] = useState<number | null>(null);
    const [endSec, setEndSec] = useState<number | null>(null);
    const [note, setNote] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Smart Capture State
    const [captureState, setCaptureState] = useState<CaptureState>('idle');
    const [youtubePlayer, setYoutubePlayer] = useState<any>(null);
    const [spotifyPlayer, setSpotifyPlayer] = useState<SpotifyController | null>(null);
    const [error, setError] = useState('');

    // Unified Playback State (for Timeline)
    const [playbackState, setPlaybackState] = useState({ current: 0, duration: 0 });

    // Spotify Playback State
    const spotifyTimeRef = useRef<number>(0);
    const [spotifyProgress, setSpotifyProgress] = useState({ current: 0, duration: 0 });
    // const lastUpdateRef = useRef<number>(0); // Removed unused
    // const lastSeekRef = useRef<number>(0); // Removed unused
    const [isSeekingToStart, setIsSeekingToStart] = useState(false);
    const [isReloading, setIsReloading] = useState(false); // Visual reload state
    const [isPlaying, setIsPlaying] = useState(false); // Unified playing state


    // Real Metadata State
    const [metadata, setMetadata] = useState({
        title: 'Loading...',
        artist: '...',
        artwork: '',
    });

    // Moments List State
    const [moments, setMoments] = useState<Moment[]>([]);

    // Related Content State
    const [relatedItems, setRelatedItems] = useState<RelatedItem[]>([]);
    const [isLoadingRelated, setIsLoadingRelated] = useState(false);
    const [relatedError, setRelatedError] = useState<string | null>(null);

    // Spotify UX State
    const [youtubeFallbackUrl, setYoutubeFallbackUrl] = useState('');
    const [youtubeFallbackError, setYoutubeFallbackError] = useState('');

    // Determine Service
    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
    const isSpotify = url.includes('spotify.com');

    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');

    // Sound Effects
    const { playStart, playStop } = useSoundEffects();

    // Fetch Metadata & Moments on Load
    useEffect(() => {
        if (!url) return;

        // Auto-play if start param exists
        if (startParam) {
            const start = parseInt(startParam);
            const end = endParam ? parseInt(endParam) : null;

            setStartSec(start);
            setEndSec(end);
            setCaptureState('end-captured'); // Show preview mode

            // Enabling Auto-Stop for "Moment Mode"
            if (end) {
                // We mock an active moment to trigger the supervisor effect
                const tempMoment: Moment = {
                    id: 'temp-preview',
                    service: isSpotify ? 'spotify' : 'youtube',
                    sourceUrl: url,
                    startSec: start,
                    endSec: end,
                    createdAt: new Date(),
                };
                setActiveMoment(tempMoment);
            }

            // Note: Player seeking happens in player ready/update effects
        }

        // Fetch Moments
        fetch(`/api/moments?sourceUrl=${encodeURIComponent(url)}`)
            .then(res => res.json())
            .then(data => {
                if (data.moments) setMoments(data.moments);
            })
            .catch(err => console.error('Failed to fetch moments', err));

        // Fetch Spotify Metadata
        if (isSpotify) {
            fetch(`/api/metadata?url=${encodeURIComponent(url)}`)
                .then(res => res.json())
                .then(data => {
                    if (data && !data.error) {
                        setMetadata(data);
                    } else {
                        console.warn('Metadata fetch failed:', data.error);
                        setMetadata({ title: 'Spotify Track', artist: 'Unknown Artist', artwork: '' });
                    }
                })
                .catch(err => {
                    console.error('Failed to fetch Spotify metadata', err);
                    setMetadata({ title: 'Spotify Track', artist: 'Unknown Artist', artwork: '' });
                });
        }
    }, [url, isSpotify, startParam, endParam]);

    // YouTube Polling for Timeline
    useEffect(() => {
        if (!isYouTube || !youtubePlayer) return;

        const interval = setInterval(() => {
            try {
                // getCurrentTime returns seconds
                const current = Math.floor(youtubePlayer.getCurrentTime() || 0);
                const duration = Math.floor(youtubePlayer.getDuration() || 0);

                // Only update if changed significantly to reduce re-renders
                if (current !== playbackState.current || duration !== playbackState.duration) {
                    setPlaybackState({ current, duration });
                }
            } catch (e) {
                // Player might not be ready
            }
        }, 500);

        return () => clearInterval(interval);
    }, [isYouTube, youtubePlayer, playbackState.current, playbackState.duration]);

    // Auto-Refresh One-Time Stop-Gap
    useEffect(() => {
        if (!isSpotify) return;

        const hasRefreshed = sessionStorage.getItem('spotify_auto_refresh');

        if (!hasRefreshed) {
            console.warn('[Spotify] Triggering one-time auto-refresh...');
            sessionStorage.setItem('spotify_auto_refresh', 'true');
            setTimeout(() => window.location.reload(), 100);
        }
    }, [isSpotify]);

    // Initialize Spotify Player
    useEffect(() => {
        if (!isSpotify) return;

        if (spotifyPlayer) {
            console.log('Updating existing Spotify player with:', url);
            spotifyPlayer.loadUri(url);
            if (startParam) {
                // Do nothing, listener handles init
            }
            return;
        }

        const initSpotifyPlayer = (IFrameAPI: any) => {
            const element = document.getElementById('spotify-embed');
            if (!element) return;
            element.innerHTML = '';
            const options = { uri: url, width: '100%', height: '100%', theme: 'dark' };
            const callback = (EmbedController: SpotifyController) => {
                setSpotifyPlayer(EmbedController);
                if (startParam) {
                    EmbedController.play();
                    setTimeout(() => {
                        EmbedController.seek(parseInt(startParam));
                    }, 1000);
                }
                EmbedController.addListener('playback_update', (e: any) => {
                    if (e && e.data) {
                        const current = Math.floor(e.data.position / 1000);
                        const duration = Math.floor(e.data.duration / 1000);
                        spotifyTimeRef.current = current;
                        setSpotifyProgress({ current, duration });
                        setPlaybackState({ current, duration });
                        setIsPlaying(!e.data.isPaused);
                    }
                });
            };
            IFrameAPI.createController(element, options, callback);
        };

        // @ts-ignore
        if (window.SpotifyIframeApi) {
            // @ts-ignore
            initSpotifyPlayer(window.SpotifyIframeApi);
        } else if (
            // @ts-ignore
            !window.onSpotifyIframeApiReady
        ) {
            // @ts-ignore
            window.onSpotifyIframeApiReady = (IFrameAPI: any) => initSpotifyPlayer(IFrameAPI);
            if (!document.getElementById('spotify-iframe-api')) {
                const script = document.createElement('script');
                script.id = 'spotify-iframe-api';
                script.src = 'https://open.spotify.com/embed/iframe-api/v1';
                script.async = true;
                document.body.appendChild(script);
            }
        }
    }, [url, isSpotify]);

    // Fetch Related Content
    useEffect(() => {
        if (!url) return;

        // Only fetch for YouTube or Spotify
        if (!isYouTube && !isSpotify) {
            setRelatedItems([]);
            return;
        }

        console.log('Fetching related content for:', url);
        setIsLoadingRelated(true);
        setRelatedError(null);

        fetch('/api/related', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                service: isSpotify ? 'spotify' : 'youtube',
                sourceUrl: url,
            }),
        })
            .then(res => res.json())
            .then(data => {
                console.log('Related content response:', data);
                if (data.error) {
                    setRelatedError(data.error);
                    setRelatedItems([]);
                } else if (data.items) {
                    setRelatedItems(data.items);
                }
            })
            .catch(err => {
                console.error('Failed to fetch related content', err);
                setRelatedError('Failed to load recommendations');
                setRelatedItems([]);
            })
            .finally(() => {
                setIsLoadingRelated(false);
            });
    }, [url, isYouTube, isSpotify]);

    const onPlayerReady = async (event: YouTubeEvent) => {
        setYoutubePlayer(event.target);
        // Expose for testing
        // @ts-ignore
        window.youtubePlayer = event.target;

        // Extract video ID
        const videoId = url.includes('youtube.com')
            ? new URL(url).searchParams.get('v')
            : url.includes('youtu.be')
                ? new URL(url).pathname.slice(1)
                : null;

        if (videoId) {
            // Fetch metadata from YouTube Data API for reliable channel info
            try {
                // Next.js will replace this at build time
                const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY as string;

                if (apiKey) {
                    const response = await fetch(
                        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`
                    );
                    const data = await response.json();

                    if (data.items && data.items.length > 0) {
                        const snippet = data.items[0].snippet;
                        setMetadata({
                            title: snippet.title,
                            artist: snippet.channelTitle, // Reliable channel name from API
                            artwork: snippet.thumbnails.maxres?.url || snippet.thumbnails.high?.url || '',
                        });
                        console.log('[YouTube API] Metadata set:', snippet.title, 'by', snippet.channelTitle);
                    }
                } else {
                    console.warn('[YouTube] API key is undefined, using iframe fallback');
                    // Fallback to iframe API (less reliable)
                    const videoData = event.target.getVideoData();
                    setMetadata({
                        title: videoData.title || 'YouTube Video',
                        artist: videoData.author || 'Unknown Channel',
                        artwork: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                    });
                }
            } catch (error) {
                console.error('[YouTube API] Failed to fetch metadata:', error);
                // Fallback to iframe API
                const videoData = event.target.getVideoData();
                setMetadata({
                    title: videoData.title || 'YouTube Video',
                    artist: videoData.author || 'Unknown Channel',
                    artwork: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                });
            }
        }

        // Auto-seek if start param exists
        if (startParam) {
            const start = parseInt(startParam);
            console.log('[Room] Auto-seeking to:', start);
            event.target.seekTo(start, true);
            event.target.playVideo();
        }
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSmartCapture = () => {
        let currentTimeSec = 0;

        if (isYouTube && youtubePlayer) {
            currentTimeSec = Math.floor(youtubePlayer.getCurrentTime());
        } else if (isSpotify && spotifyPlayer) {
            currentTimeSec = spotifyTimeRef.current;
        } else {
            return; // No active player
        }

        if (captureState === 'idle') {
            setStartSec(currentTimeSec);
            setCaptureState('start-captured');
            setError('');
        } else if (captureState === 'start-captured') {
            if (currentTimeSec <= startSec!) {
                setError('End time must be after start time');
                return;
            }
            const duration = currentTimeSec - startSec!;
            if (duration > 60) {
                setError('Moment cannot exceed 60 seconds');
                return;
            }
            setEndSec(currentTimeSec);
            setCaptureState('end-captured');
            setError('');
        } else if (captureState === 'end-captured') {
            setStartSec(null);
            setEndSec(null);
            setCaptureState('idle');
            setError('');
        }
    };

    const handleSave = async () => {
        if (startSec == null || endSec == null || !note) return;

        console.log('[handleSave] Saving moment with metadata:', metadata);
        console.log('[handleSave] Artist value:', metadata.artist);

        setIsSaving(true);
        try {
            const res = await fetch('/api/moments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourceUrl: url,
                    service: isSpotify ? 'spotify' : 'youtube',
                    startSec,
                    endSec,
                    note,
                    title: metadata.title,
                    artist: metadata.artist,
                    artwork: metadata.artwork,
                    duration: isSpotify ? spotifyProgress.duration : playbackState.duration, // Pass current duration
                }),
            });

            if (res.ok) {
                setSaved(true);
                const data = await res.json();
                setMoments([...moments, data.moment]);
                setTimeout(() => setSaved(false), 3000);
                setCaptureState('idle');
                setStartSec(null);
                setEndSec(null);
                setNote('');
            } else {
                const errorData = await res.json();
                setError(errorData.error || 'Failed to save moment');
            }
        } catch (error) {
            console.error('Failed to save', error);
            setError('Failed to save moment');
        } finally {
            setIsSaving(false);
        }
    };

    const [activeMoment, setActiveMoment] = useState<Moment | null>(null);

    // Moment Playback Logic (Fades & Auto-Stop)
    useEffect(() => {
        if (!activeMoment) return;

        const checkPlayback = () => {
            let currentTime = 0;
            let player: any = null;
            let service = activeMoment.service;

            if (service === 'youtube' && youtubePlayer) {
                currentTime = youtubePlayer.getCurrentTime();
                player = youtubePlayer;
            } else if (service === 'spotify' && spotifyPlayer) {
                // Spotify doesn't support fine-grained volume control via Embed API usually,
                // but we'll implement the timing logic.
                currentTime = spotifyTimeRef.current; // Use ref for latest time
                player = spotifyPlayer;
            }

            if (!player) return;

            const startFadeIn = activeMoment.startSec - 1;
            const endFadeOut = activeMoment.endSec;
            // For Spotify, stop exactly at endSec to match "Tape End" feel. For YouTube, allow +1 for fade.
            const stopTime = service === 'spotify' ? activeMoment.endSec : activeMoment.endSec + 1;

            // 1. Auto-Stop
            if (currentTime >= stopTime) {
                if (service === 'youtube') player.pauseVideo();
                else player.pause();

                playStop();
                setActiveMoment(null);
                // Reset volume
                if (service === 'youtube') player.setVolume(100);
                return;
            }

            // 2. Fade Logic (YouTube only)
            if (service === 'youtube') {
                if (currentTime >= startFadeIn && currentTime < activeMoment.startSec) {
                    // Fade In (0 -> 100)
                    const progress = (currentTime - startFadeIn) / 1; // 1 second duration
                    player.setVolume(Math.floor(progress * 100));
                } else if (currentTime >= endFadeOut && currentTime < stopTime) {
                    // Fade Out (100 -> 0)
                    const progress = (currentTime - endFadeOut) / 1;
                    player.setVolume(Math.floor((1 - progress) * 100));
                } else if (currentTime >= activeMoment.startSec && currentTime < endFadeOut) {
                    // Normal Playback
                    player.setVolume(100);
                }
            }
        };

        const interval = setInterval(checkPlayback, 100); // Run frequently for smooth fades
        return () => {
            clearInterval(interval);
            // Safety cleanup if component unmounts or moment changes
            if (activeMoment.service === 'youtube' && youtubePlayer) {
                youtubePlayer.setVolume(100);
            }
        };
    }, [activeMoment, youtubePlayer, spotifyPlayer]);

    // Auto-Heal Duration: Update backend if duration is missing but available in player
    useEffect(() => {
        if (playbackState.duration > 0 || spotifyProgress.duration > 0) {
            const currentDuration = isSpotify ? spotifyProgress.duration : playbackState.duration;
            if (currentDuration <= 0) return;

            // Check if current trackSource needs update
            // (We can't easily check TrackSource here without fetching, but we can check if any loaded moment is missing it)
            const missingDuration = moments.some(m => !m.trackSource?.durationSec || m.trackSource.durationSec === 0);

            if (missingDuration) {
                console.log('[Auto-Heal] Detected missing duration, updating backend:', currentDuration);
                fetch('/api/tracks/update-duration', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sourceUrl: url, durationSec: currentDuration })
                }).then(() => {
                    console.log('[Auto-Heal] Duration updated. Refreshing moments...');
                    // Ideally re-fetch moments here to update UI
                    // quick hack: just update local state
                    setMoments(prev => prev.map(m => ({
                        ...m,
                        trackSource: m.trackSource ? { ...m.trackSource, durationSec: currentDuration } : undefined
                    })));
                }).catch(err => console.error('[Auto-Heal] Failed:', err));
            }
        }
    }, [playbackState.duration, spotifyProgress.duration, moments, url, isSpotify]);

    const playMoment = (moment: Moment) => {
        // If clicking the active moment, toggle play/pause
        if (activeMoment?.id === moment.id) {
            // Resume logic
            if (moment.service === 'youtube' && youtubePlayer) {
                youtubePlayer.playVideo();
            } else if (moment.service === 'spotify' && spotifyPlayer) {
                // User Experiment: Try .resume() if available, else .play()
                // @ts-ignore
                if (typeof spotifyPlayer.resume === 'function') {
                    console.log('[Spotify] Using .resume()');
                    // @ts-ignore
                    spotifyPlayer.resume();
                } else {
                    console.log('[Spotify] .resume() not found, using .play()');
                    spotifyPlayer.play();
                }
            }
            playStart();
            return;
        }

        setActiveMoment(moment);
        playStart();
        const startParams = Math.max(0, moment.startSec - 1);

        if (moment.service === 'youtube' && youtubePlayer) {
            youtubePlayer.setVolume(0); // Start silent for fade-in
            youtubePlayer.seekTo(startParams, true);
            youtubePlayer.playVideo();
        } else if (moment.service === 'spotify' && spotifyPlayer) {
            // "Hot Engine" Strategy:
            // 1. Mask user experience with overlay
            setIsSeekingToStart(true);

            // 2. Heat up the engine (Start playing)
            spotifyPlayer.play();

            // 3. Wait for engine to warm up (1s)
            setTimeout(() => {
                const target = Math.max(0, moment.startSec - 1);
                console.log('[Spotify] Hot active seek to:', target);
                spotifyPlayer.seek(target);

                // 4. Reveal after a short buffer to allow seek to take effect
                setTimeout(() => {
                    setIsSeekingToStart(false);
                }, 500);
            }, 1000);
        } else {
            alert(`Jump to ${formatTime(moment.startSec)} manually!`);
        }
    };

    const handleSeek = (time: number) => {
        // seeking cancels moment mode
        setActiveMoment(null);
        if (isYouTube && youtubePlayer) {
            youtubePlayer.setVolume(100);
            youtubePlayer.seekTo(time, true);
        } else if (isSpotify && spotifyPlayer) {
            spotifyPlayer.seek(time);
        }
    };

    const handlePauseMoment = (moment: Moment) => {
        if (activeMoment?.id === moment.id) {
            if (moment.service === 'youtube' && youtubePlayer) {
                youtubePlayer.pauseVideo();
            } else if (moment.service === 'spotify' && spotifyPlayer) {
                spotifyPlayer.pause();
            }
            playStop();
            // Note: isPlaying will auto-update via event listeners, but we can optimistically set it
            setIsPlaying(false);
        }
    };

    const handleSelectRelated = (item: RelatedItem) => {
        // Reset capture state
        setStartSec(null);
        setEndSec(null);
        setNote('');
        setCaptureState('idle');
        setError('');
        setSaved(false);

        // Load new video in player if available (YouTube only optimization)
        if (isYouTube && item.service === 'youtube' && youtubePlayer && item.id) {
            youtubePlayer.loadVideoById(item.id);
        }

        // Load new track in Spotify player if available
        if (isSpotify && item.service === 'spotify' && spotifyPlayer) {
            console.log('Optimistic Spotify load:', item.sourceUrl);
            spotifyPlayer.loadUri(item.sourceUrl);
            spotifyPlayer.play();
        }

        // Navigate to new URL (this will trigger the useEffects to fetch metadata and moments)
        router.push(`/room/view?url=${encodeURIComponent(item.sourceUrl)}`);
    };

    // --- Playback Controls ---
    const handleTogglePlay = (playing: boolean) => {
        // Stop any active moment logic
        // if (activeMoment) setActiveMoment(null);

        if (isYouTube && youtubePlayer) {
            playing ? youtubePlayer.playVideo() : youtubePlayer.pauseVideo();
        } else if (isSpotify && spotifyPlayer) {
            // Use togglePlay() to mimic native button behavior and avoid resetting track
            spotifyPlayer.togglePlay();
        }
    };

    const handleSkipForward = () => {
        // Stop any active moment logic
        if (activeMoment) setActiveMoment(null);

        let current = 0;
        if (isYouTube && youtubePlayer) {
            current = youtubePlayer.getCurrentTime();
            youtubePlayer.seekTo(current + 15, true);
        } else if (isSpotify && spotifyPlayer) {
            current = spotifyTimeRef.current;
            spotifyPlayer.seek(current + 15); // Changed from (current + 15) * 1000
        }
    };

    // Extract YouTube ID
    const getYouTubeId = (inputUrl: string) => {
        if (inputUrl.includes('v=')) return inputUrl.split('v=')[1]?.split('&')[0];
        if (inputUrl.includes('youtu.be/')) return inputUrl.split('youtu.be/')[1]?.split('?')[0];
        return '';
    };
    const youtubeId = getYouTubeId(url);

    console.log('[Room] Debug:', { rawUrl, url, isYouTube, youtubeId, startParam });

    return (
        <main className="min-h-screen p-6 flex flex-col items-center">
            <div className="w-full max-w-6xl mx-auto">
                <Link href="/" className="inline-flex items-center text-white/50 hover:text-white mb-8 transition-colors">
                    <ArrowLeft size={18} className="mr-2" />
                    Back to Home
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column: Recommendations */}
                    <div className="lg:col-span-3 h-[calc(100vh-120px)] sticky top-6 overflow-hidden flex flex-col hidden lg:flex">
                        <h3 className="text-sm font-semibold text-white/70 mb-4 flex-shrink-0">More to explore</h3>

                        <div className="flex-1 min-h-0 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                            {isLoadingRelated && (
                                <div className="text-white/30 text-sm animate-pulse">Loading recommendations...</div>
                            )}

                            {relatedError && (
                                <p className="text-red-400 text-sm">Couldn’t load recommendations: {relatedError}</p>
                            )}

                            {!isLoadingRelated && !relatedError && relatedItems.length === 0 && (
                                <p className="text-white/30 text-sm italic">No recommendations found for this track.</p>
                            )}

                            {relatedItems.length > 0 && (
                                <RelatedStrip items={relatedItems} onSelect={handleSelectRelated} orientation="vertical" />
                            )}
                        </div>
                    </div>
                    {/* Center Column: Player & Metadata */}
                    <div className="lg:col-span-6 space-y-8">
                        <div className="space-y-4">
                            <div className="glass-panel p-1 overflow-hidden aspect-video relative bg-black">
                                {isYouTube && youtubeId ? (
                                    <YouTube
                                        videoId={youtubeId}
                                        className="w-full h-full"
                                        iframeClassName="w-full h-full rounded-xl"
                                        onReady={onPlayerReady}
                                        onStateChange={(event) => {
                                            if (event.data === 1) setIsPlaying(true); // Playing
                                            if (event.data === 2) setIsPlaying(false); // Paused

                                            const videoData = event.target.getVideoData();
                                            if (videoData && videoData.video_id) {
                                                const currentId = getYouTubeId(url);
                                                if (currentId && videoData.video_id !== currentId) {
                                                    const newUrl = `https://www.youtube.com/watch?v=${videoData.video_id}`;
                                                    router.push(`/room/view?url=${encodeURIComponent(newUrl)}`);
                                                }
                                            }
                                        }}
                                        opts={{
                                            width: '100%',
                                            height: '100%',
                                            playerVars: {
                                                autoplay: 1,
                                                rel: 0, // Show related videos from same channel only
                                                modestbranding: 1,
                                                iv_load_policy: 3, // Hide annotations
                                                origin: typeof window !== 'undefined' ? window.location.origin : undefined,
                                            },
                                        }}
                                    />
                                ) : isSpotify ? (
                                    <div className="relative w-full h-full">
                                        <div id="spotify-embed" className="w-full h-full rounded-xl" />

                                        {/* Reloading Banner - Keep for user awareness if it happens */}
                                        {isReloading && (
                                            <div className="absolute top-0 left-0 right-0 z-[60] bg-red-500/90 text-white text-xs font-bold px-4 py-2 flex items-center justify-center gap-2 animate-in slide-in-from-top-full">
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                Refreshing...
                                            </div>
                                        )}

                                        {isSeekingToStart && !isReloading && (
                                            <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300 rounded-xl">
                                                <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                                                <div className="text-white/80 font-medium font-mono text-sm">
                                                    Loading song at moment...
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-white/30">
                                        <p>Invalid or unsupported URL</p>
                                    </div>
                                )}
                            </div>

                            {/* Moment Timeline Overlay */}
                            {/* <div className="px-1">
                                <MomentTimeline
                                    duration={playbackState.duration}
                                    currentTime={playbackState.current}
                                    moments={moments}
                                    onSeek={handleSeek}
                                    onMomentClick={playMoment}
                                />
                            </div> */}

                            <div className="flex items-center justify-center gap-4 mt-2 mb-2">
                                <button
                                    onClick={() => handleTogglePlay(true)}
                                    className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                                    title="Play"
                                >
                                    <Play className="w-5 h-5 fill-current" />
                                </button>
                                <button
                                    onClick={() => handleTogglePlay(false)}
                                    className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                                    title="Pause"
                                >
                                    <Pause className="w-5 h-5 fill-current" />
                                </button>
                                <button
                                    onClick={handleSkipForward}
                                    className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                                    title="Skip 15s"
                                >
                                    <FastForward className="w-5 h-5 fill-current" />
                                </button>
                            </div>

                            {/* Unified Player Timeline (Spotify & YouTube) */}
                            {(isSpotify || isYouTube) && (
                                <PlayerTimeline
                                    currentTime={isSpotify ? spotifyProgress.current : playbackState.current}
                                    duration={isSpotify ? spotifyProgress.duration : playbackState.duration}
                                    moments={moments}
                                    onSeek={handleSeek}
                                    onMomentClick={playMoment}
                                    captureState={captureState}
                                    onSmartCapture={handleSmartCapture}
                                    activeMomentId={activeMoment?.id}
                                />
                            )}
                        </div>

                        <div className="flex items-center gap-6">
                            {metadata.artwork ? (
                                <img
                                    src={metadata.artwork}
                                    alt="Album Art"
                                    className="w-24 h-24 rounded-xl object-cover shadow-2xl"
                                />
                            ) : (
                                <div className="w-24 h-24 rounded-xl bg-white/10 animate-pulse" />
                            )}
                            <div>
                                <h2 className="text-3xl font-bold">{metadata.title}</h2>
                                <p className="text-xl text-white/60">{metadata.artist}</p>
                            </div>
                        </div>

                        {/* Related Content (Mobile Only) */}
                        <div className="mt-6 block lg:hidden">
                            <h3 className="text-sm font-semibold text-white/70 mb-2">More to explore</h3>

                            {isLoadingRelated && (
                                <div className="text-white/30 text-sm animate-pulse">Loading recommendations...</div>
                            )}

                            {relatedError && (
                                <p className="text-red-400 text-sm">Couldn’t load recommendations: {relatedError}</p>
                            )}

                            {!isLoadingRelated && !relatedError && relatedItems.length === 0 && (
                                <p className="text-white/30 text-sm italic">No recommendations found for this track.</p>
                            )}

                            {relatedItems.length > 0 && (
                                <RelatedStrip items={relatedItems} onSelect={handleSelectRelated} />
                            )}
                        </div>

                        {/* Moments List */}
                        {/* Moments List */}
                        <div className="glass-panel p-6 space-y-6">
                            <h3 className="text-xl font-semibold flex items-center gap-2 border-b border-white/10 pb-6">
                                <ListMusic size={20} className="text-blue-400" />
                                Saved Moments ({moments.length})
                            </h3>

                            <div className="grid gap-3">
                                {moments.length === 0 ? (
                                    <div className="text-center py-8 text-white/30 italic">
                                        No moments saved yet. Be the first!
                                    </div>
                                ) : (
                                    moments.map((moment) => (
                                        <MomentCard
                                            key={moment.id}
                                            moment={moment}
                                            // Preferred: Store duration. Fallback: Live player duration.
                                            trackDuration={moment.trackSource?.durationSec || (isSpotify ? spotifyProgress.duration : playbackState.duration)}
                                            onDelete={async (id) => {
                                                if (!confirm('Delete this moment?')) return;
                                                try {
                                                    const res = await fetch(`/api/moments/${id}`, { method: 'DELETE' });
                                                    if (res.ok) {
                                                        setMoments(moments.filter(m => m.id !== id));
                                                    }
                                                } catch (e) {
                                                    console.error(e);
                                                }
                                            }}
                                            showDelete={session?.user?.id === moment.userId}
                                            onPlayFull={() => {
                                                router.push(`/room/view?url=${encodeURIComponent(moment.sourceUrl)}`);
                                            }}
                                            onPlayMoment={playMoment}
                                            onPauseMoment={handlePauseMoment}
                                            currentTime={isSpotify ? spotifyProgress.current : playbackState.current}
                                            isActive={activeMoment?.id === moment.id}
                                            isPlaying={isPlaying}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Controls */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Smart Capture Button (YouTube & Spotify) */}
                        {(isYouTube || isSpotify) && (
                            <div className="glass-panel p-6 flex flex-col items-center space-y-4">
                                <button
                                    onClick={handleSmartCapture}
                                    disabled={!youtubePlayer && !spotifyPlayer}
                                    className={`
                    w-full py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg
                    ${captureState === 'idle' ? 'bg-white text-black hover:bg-gray-200' : ''}
                    ${captureState === 'start-captured' ? 'bg-purple-600 text-white hover:bg-purple-500' : ''}
                    ${captureState === 'end-captured' ? 'bg-white/10 text-white hover:bg-white/20' : ''}
                  `}
                                >
                                    {captureState === 'idle' && 'Mark Start'}
                                    {captureState === 'start-captured' && 'Mark End'}
                                    {captureState === 'end-captured' && (
                                        <span className="flex items-center justify-center gap-2">
                                            <RotateCcw size={18} /> Reset
                                        </span>
                                    )}
                                </button>

                                <p className="text-sm text-center text-white/60">
                                    {captureState === 'idle' && "Press when your favorite part begins."}
                                    {captureState === 'start-captured' && startSec !== null && `Start: ${formatTime(startSec)}. Press when it ends.`}
                                    {captureState === 'end-captured' && startSec !== null && endSec !== null && `Captured: ${formatTime(startSec)} – ${formatTime(endSec)}.`}
                                </p>

                                {error && <p className="text-red-400 text-sm">{error}</p>}
                            </div>
                        )}

                        <div className="glass-panel p-6 h-fit space-y-6">
                            <h3 className="text-xl font-semibold flex items-center gap-2">
                                <Clock size={20} className="text-purple-400" />
                                Moment Details
                            </h3>

                            {/* Preview Chip */}
                            {captureState === 'end-captured' && startSec !== null && endSec !== null && (
                                <div className="glass-panel p-4 bg-purple-600/20 border-2 border-purple-500">
                                    <p className="text-xs text-white/50 uppercase tracking-wider mb-2">Preview</p>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2 font-mono text-lg">
                                            <span className="text-purple-300">{formatTime(startSec)}</span>
                                            <span className="text-white/30">→</span>
                                            <span className="text-purple-300">{formatTime(endSec)}</span>
                                        </div>
                                        <span className="text-white/30">·</span>
                                        <span className="text-white/60">
                                            {note || '(add a label below)'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-white/40 mt-2">
                                        Duration: {endSec - startSec}s
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs text-white/50 uppercase tracking-wider">Start</label>
                                    <input
                                        type="text"
                                        placeholder="0:45"
                                        value={startSec !== null ? formatTime(startSec) : ''}
                                        readOnly
                                        className="input-field w-full text-center font-mono text-lg"
                                        suppressHydrationWarning
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-white/50 uppercase tracking-wider">End</label>
                                    <input
                                        type="text"
                                        placeholder="1:15"
                                        value={endSec !== null ? formatTime(endSec) : ''}
                                        readOnly
                                        className="input-field w-full text-center font-mono text-lg"
                                        suppressHydrationWarning
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs text-white/50 uppercase tracking-wider">Label / Note</label>
                                <textarea
                                    placeholder="Why this part hits different..."
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    className="input-field w-full min-h-[100px] resize-none"
                                />
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={isSaving || saved || startSec === null || endSec === null || !note}
                                className={`w-full btn-primary flex items-center justify-center gap-2 ${saved ? 'bg-green-600 hover:bg-green-600 from-green-600 to-green-500' : ''} disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {saved ? (
                                    <>
                                        <Check size={18} />
                                        Saved!
                                    </>
                                ) : (
                                    <>
                                        <Save size={18} />
                                        {isSaving ? 'Saving...' : 'Save Moment'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div >
            </div >
        </main >
    );
}
