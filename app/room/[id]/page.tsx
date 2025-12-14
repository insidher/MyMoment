'use client';
import { createClient } from '@/lib/supabase/client';

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
import MomentGroup from '@/components/MomentGroup';
import PlayerTimeline from '@/components/PlayerTimeline';
import { RelatedItem } from '@/lib/related';
import { useAuth } from '@/context/AuthContext';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { MyMomentIcon } from '@/components/icons/MyMomentIcon';
import { parseChapters, getCurrentChapter, Chapter } from '@/lib/chapters';

type CaptureState = 'idle' | 'start-captured' | 'end-captured';

// Helper to group moments by timestamp
const groupMoments = (moments: Moment[]): { main: Moment; replies: Moment[] }[] => {
    const groups: { [key: string]: { main: Moment; replies: Moment[] } } = {};

    moments.forEach(m => {
        // Create a unique key for the timestamp range
        // Rounding to nearest second to be safe, though strict equality is requested
        const key = `${m.startSec}-${m.endSec}-${m.sourceUrl}`;

        if (!groups[key]) {
            groups[key] = { main: m, replies: [] };
        } else {
            // Add as reply
            groups[key].replies.push(m);
        }
    });

    // Sort groups by main moment's creation time (newest first)? Or start time?
    // Usually newest first is good for feeds, but for a room list, maybe time order? 
    // Let's stick to the current order of moments which is Newest First.
    return Object.values(groups);
};

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

// Helper to get resource ID
const getResourceId = (url: string): { id: string; platform: 'youtube' | 'spotify' } | null => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        let id = '';
        if (url.includes('v=')) id = url.split('v=')[1]?.split('&')[0];
        else if (url.includes('youtu.be/')) id = url.split('youtu.be/')[1]?.split('?')[0];
        return id ? { id, platform: 'youtube' } : null;
    }
    if (url.includes('spotify.com')) {
        return { id: url, platform: 'spotify' };
    }
    return null;
};

export default function Room({ params }: { params: { id: string } }) {
    const { user, isLoading } = useAuth();
    console.log('[Room] Client User:', user);

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

    // Auto-Heal Guard
    // Auto-Heal Guard (Strict)
    const hasUpdatedDuration = useRef(false);

    // Reset guard when URL changes
    useEffect(() => {
        hasUpdatedDuration.current = false;
    }, [url]);


    // Real Metadata State

    const [metadata, setMetadata] = useState({
        title: 'Loading...',
        artist: '...',
        artwork: '',
        description: '', // Add description field
    });

    // Chapter State
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
    const [includeChapterNote, setIncludeChapterNote] = useState(false);

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
    const [activeMoment, setActiveMoment] = useState<Moment | null>(null);
    const { playStart, playStop } = useSoundEffects();

    // Fetch Metadata & Moments on Load
    useEffect(() => {
        if (!url) return;

        const supabase = createClient();

        // Auto-play if start param exists
        if (startParam) {
            const start = parseInt(startParam);
            const end = endParam ? parseInt(endParam) : null;
            setStartSec(start);
            setEndSec(end);
            setCaptureState('end-captured');
            if (end) {
                const tempMoment: Moment = {
                    id: 'temp-preview',
                    service: isSpotify ? 'spotify' : 'youtube',
                    sourceUrl: url,
                    startSec: start,
                    endSec: end,
                    start_time: start, // Add compatibility fields
                    end_time: end,
                    platform: isSpotify ? 'spotify' : 'youtube',
                    createdAt: new Date(),
                } as Moment;
                setActiveMoment(tempMoment);
            }
        }

        const fetchMoments = async () => {
            const resource = getResourceId(url);
            if (!resource) return;

            // Fetch from Supabase
            const { data, error } = await supabase
                .from('moments')
                .select(`
                    *,
                    profiles (
                        full_name,
                        avatar_url
                    )
                `)
                .eq('resource_id', resource.id)
                .order('created_at', { ascending: false });

            if (data) {
                const mappedMoments: Moment[] = data.map((m: any) => ({
                    id: m.id,
                    service: m.platform as any,
                    sourceUrl: url,
                    startSec: m.start_time,
                    endSec: m.end_time,
                    momentDurationSec: m.end_time - m.start_time,
                    title: m.title,
                    artist: m.artist,
                    artwork: m.artwork,
                    note: m.note,
                    likeCount: m.like_count,
                    savedByCount: m.saved_by_count,
                    createdAt: new Date(m.created_at),
                    user: {
                        name: m.profiles?.full_name || 'Anonymous',
                        image: m.profiles?.avatar_url
                    }
                }));
                setMoments(mappedMoments);
            } else if (error) {
                console.error('Supabase fetch error:', error);
            }
        };

        fetchMoments();

        // Fetch Spotify Metadata
        if (isSpotify) {
            fetch(`/api/metadata?url=${encodeURIComponent(url)}`)
                .then(res => res.json())
                .then(data => {
                    if (data && !data.error) {
                        setMetadata(data);
                    } else {
                        setMetadata({ title: 'Spotify Track', artist: 'Unknown Artist', artwork: '', description: '' });
                    }
                })
                .catch(err => {
                    setMetadata({ title: 'Spotify Track', artist: 'Unknown Artist', artwork: '', description: '' });
                });
        }

        // Fetch YouTube Metadata (for Chapters)
        if (isYouTube) {
            fetch(`/api/metadata?url=${encodeURIComponent(url)}`)
                .then(res => res.json())
                .then(data => {
                    if (data && !data.error) {
                        setMetadata(prev => ({
                            ...prev,
                            title: data.title || prev.title,
                            artist: data.channelTitle || prev.artist,
                            description: data.description || '',
                        }));
                    }
                })
                .catch(err => console.error('Failed to fetch YouTube metadata', err));
        }

    }, [url, isSpotify, isYouTube, startParam, endParam]);

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

    // Parse Chapters when description changes
    useEffect(() => {
        if (metadata.description) {
            const parsed = parseChapters(metadata.description);
            console.log('[Chapters] Parsed:', parsed.length);
            setChapters(parsed);
        }
    }, [metadata.description]);

    // Update Current Chapter based on playback
    useEffect(() => {
        const time = isSpotify ? spotifyProgress.current : playbackState.current;
        const chapter = getCurrentChapter(chapters, time);
        if (chapter?.title !== currentChapter?.title) {
            setCurrentChapter(chapter);
        }
    }, [playbackState.current, spotifyProgress.current, chapters, isSpotify]);

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
                            description: snippet.description || '',
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
                        description: '',
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
                    description: '',
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
            // Limit removed
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

    // New Direct Handlers for Timeline
    const handleCaptureStart = (time: number) => {
        setStartSec(time);
        setCaptureState('start-captured');
        setError('');
    };

    const handleCaptureEnd = (time: number) => {
        setEndSec(time);
        setCaptureState('end-captured');
        setError('');
    };

    const handleSave = async () => {
        if (startSec == null || endSec == null || !note) return;

        console.log('[handleSave] Saving to Supabase:', metadata);
        setIsSaving(true);

        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setError('You must be logged in');
                setIsSaving(false);
                return;
            }

            const resource = getResourceId(url);
            if (!resource) {
                setError('Invalid resource');
                setIsSaving(false);
                return;
            }

            // Insert into Supabase
            const { data, error } = await supabase
                .from('moments')
                .insert({
                    user_id: user.id,
                    resource_id: resource.id,
                    platform: resource.platform,
                    start_time: startSec,
                    end_time: endSec,
                    note: note,
                    title: metadata.title,
                    artist: metadata.artist,
                    artwork: metadata.artwork,
                })
                .select(`
                    *,
                    profiles (
                        full_name,
                        avatar_url
                    )
                `)
                .single();

            if (data) {
                setSaved(true);
                // Map back to UI type
                const newMoment: Moment = {
                    id: data.id,
                    service: data.platform as any,
                    sourceUrl: url,
                    startSec: data.start_time,
                    endSec: data.end_time,
                    note: data.note,
                    title: data.title,
                    artist: data.artist,
                    artwork: data.artwork,
                    createdAt: new Date(data.created_at),
                    user: {
                        name: data.profiles?.full_name || user.user_metadata?.full_name || 'Me',
                        image: data.profiles?.avatar_url || user.user_metadata?.avatar_url
                    }
                } as Moment;

                setMoments([newMoment, ...moments]);
                setTimeout(() => setSaved(false), 3000);
                setCaptureState('idle');
                setStartSec(null);
                setEndSec(null);
                setNote('');
            } else if (error) {
                console.error('Supabase save error:', error);
                setError(error.message || 'Failed to save moment');
            }

        } catch (error: any) {
            console.error('Failed to save', error);
            setError(error.message || 'Failed to save moment');
        } finally {
            setIsSaving(false);
        }
    };



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

            // Strict Guard: One-Time-Only Per Video
            if (hasUpdatedDuration.current) return;

            // Check if ANY loaded moment is missing duration. 
            // If so, we assume the trackSource might need an update.
            const missingDuration = moments.some(m => !m.trackSource?.durationSec || m.trackSource.durationSec === 0);

            if (missingDuration) {
                console.log('[Auto-Heal] Detected missing duration, updating backend:', currentDuration);

                // LOCK immediately
                hasUpdatedDuration.current = true;

                fetch('/api/tracks/update-duration', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sourceUrl: url, durationSec: currentDuration })
                }).then(() => {
                    console.log('[Auto-Heal] Duration updated.');
                    // Update local state to reflect change
                    setMoments(prev => prev.map(m => ({
                        ...m,
                        trackSource: m.trackSource ? { ...m.trackSource, durationSec: currentDuration } : undefined
                    })));
                }).catch(err => {
                    console.error('[Auto-Heal] Failed:', err);
                    // Do NOT reset guard. If it failed, it failed. 
                    // Retrying in a loop is exactly what we want to avoid.
                });
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

    // Auto-End Recording on Stop
    useEffect(() => {
        if (!isPlaying && startSec !== null && endSec === null) {
            // Player stopped while recording -> Set End
            const current = isYouTube && youtubePlayer ? youtubePlayer.getCurrentTime() : spotifyProgress.current;
            const safeEnd = Math.max(current, startSec + 1); // MINIMUM 1s duration
            setEndSec(safeEnd);
            setCaptureState('end-captured');
        }
    }, [isPlaying, startSec, endSec, isYouTube, youtubePlayer, spotifyProgress.current]);

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

    const handleSeekRelative = (seconds: number) => {
        // Stop any active moment logic
        if (activeMoment) setActiveMoment(null);

        let current = 0;
        // Ensure duration is safe
        const duration = playbackState.duration || 0;

        if (isYouTube && youtubePlayer) {
            current = youtubePlayer.getCurrentTime();
        } else if (isSpotify && spotifyPlayer) {
            current = spotifyTimeRef.current;
        }

        let newTime = current + seconds;
        // Clamp time
        if (newTime < 0) newTime = 0;
        if (newTime > duration) newTime = duration;

        if (isYouTube && youtubePlayer) {
            youtubePlayer.seekTo(newTime, true);
        } else if (isSpotify && spotifyPlayer) {
            spotifyPlayer.seek(newTime);
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

    const handlePreviewCapture = () => {
        if (startSec !== null && endSec !== null) {
            // Create a temporary moment object for preview
            const previewMoment: Moment = {
                id: 'preview-capture',
                // Track info is implicit
                startSec: startSec,
                endSec: endSec,
                userId: '', // Preview doesn't need real user
                createdAt: new Date().toISOString(), // Use string format for Moment interface
                note: note || 'New Moment',
                service: isYouTube ? 'youtube' : 'spotify',
                sourceUrl: url,
                likeCount: 0
            };

            // Reuse existing playMoment logic to handle seeking/sounds
            playMoment(previewMoment);
        }
    };

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
                    <div className="lg:col-span-6 space-y-6">
                        {/* Metadata (Compact & Above Player) */}
                        <div className="flex items-center gap-4 px-1">
                            {metadata.artwork ? (
                                <img
                                    src={metadata.artwork}
                                    alt="Album Art"
                                    className="w-12 h-12 rounded-md object-cover shadow-lg"
                                />
                            ) : (
                                <div className="w-12 h-12 rounded-md bg-white/10 animate-pulse" />
                            )}
                            <div className="min-w-0">
                                <h2 className="text-lg font-bold leading-tight truncate">{metadata.title}</h2>
                                <p className="text-sm text-white/60 truncate">{metadata.artist}</p>
                            </div>
                        </div>
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

                            <div className="flex items-center justify-center gap-6 mt-4 mb-2 select-none">
                                {/* Left Controls: Seek Back */}
                                {(playbackState.duration > 1740) && (
                                    <button
                                        onClick={() => handleSeekRelative(-600)}
                                        className="text-white/70 hover:text-white font-mono text-xl p-2 transition-colors"
                                        title="-10 minutes"
                                    >
                                        &lt;&lt;&lt;
                                    </button>
                                )}
                                <button
                                    onClick={() => handleSeekRelative(-15)}
                                    className="text-white/70 hover:text-white font-mono text-xl p-2 transition-colors"
                                    title="-15 seconds"
                                >
                                    &lt;&lt;
                                </button>
                                <button
                                    onClick={() => handleSeekRelative(-2)}
                                    className="text-white/70 hover:text-white font-mono text-xl p-2 transition-colors"
                                    title="-2 seconds"
                                >
                                    &lt;
                                </button>

                                {/* Center: Play/Pause */}
                                <button
                                    onClick={() => handleTogglePlay(!isPlaying)}
                                    className="p-4 rounded-full bg-white text-black hover:scale-105 transition-transform shadow-lg"
                                    title={isPlaying ? "Pause" : "Play"}
                                >
                                    {isPlaying ? (
                                        <Pause className="w-6 h-6 fill-current" />
                                    ) : (
                                        <Play className="w-6 h-6 fill-current ml-0.5" />
                                    )}
                                </button>

                                {/* Right Controls: Seek Forward */}
                                <button
                                    onClick={() => handleSeekRelative(2)}
                                    className="text-white/70 hover:text-white font-mono text-xl p-2 transition-colors"
                                    title="+2 seconds"
                                >
                                    &gt;
                                </button>
                                <button
                                    onClick={() => handleSeekRelative(15)}
                                    className="text-white/70 hover:text-white font-mono text-xl p-2 transition-colors"
                                    title="+15 seconds"
                                >
                                    &gt;&gt;
                                </button>
                                {(playbackState.duration > 1740) && (
                                    <button
                                        onClick={() => handleSeekRelative(600)}
                                        className="text-white/70 hover:text-white font-mono text-xl p-2 transition-colors"
                                        title="+10 minutes"
                                    >
                                        &gt;&gt;&gt;
                                    </button>
                                )}
                            </div>


                            {/* Unified Player Timeline (Spotify & YouTube) */}
                            {(isSpotify || isYouTube) && (
                                <PlayerTimeline
                                    currentTime={isSpotify ? spotifyProgress.current : playbackState.current}
                                    duration={isSpotify ? spotifyProgress.duration : playbackState.duration}
                                    isPlaying={isPlaying}
                                    moments={moments}
                                    onSeek={handleSeek}
                                    onMomentClick={playMoment}
                                    onChapterClick={(chapter) => handleSeek(chapter.startSec)}
                                    startSec={startSec}
                                    endSec={endSec}
                                    note={note}
                                    onNoteChange={setNote}
                                    onSaveMoment={handleSave}
                                    onCancelCapture={() => {
                                        setStartSec(null);
                                        setEndSec(null);
                                        setCaptureState('idle');
                                        setError('');
                                    }}
                                    onPreviewCapture={handlePreviewCapture}
                                    onCaptureStart={(time) => {
                                        setStartSec(time);
                                        setCaptureState('start-captured');
                                        setError('');
                                    }}
                                    onCaptureEnd={(time) => {
                                        setEndSec(time);
                                        setCaptureState('end-captured');
                                        setError('');
                                    }}
                                    onCaptureUpdate={(start, end) => {
                                        // Allow clearing (null)
                                        if (start === null && end === null) {
                                            setStartSec(null);
                                            setEndSec(null);
                                            setCaptureState('idle');
                                        } else {
                                            if (start !== undefined) setStartSec(start);
                                            if (end !== undefined) setEndSec(end);

                                            // State Inference
                                            if (start === null) {
                                                setCaptureState('idle');
                                            } else if (end === null) {
                                                setCaptureState('start-captured');
                                            } else if (start !== null && end !== null) {
                                                setCaptureState('end-captured');
                                            }
                                        }
                                    }}
                                    activeMomentId={activeMoment?.id}
                                    chapters={chapters}
                                />
                            )}
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
                                    groupMoments(moments)
                                        .sort((a, b) => (activeMoment?.id === a.main.id ? -1 : activeMoment?.id === b.main.id ? 1 : 0))
                                        .map((group) => (
                                            <MomentGroup
                                                key={group.main.id}
                                                mainMoment={group.main}
                                                replies={group.replies}
                                                trackDuration={group.main.trackSource?.durationSec || (isSpotify ? spotifyProgress.duration : playbackState.duration)}
                                                onDelete={async (id) => {
                                                    try {
                                                        const res = await fetch(`/api/moments/${id}`, { method: 'DELETE' });
                                                        if (res.ok) {
                                                            // Smart Cleanup: Remove all moments that match the deleted one (duplicates)
                                                            setMoments(prev => {
                                                                const target = prev.find(m => m.id === id);
                                                                if (!target) return prev.filter(m => m.id !== id);

                                                                return prev.filter(m =>
                                                                    // Removing the exact ID OR any strict duplicate
                                                                    !(m.id === id || (
                                                                        m.sourceUrl === target.sourceUrl &&
                                                                        m.startSec === target.startSec &&
                                                                        m.endSec === target.endSec
                                                                    ))
                                                                );
                                                            });
                                                        }
                                                    } catch (e) {
                                                        console.error(e);
                                                    }
                                                }}
                                                showDelete={user?.id === group.main.userId}
                                                onPlayFull={() => {
                                                    router.push(`/room/view?url=${encodeURIComponent(group.main.sourceUrl)}`);
                                                }}
                                                onPlayMoment={playMoment}
                                                onPauseMoment={handlePauseMoment}
                                                currentTime={isSpotify ? spotifyProgress.current : playbackState.current}
                                                activeMomentId={activeMoment?.id}
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
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-semibold flex items-center gap-2">
                                    <Clock size={20} className="text-purple-400" />
                                    Moment Details
                                </h3>
                                {(captureState === 'start-captured' || captureState === 'end-captured') && (
                                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full font-mono text-sm font-bold transition-all ${captureState === 'start-captured' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-purple-500/10 text-purple-300 border border-purple-500/20'}`}>
                                        {captureState === 'start-captured' ? (
                                            <>
                                                <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                                                <span>
                                                    {Math.max(0, (isSpotify ? spotifyProgress.current : playbackState.current) - (startSec || 0))}s
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <MyMomentIcon className="w-4 h-4 fill-current" />
                                                <span>{(endSec || 0) - (startSec || 0)}s</span>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

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
                                <div className="flex items-center justify-between">
                                    <label className="text-xs text-white/50 uppercase tracking-wider">Label / Note</label>
                                    {currentChapter && (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="include-chapter"
                                                checked={includeChapterNote}
                                                onChange={(e) => {
                                                    setIncludeChapterNote(e.target.checked);
                                                    if (e.target.checked) {
                                                        const suffix = `${currentChapter.title}\n`;
                                                        if (!note.endsWith(suffix)) {
                                                            setNote(prev => prev + suffix);
                                                        }
                                                    }
                                                }}
                                                className="rounded sr-only" // Use custom style or standard
                                            />
                                            <label
                                                htmlFor="include-chapter"
                                                onClick={() => {
                                                    const checked = !includeChapterNote;
                                                    setIncludeChapterNote(checked);
                                                    if (checked) {
                                                        const suffix = ` [${currentChapter.title}]`;
                                                        if (!note.endsWith(suffix)) {
                                                            setNote(prev => prev + suffix);
                                                        }
                                                    }
                                                }}
                                                className={`text-xs cursor-pointer select-none transition-colors ${includeChapterNote ? 'text-purple-300' : 'text-white/30 hover:text-white/50'}`}
                                            >
                                                {includeChapterNote ? 'Start with chapter title' : 'Use chapter title?'}
                                            </label>
                                        </div>
                                    )}
                                </div>
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
