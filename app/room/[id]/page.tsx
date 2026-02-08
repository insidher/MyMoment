'use client';
import { createClient } from '@/lib/supabase/client';
import { createComment } from '../../actions/moments';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useRouter } from 'next/navigation';
import { Play, Pause, Save, Clock, ArrowLeft, Check, RotateCcw, ListMusic, Loader2, X } from 'lucide-react';
import Link from 'next/link';
import YouTube, { YouTubeEvent } from 'react-youtube';
import { toast } from 'sonner';
import { Moment } from '@/types';
import { useAuth } from '@/context/AuthContext';
import SignupPromptModal from '@/components/SignupPromptModal';


import MomentTimeline from '@/components/MomentTimeline';
import MomentCard from '@/components/MomentCard';
import MomentGroup from '@/components/MomentGroup';
import PlayerTimeline from '@/components/PlayerTimeline';
import MomentEditor from '@/components/MomentEditor';
import CreatorStudio from '@/components/CreatorStudio';
import { getTrackMoments, healTrackSource, fetchYoutubeMetadata } from '../../actions';
import { sanitizeMoment } from '@/lib/sanitize';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { MyMomentIcon } from '@/components/icons/MyMomentIcon';
import { parseChapters, getCurrentChapter, Chapter } from '@/lib/chapters';
import { usePlaybackGuard } from '@/hooks/usePlaybackGuard';
import GroupingPromptModal from '@/components/GroupingPromptModal';
import Footer from '@/components/layout/Footer';

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
            groups[key].replies.push(m);
        }
    });

    // Sort groups by main moment's creation time (newest first)? Or start time?
    // Usually newest first is good for feeds, but for a room list, maybe time order? 
    // Let's stick to the current order of moments which is Newest First.
    // Convert map to array and determine Main vs Replies for each group
    return Object.values(groups).map(group => {
        // We have a list of moments sharing the same timestamp/source.
        // We need to identify the "Main" moment.
        // Priority 1: The one with parentId === null (Root).
        // Priority 2: The Oldest one (created first).

        let all = [group.main, ...group.replies];

        // Sort by creation time ascending (Oldest First)
        all.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        // Find root
        const rootIndex = all.findIndex(m => !m.parentId);

        let mainMoment: Moment;
        let replies: Moment[];

        if (rootIndex !== -1) {
            mainMoment = all[rootIndex];
            // Remove main from list, keep others
            replies = all.filter((_, idx) => idx !== rootIndex);
        } else {
            // No strict root found (maybe all are replies to a deleted root? or fuzzy matches)
            // Fallback to Oldest as Main
            mainMoment = all[0];
            replies = all.slice(1);
        }

        // Re-sort replies by Newest First for display (since we want newest comments at top)
        replies.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return { main: mainMoment, replies };
    });
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


    const searchParams = useSearchParams();
    const router = useRouter();
    const rawUrl = searchParams.get('url');
    const url = rawUrl ? decodeURIComponent(rawUrl) : '';

    // 🎨 [Render Cycle] moved down

    const [startSec, setStartSec] = useState<number | null>(null);
    const [endSec, setEndSec] = useState<number | null>(null);
    const [note, setNote] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Reply Mode State
    const [replyingTo, setReplyingTo] = useState<{ id: string; username: string } | null>(null);
    const noteInputRef = useRef<HTMLTextAreaElement>(null);

    // Smart Capture State
    const [captureState, setCaptureState] = useState<CaptureState>('idle');
    const [showSignupModal, setShowSignupModal] = useState(false);

    // Creator Mode State (Lifted from PlayerTimeline)
    const [isCreatorMode, setIsCreatorMode] = useState(false);
    const [editingMomentId, setEditingMomentId] = useState<string | null>(null);

    // Handler to toggle Creator Mode and lock body scroll
    const handleCreatorModeChange = (isOpen: boolean) => {
        setIsCreatorMode(isOpen);
        if (typeof document !== 'undefined') {
            if (isOpen) {
                document.body.classList.add('overflow-hidden');
                document.body.classList.add('is-creator-mode');
            } else {
                document.body.classList.remove('overflow-hidden');
                document.body.classList.remove('is-creator-mode');
            }
        }
    };

    const [focusTrigger, setFocusTrigger] = useState(0);
    const [youtubePlayer, setYoutubePlayer] = useState<any>(null);
    const [spotifyPlayer, setSpotifyPlayer] = useState<SpotifyController | null>(null);
    const [error, setError] = useState('');
    const [durationLimitError, setDurationLimitError] = useState(false);
    const [groupingConfirmation, setGroupingConfirmation] = useState<{
        payload: any;
        conflictMoment: Moment;
    } | null>(null);

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

    // Cleanup Creator Mode classes on unmount
    useEffect(() => {
        return () => {
            if (typeof document !== 'undefined') {
                document.body.classList.remove('is-creator-mode');
                document.body.classList.remove('overflow-hidden');
            }
        };
    }, []);


    // Real Metadata State

    const [metadata, setMetadata] = useState({
        title: 'Loading...',
        artist: '...',
        artwork: '',
        description: '',
        duration_sec: 0,
    });

    // Chapter State
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
    const [includeChapterNote, setIncludeChapterNote] = useState(false);

    // Moments List State
    const [moments, setMoments] = useState<Moment[]>([]);





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

    }, [startParam, endParam, isSpotify, url]);

    const fetchMoments = async () => {
        const resource = getResourceId(url);
        if (!resource) return;

        try {
            // Use Server Action to bypass RLS
            // Query by the FULL URL (sourceUrl) because that is how it is stored in the DB
            const data = await getTrackMoments(url);

            // Map to ensure any missing fields or local overrides
            const mappedMoments: Moment[] = data.map((m: any) => ({
                ...m,
                sourceUrl: url,
                momentDurationSec: m.momentDurationSec || (m.endSec - m.startSec)
            }));

            setMoments(mappedMoments);

            // If URL has start/end parameters, find and activate the matching moment
            if (startParam && endParam) {
                const start = parseFloat(startParam);
                const end = parseFloat(endParam);

                // Find moment that matches these timestamps (with small tolerance for floating point)
                const matchingMoment = mappedMoments.find(m =>
                    Math.abs(m.startSec - start) < 0.5 && Math.abs(m.endSec - end) < 0.5
                );

                if (matchingMoment) {
                    // Found existing moment - set it as active
                    setActiveMoment(matchingMoment);
                    // Explicitly clear draft state to avoid "stuck" red UI on load
                    setStartSec(null);
                    setEndSec(null);
                    setCaptureState('idle');
                }
            }
        } catch (err) {
            console.error('Failed to fetch moments:', err);
        }
    };

    const handleNewReply = (parentId: string, rawReply: any) => {
        // 🛡️ SANITIZATION: Protect against bad API data
        const newReply = sanitizeMoment(rawReply);

        setMoments((prevMoments) => {

            // Find the parent moment to get its timestamp info
            const parentMoment = prevMoments.find(m => m.id === parentId);

            if (!parentMoment) {
                return prevMoments;
            }

            // Check if reply already exists (prevent duplicates)
            if (prevMoments.some(m => m.id === newReply.id)) {
                return prevMoments;
            }

            // Add the reply as a new moment with the SAME timestamp as parent
            // This allows groupMoments() to group them together
            const replyAsMoment = {
                ...newReply,
                startSec: parentMoment.startSec,
                endSec: parentMoment.endSec,
                sourceUrl: parentMoment.sourceUrl,
                parentId: parentId // Mark it as a reply
            };
            // APPEND to end so parent is processed first by groupMoments()
            return [...prevMoments, replyAsMoment];
        });
    };

    // Initial Fetch
    useEffect(() => {
        if (!url) return;
        fetchMoments();

        // Fetch Spotify Metadata
        if (isSpotify) {
            fetch(`/api/metadata?url=${encodeURIComponent(url)}`)
                .then(res => res.json())
                .then(data => {
                    if (data && !data.error) {
                        setMetadata(data);
                        if (data.duration_sec) {
                            setSpotifyProgress(prev => ({ ...prev, duration: data.duration_sec }));
                            setPlaybackState(prev => ({ ...prev, duration: data.duration_sec }));

                            // Persist healing back to database so Plaza/Profile are fixed
                            healTrackSource(url, data.duration_sec);
                        }
                    } else {
                        setMetadata({ title: 'Spotify Track', artist: 'Unknown Artist', artwork: '', description: '', duration_sec: 0 });
                    }
                })
                .catch(err => {
                    setMetadata({ title: 'Spotify Track', artist: 'Unknown Artist', artwork: '', description: '', duration_sec: 0 });
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

    // 🔴 REALTIME: Subscribe to new moments and updates
    useEffect(() => {
        if (!url) return;

        const supabase = createClient();

        // Create a channel for this specific room
        const channel = supabase
            .channel(`room:${url}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'moments',
                    filter: `resource_id=eq.${url}`
                },
                async (payload) => {
                    // Fetch the profile data for the new moment
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('name, image')
                        .eq('id', payload.new.user_id)
                        .single();

                    // Map database fields (snake_case) to Moment interface (camelCase)
                    const newMoment = {
                        id: payload.new.id,
                        parentId: payload.new.parent_id, // ← Critical: map parent_id
                        groupId: payload.new.group_id, // ← Critical: map group_id for clustering
                        service: payload.new.platform,
                        sourceUrl: payload.new.resource_id || url,
                        startSec: payload.new.start_time,
                        endSec: payload.new.end_time,
                        momentDurationSec: payload.new.end_time - payload.new.start_time,
                        title: payload.new.title,
                        artist: payload.new.artist,
                        artwork: payload.new.artwork,
                        note: payload.new.note,
                        likeCount: payload.new.like_count || 0,
                        createdAt: payload.new.created_at,
                        updatedAt: payload.new.updated_at,
                        userId: payload.new.user_id,
                        user: profile || { name: 'Unknown', image: null },
                        profiles: profile || { name: 'Unknown', image: null },
                        isLiked: false,
                        likes: [],
                        replies: []
                    };

                    // Sanitize the moment
                    const sanitized = sanitizeMoment(newMoment);

                    // Add to state (avoid duplicates)
                    setMoments((prev) => {
                        // Check if moment already exists
                        if (prev.some(m => m.id === sanitized.id)) {
                            return prev;
                        }
                        return [...prev, sanitized];
                    });

                    toast.success(`New comment from ${profile?.name || 'someone'}!`);
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'moments',
                    filter: `resource_id=eq.${url}`
                },
                (payload) => {
                    // Update the specific moment in state
                    setMoments((prev) =>
                        prev.map((m) =>
                            m.id === payload.new.id
                                ? { ...m, ...payload.new }
                                : m
                        )
                    );
                }
            )
            .subscribe();

        // Cleanup on unmount
        return () => {
            supabase.removeChannel(channel);
        };
    }, [url]);


    // YouTube Polling for Timeline - REPLACED BY AD GUARD
    /*
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
    */

    // Ad Guard Hook
    const {
        currentTime: guardCurrentTime,
        duration: guardDuration,
        isAd,
        controlsDisabled
    } = usePlaybackGuard({
        player: youtubePlayer,
        expectedDuration: metadata?.duration_sec || 0,
        startParam: searchParams.get('start'),
        isEnabled: !!(isYouTube && metadata?.duration_sec)
    });

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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                EmbedController.addListener('playback_update', (e: { data: { position: number; duration: number; isPaused: boolean } }) => {
                    if (e && e.data) {
                        const current = Math.floor(e.data.position / 1000);
                        const duration = Math.floor(e.data.duration / 1000);
                        spotifyTimeRef.current = current;

                        // Duration Healing: If player provides a longer/better duration, use it
                        setSpotifyProgress(prev => {
                            const newDuration = (duration > 0 && duration !== prev.duration) ? duration : prev.duration;
                            if (newDuration > prev.duration) {
                                // If the player reports a better duration than we had from metadata/DB, update DB
                                healTrackSource(url, newDuration);
                            }
                            return { current, duration: newDuration };
                        });
                        setPlaybackState(prev => {
                            const newDuration = (duration > 0 && duration !== prev.duration) ? duration : prev.duration;
                            return { current, duration: newDuration };
                        });
                        setIsPlaying(!e.data.isPaused);
                    }
                });
            };
            IFrameAPI.createController(element, options, callback);
        };

        // @ts-expect-error
        if (window.SpotifyIframeApi) {
            // @ts-ignore
            initSpotifyPlayer(window.SpotifyIframeApi);
        } else if (
            // @ts-expect-error
            !window.onSpotifyIframeApiReady
        ) {
            // @ts-expect-error
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
    // Fetch Related Content - Disabled
    // useEffect(() => {}, []);

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
            // Fetch metadata from YouTube Data API using secure server action
            try {
                const metadata = await fetchYoutubeMetadata(videoId);

                if (metadata) {
                    setMetadata({
                        title: metadata.title,
                        artist: metadata.channelTitle,
                        artwork: metadata.thumbnail,
                        description: metadata.description,
                        duration_sec: metadata.durationSec,
                    });
                    console.log('[YouTube API] Metadata set:', metadata.title, 'by', metadata.channelTitle, 'Duration:', metadata.durationSec);
                } else {
                    // Fallback to iframe API if server action fails
                    console.warn('[YouTube] Server action failed, using iframe fallback');
                    const videoData = event.target.getVideoData();
                    setMetadata({
                        title: videoData.title || 'YouTube Video',
                        artist: videoData.author || 'Unknown Channel',
                        artwork: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                        description: '',
                        duration_sec: 0,
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
                    duration_sec: 0,
                });
            }
        }

        // Auto-seek handled by usePlaybackGuard now
        /*
        if (startParam) {
            const start = parseInt(startParam);
            console.log('[Room] Auto-seeking to:', start);
            event.target.seekTo(start, true);
            event.target.playVideo();
        }
        */
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

    // Extracted Creation Logic
    const executeCreateMoment = async (basePayload: any, groupId: string | null = null) => {
        setIsSaving(true);
        try {
            // Peer-to-Peer: parentId is NULL for grouped moments
            const payload = { ...basePayload, groupId };

            // 2. CONSTRUCT OPTIMISTIC MOMENT (The "Fake" Moment)
            const tempId = `temp-${Date.now()}`;
            const optimisticMoment: Moment = {
                id: tempId,
                service: isSpotify ? 'spotify' : 'youtube',
                sourceUrl: url,
                startSec: payload.startSec!,
                endSec: payload.endSec!,
                momentDurationSec: (payload.endSec!) - (payload.startSec!),
                title: metadata?.title || 'Unknown Title',
                artist: metadata?.artist || 'Unknown Artist',
                artwork: metadata?.artwork || null,
                note: payload.note,
                likeCount: 0,
                savedByCount: 0,
                createdAt: new Date().toISOString(),
                user: {
                    name: (user as any)?.name || (user as any)?.full_name || 'Me',
                    image: (user as any)?.image || (user as any)?.avatar_url || null
                },
                replies: [],
                groupId: groupId, // Set Group ID
                parentId: null // Always null for Peer-to-Peer
            } as unknown as Moment;

            console.log("🔍 [Step 1] Constructing Optimistic Moment. ID:", optimisticMoment.id);

            // 3. ⚡ INSTANT UPDATE
            setMoments((prev) => {
                const newArray = [optimisticMoment, ...prev];
                return newArray;
            });

            setCaptureState('idle');
            setStartSec(null);
            setEndSec(null);
            setNote('');
            handleCreatorModeChange(false);
            setSaved(true);
            console.log("✅ [Capture] Optimistic update successful. Temp ID:", tempId);
            toast.success("Moment captured!");

            // Clear confirmation if any
            setGroupingConfirmation(null);

            try {
                const res = await fetch('/api/moments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                const data = await res.json();

                if (!res.ok) {
                    setMoments((prev) => prev.filter(m => m.id !== tempId));
                    throw new Error(data.error || 'Failed to save moment');
                }

                if (data.moment) {
                    const m = data.moment;
                    const realMoment: Moment = {
                        id: m.id,
                        groupId: m.groupId ?? m.group_id, // ← CRITICAL: Map group_id from server
                        service: m.service ?? m.platform,
                        sourceUrl: url,
                        startSec: m.startSec ?? m.start_time,
                        endSec: m.endSec ?? m.end_time,
                        momentDurationSec: (m.endSec ?? m.end_time) - (m.startSec ?? m.start_time),
                        title: m.title,
                        artist: m.artist,
                        artwork: m.artwork,
                        note: m.note,
                        likeCount: m.likeCount ?? 0,
                        savedByCount: m.savedByCount ?? 1,
                        createdAt: new Date(m.createdAt ?? m.created_at).toISOString(),
                        user: {
                            name: m.user?.name ?? m.user?.full_name ?? 'Me',
                            image: m.user?.image ?? m.user?.avatar_url
                        },
                        trackSource: m.trackSource,
                        replies: [],
                        parentId: m.parentId ?? m.parent_id // Ensure strict typing
                    } as unknown as Moment;

                    setMoments((prev) => prev.map((curr) =>
                        curr.id === tempId ? realMoment : curr
                    ));
                }
            } catch (innerError) {
                console.error("Network save failed:", innerError);
                setMoments((prev) => prev.filter(m => m.id !== tempId));
                setSaved(false);
                throw innerError;
            }
            setTimeout(() => setSaved(false), 3000);

        } catch (error: unknown) {
            console.error('Failed to save', error);
            const message = error instanceof Error ? error.message : 'Failed to save moment';
            setError(message);
            toast.error(message);
        } finally {
            setIsSaving(false);
        }
    };

    const executeSmartGroup = async (targetMoment: Moment, payload: any) => {
        let targetGroupId = targetMoment.groupId;

        if (!targetGroupId) {
            // Create new Group ID
            targetGroupId = crypto.randomUUID();

            // Optimistic Update for Target
            setMoments(prev => prev.map(m => m.id === targetMoment.id ? { ...m, groupId: targetGroupId } : m));

            // DB Update for Target (Fire & Forget)
            fetch(`/api/moments/${targetMoment.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ groupId: targetGroupId })
            }).catch(e => console.error("Failed to update target group", e));
        }

        await executeCreateMoment(payload, targetGroupId);
        setGroupingConfirmation(null);
    };

    const handleSave = async () => {
        // 🛑 ADD THESE LOGS AT THE VERY START
        console.log("🚦 [Gatekeeper] handleSave triggered!");

        // 🔒 GUEST GATEKEEPER
        if (!user) {
            console.log("🔒 [Gatekeeper] Guest detected. Showing signup prompt.");
            setShowSignupModal(true);
            return;
        }

        if (!note?.trim()) {
            console.log("🛑 [Gatekeeper] BLOCKED: Content is empty");
            return;
        }

        if (!replyingTo && (startSec == null || endSec == null)) return;

        // 3rd Minute Limit Check
        const duration = (endSec || 0) - (startSec || 0);
        if (!replyingTo && duration > 180) {
            setDurationLimitError(true);
            return;
        }

        setIsSaving(true);

        // 1. REPLY FLOW
        if (replyingTo) {
            try {
                const isHead = replyingTo.id === params.id;
                const newComment = await createComment(replyingTo.id, note, window.location.pathname, isHead);
                if (newComment) {
                    toast.success('Reply posted!');
                    setSaved(true);

                    // We need to fetch moments again or optimistically update. 
                    // For now, let's just clear state.
                    setTimeout(() => setSaved(false), 2000);
                    setReplyingTo(null);
                    setNote('');
                }
            } catch (e) {
                console.error(e);
                toast.error('Failed to reply');
            } finally {
                setIsSaving(false);
            }
            return;
        }

        // 2. CREATE MOMENT FLOW
        const payload = {
            sourceUrl: url,
            startSec,
            endSec,
            note,
            title: metadata?.title || 'Unknown Title',
            artist: metadata?.artist || 'Unknown Artist',
            artwork: metadata?.artwork || null,
            service: isSpotify ? 'spotify' : 'youtube',
            duration: (isSpotify ? spotifyProgress.duration : playbackState.duration) || metadata.duration_sec,
        };

        // --- CONFLICT & SMART GROUPING DETECTION (TRI-STATE) ---
        const AUTO_GROUP_TOLERANCE = 0.5; // seconds - tight tolerance for auto-grouping
        const PROMPT_PROXIMITY = 3.0; // seconds - ask user if within this range

        // Sort moments by Duration (Largest to Smallest) to prioritize "Container" moments
        const candidateParents = moments
            .filter(m => !m.parentId) // Only consider root moments for grouping
            .sort((a, b) => (b.endSec - b.startSec) - (a.endSec - a.startSec));

        const s = startSec!;
        const e = endSec!;

        // Find the best parent match
        const potentialGroup = candidateParents.find(parent => {
            // Check if there's any relationship (containment, overlap, or proximity)
            const startsNear = s >= (parent.startSec - PROMPT_PROXIMITY);
            const endsNear = e <= (parent.endSec + PROMPT_PROXIMITY);
            const hasOverlap = s < parent.endSec && e > parent.startSec;

            return (startsNear && endsNear) || hasOverlap;
        });

        if (potentialGroup) {
            // ZONE 1: Strict Containment (Auto-Group)
            const strictlyContained =
                s >= (potentialGroup.startSec - AUTO_GROUP_TOLERANCE) &&
                e <= (potentialGroup.endSec + AUTO_GROUP_TOLERANCE) &&
                (potentialGroup.endSec - potentialGroup.startSec) > (e - s); // Parent must be larger

            if (strictlyContained) {
                console.log("🔒 [Capture] Auto-Grouping (Strictly Contained)");
                await executeSmartGroup(potentialGroup, payload);
                return;
            }

            // ZONE 2: Overlap or Proximity (Ask User)
            const hasOverlap = s < potentialGroup.endSec && e > potentialGroup.startSec;
            const isNearStart = Math.abs(s - potentialGroup.startSec) <= PROMPT_PROXIMITY;
            const isNearEnd = Math.abs(e - potentialGroup.endSec) <= PROMPT_PROXIMITY;

            if (hasOverlap || isNearStart || isNearEnd) {
                console.log("❓ [Capture] Prompting User (Overlap/Proximity)");
                setIsSaving(false); // Pause save
                setGroupingConfirmation({
                    payload,
                    conflictMoment: potentialGroup
                });
                return; // Wait for user decision
            }
        }

        // ZONE 3: No Match (Create New)
        console.log("✨ [Capture] Creating New Root Moment");
        await executeCreateMoment(payload, null);
    };

    const handleUpdateMoment = async (id: string, newNote: string) => {
        try {
            const res = await fetch(`/api/moments/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ note: newNote }),
            });

            if (!res.ok) throw new Error('Failed to update moment');

            // Update local state
            setMoments(prev => prev.map(m =>
                m.id === id ? { ...m, note: newNote, updatedAt: new Date().toISOString() } : m
            ));

            toast.success("Moment updated!");
            return true;
        } catch (error) {
            console.error('Update failed', error);
            toast.error("Failed to update moment");
            return false;
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
            try {
                if (activeMoment?.service === 'youtube' && youtubePlayer && typeof youtubePlayer.setVolume === 'function') {
                    youtubePlayer.setVolume(100);
                }
            } catch (e) {
                // Ignore player errors on cleanup
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
        // STOP PREVIEW LOGIC
        // If we are currently previewing and validly click preview again, STOP it.
        if (activeMoment?.id === 'preview-draft' && moment.id === 'preview-draft') {
            setActiveMoment(null);
            if (isYouTube && youtubePlayer) youtubePlayer.pauseVideo();
            if (isSpotify && spotifyPlayer) spotifyPlayer.pause();
            setIsPlaying(false);
            return;
        }

        // If clicking the active moment (normal moments), toggle play/pause or resume
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
        if (activeMoment) {
            setActiveMoment(null);
            // Reset volume for YouTube when exiting moment mode
            if (isYouTube && youtubePlayer) {
                youtubePlayer.setVolume(100);
            }
        }

        let current = 0;
        // Use the appropriate time source based on platform
        if (isYouTube) {
            // Use guardCurrentTime from playback guard to avoid frozen time during ads
            current = guardCurrentTime;
        } else if (isSpotify) {
            current = spotifyTimeRef.current;
        }

        // Ensure duration is safe - use guard duration for YouTube
        const duration = isYouTube ? guardDuration : (playbackState.duration || 0);

        let newTime = current + seconds;
        // Clamp time
        if (newTime < 0) newTime = 0;
        if (newTime > duration) newTime = duration;

        console.log(`[Skip] Current: ${current}s, Seeking to: ${newTime}s (${seconds > 0 ? '+' : ''}${seconds}s)`);

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
        <main className="flex flex-col min-h-screen bg-black text-white">
            <SignupPromptModal
                isOpen={showSignupModal}
                onClose={() => setShowSignupModal(false)}
            />
            {/* RIGID ZONE: Fixed Video Player + Timeline */}
            <section className="shrink-0 w-full relative z-10 bg-black">
                {/* Desktop: 65/35 Split | Mobile: Full Width */}
                <div className="flex flex-col lg:flex-row lg:gap-4 lg:px-4">
                    {/* Left: Video Player + Timeline (65% on desktop) */}
                    <div className={`w-full lg:w-[65%] px-4 lg:px-0 ${isCreatorMode ? 'fixed top-16 left-0 right-0 bottom-0 z-50 bg-black !p-0 flex flex-col overflow-y-auto overflow-x-hidden' : ''}`}>
                        <div className={`glass-panel p-1 overflow-hidden relative bg-black ${isCreatorMode ? 'shrink-0 h-[35vh] rounded-none !border-0' : 'aspect-video'}`}>
                            {isYouTube && youtubeId ? (
                                <>
                                    <YouTube
                                        videoId={youtubeId}
                                        className="w-full h-full"
                                        iframeClassName="w-full h-full rounded-xl"
                                        onReady={onPlayerReady}
                                        onStateChange={(event) => {
                                            if (event.data === 1) setIsPlaying(true); // Playing
                                            if (event.data === 2) setIsPlaying(false); // Paused

                                            if (event.data === 1 && !hasUpdatedDuration.current) {
                                                const dur = event.target.getDuration();
                                                if (dur > 0 && Math.abs(dur - metadata.duration_sec) > 5) {
                                                    console.log(`[YouTube] Updating duration: ${metadata.duration_sec} -> ${dur}`);
                                                    setMetadata(prev => ({ ...prev, duration_sec: dur }));

                                                    // Heal DB
                                                    // Use URL as the key since that's what getTrackMoments uses
                                                    healTrackSource(url, dur).then(() => {
                                                        console.log('[YouTube] DB duration healed');
                                                    });

                                                    hasUpdatedDuration.current = true;
                                                }
                                            }
                                        }}
                                        opts={{
                                            playerVars: {
                                                autoplay: 1,
                                                controls: 0, // Hide native controls
                                                modestbranding: 1,
                                                rel: 0,
                                                start: startParam ? parseInt(startParam) : undefined
                                            }
                                        }}
                                    />
                                    {/* Scrubber Overlay */}
                                    <div className="absolute inset-x-0 bottom-0 h-1 bg-transparent group hover:h-2 transition-all z-10 cursor-pointer pointer-events-none">
                                        {/* Visual scrubber bar could go here if we wanted a native-like overlay */}
                                    </div>
                                </>
                            ) : isSpotify ? (
                                <div className="relative w-full h-full">
                                    <div id="spotify-embed" className="w-full h-full rounded-xl" />

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

                        {/* Sticky Header: Controls + Timeline - LOWERED Z-INDEX to fix menu conflict */}
                        <div className={`${isCreatorMode ? 'sticky top-0 z-[30] bg-black/95 backdrop-blur-md pb-2 px-4 border-t border-white/10' : 'sticky top-14 z-[30] bg-black/95 backdrop-blur-md pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 lg:bg-black lg:border-b lg:border-white/10 lg:rounded-b-xl lg:mb-4 lg:pt-2'}`}>

                            {/* Compact Playback Controls */}
                            {(isYouTube || isSpotify) && (
                                <div className="flex items-center justify-center gap-1.5 py-1.5 px-2">
                                    {/* Skip Back 10 min */}
                                    <button
                                        onClick={() => handleSeekRelative(-600)}
                                        disabled={controlsDisabled}
                                        className="px-1.5 py-0.5 rounded text-[10px] font-mono hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-white/60"
                                        title="Skip back 10 min"
                                    >
                                        -10m
                                    </button>

                                    {/* Skip Back 1 min */}
                                    <button
                                        onClick={() => handleSeekRelative(-60)}
                                        disabled={controlsDisabled}
                                        className="px-1.5 py-0.5 rounded text-[10px] font-mono hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-white/60"
                                        title="Skip back 1 min"
                                    >
                                        -1m
                                    </button>

                                    {/* Skip Back 15s */}
                                    <button
                                        onClick={() => handleSeekRelative(-15)}
                                        disabled={controlsDisabled}
                                        className="p-1 rounded hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                        title="Skip back 15s"
                                    >
                                        <RotateCcw size={14} className="text-white/70" />
                                    </button>

                                    {/* Play/Pause */}
                                    <button
                                        onClick={() => handleTogglePlay(!isPlaying)}
                                        disabled={controlsDisabled}
                                        className="p-1.5 rounded-full hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                        title={isPlaying ? 'Pause' : 'Play'}
                                    >
                                        {isPlaying ? (
                                            <Pause size={16} className="text-white" fill="white" />
                                        ) : (
                                            <Play size={16} className="text-white" fill="white" />
                                        )}
                                    </button>

                                    {/* Skip Forward 15s */}
                                    <button
                                        onClick={() => handleSeekRelative(15)}
                                        disabled={controlsDisabled}
                                        className="p-1 rounded hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                        title="Skip forward 15s"
                                    >
                                        <RotateCcw size={14} className="text-white/70 scale-x-[-1]" />
                                    </button>

                                    {/* Skip Forward 1 min */}
                                    <button
                                        onClick={() => handleSeekRelative(60)}
                                        disabled={controlsDisabled}
                                        className="px-1.5 py-0.5 rounded text-[10px] font-mono hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-white/60"
                                        title="Skip forward 1 min"
                                    >
                                        +1m
                                    </button>

                                    {/* Skip Forward 10 min */}
                                    <button
                                        onClick={() => handleSeekRelative(600)}
                                        disabled={controlsDisabled}
                                        className="px-1.5 py-0.5 rounded text-[10px] font-mono hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-white/60"
                                        title="Skip forward 10 min"
                                    >
                                        +10m
                                    </button>
                                </div>
                            )}

                            {/* Unified Player Timeline (Spotify & YouTube) */}
                            {(isSpotify || isYouTube) && (
                                <PlayerTimeline
                                    currentTime={isSpotify ? spotifyProgress.current : guardCurrentTime}
                                    duration={isSpotify ? spotifyProgress.duration : guardDuration}
                                    disabled={controlsDisabled}
                                    isPlaying={isPlaying}
                                    moments={moments}
                                    onSeek={handleSeek}
                                    onMomentClick={playMoment}
                                    service={isYouTube ? 'youtube' : 'spotify'}
                                    onChapterClick={(chapter) => handleSeek(chapter.startSec)}
                                    onPause={() => {
                                        // Pause the video when clicking draft markers
                                        if (isYouTube && youtubePlayer) {
                                            youtubePlayer.pauseVideo();
                                        } else if (isSpotify && spotifyPlayer) {
                                            spotifyPlayer.pause();
                                        }
                                        setIsPlaying(false);
                                    }}
                                    editingMomentId={editingMomentId}
                                    setEditingMomentId={setEditingMomentId}
                                    activeMomentId={activeMoment?.id || null}
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
                                        setNote('');
                                        handleCreatorModeChange(false);
                                    }}
                                    onCancelDraft={() => {
                                        setStartSec(null);
                                        setEndSec(null);
                                        setCaptureState('idle');
                                        setError('');
                                        setNote('');
                                        handleCreatorModeChange(false);
                                    }}
                                    onPreviewCapture={handlePreviewCapture}
                                    onCaptureStart={(time) => {
                                        setStartSec(time);
                                        setCaptureState('start-captured');
                                        setError('');
                                    }}
                                    // Creator Mode Props
                                    isEditorOpen={isCreatorMode}
                                    onEditorOpenChange={handleCreatorModeChange}
                                    onFocusRequest={() => setFocusTrigger(prev => prev + 1)}
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
                                    chapters={chapters}
                                />
                            )}

                        </div>

                        {/* CREATOR STUDIO (Visible only in Creator Mode) */}
                        {isCreatorMode && (
                            <div className="flex-1 min-h-0 bg-neutral-900 animate-in slide-in-from-bottom duration-300">
                                <CreatorStudio
                                    note={note}
                                    onNoteChange={setNote}
                                    onSave={handleSave}
                                    onCancel={() => {
                                        handleCreatorModeChange(false);
                                        setCaptureState('end-captured');
                                        // PERSIST DRAFT: Don't null out startSec/endSec!
                                    }}
                                />
                            </div>
                        )}

                        {/* SCROLLABLE MOMENTS FEED (Moved here for Sticky Behavior) */}
                        {!isCreatorMode && (
                            <div className="w-full space-y-3 pb-16">
                                {/* Moments List */}
                                <div className="glass-panel p-3 space-y-3">
                                    <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                                        {metadata.artwork ? (
                                            <img
                                                src={metadata.artwork}
                                                alt="Album Art"
                                                className="w-12 h-12 rounded-md object-cover shadow-lg shrink-0"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-md bg-white/10 animate-pulse shrink-0" />
                                        )}
                                        <div className="min-w-0">
                                            <h3 className="text-base font-semibold text-white truncate">
                                                Saved Moments
                                            </h3>
                                            <p className="text-xs text-white/60 truncate">
                                                for <span className="text-white/90 font-medium">{metadata.title || 'Unknown Video'}</span>
                                            </p>
                                        </div>
                                        <div className="ml-auto text-xs text-white/40 font-mono bg-white/5 px-2 py-1 rounded-full">
                                            {groupMoments(moments).length}
                                        </div>
                                    </div>

                                    <div className="grid gap-2">
                                        {moments.length === 0 ? (
                                            <div className="text-center py-8 text-white/30 italic">
                                                No moments saved yet. Be the first!
                                            </div>
                                        ) : (
                                            groupMoments(moments)
                                                .sort((a, b) => (activeMoment?.id === a.main.id ? -1 : activeMoment?.id === b.main.id ? 1 : 0))
                                                .map((group) => {
                                                    if (group.main.id.toString().includes('temp')) {
                                                        console.log("👀 [Render Loop] Found Optimistic Moment in JSX:", group.main.id);
                                                    }
                                                    return (
                                                        <MomentGroup
                                                            key={group.main.id}
                                                            mainMoment={group.main}
                                                            replies={group.replies}
                                                            trackDuration={(isSpotify ? spotifyProgress.duration : playbackState.duration) || metadata.duration_sec || group.main.trackSource?.durationSec}
                                                            onDelete={async (id) => {
                                                                try {
                                                                    const res = await fetch(`/api/moments/${id}`, { method: 'DELETE' });
                                                                    if (res.ok) {
                                                                        setMoments(prev => {
                                                                            const target = prev.find(m => m.id === id);
                                                                            if (!target) return prev.filter(m => m.id !== id);

                                                                            return prev.filter(m =>
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
                                                            showDelete={false}
                                                            onPlayFull={() => {
                                                                router.push(`/room/view?url=${encodeURIComponent(group.main.sourceUrl)}`);
                                                            }}
                                                            onPlayMoment={playMoment}
                                                            onPauseMoment={handlePauseMoment}
                                                            currentTime={isSpotify ? spotifyProgress.current : playbackState.current}
                                                            activeMomentId={activeMoment?.id}
                                                            isPlaying={isPlaying}
                                                            currentUserId={user?.id || ''}
                                                            currentUser={user ? { id: user.id, name: user.email, image: null } : undefined}
                                                            onReply={(momentId, username) => {
                                                                setReplyingTo({ id: momentId, username });
                                                                noteInputRef.current?.focus();
                                                            }}
                                                            onRefresh={fetchMoments}
                                                            onNewReply={handleNewReply}
                                                        />
                                                    );
                                                })
                                        )}
                                    </div>
                                </div>
                                <div className="pb-8">
                                    <Footer />
                                </div>
                            </div>

                        )}
                    </div>

                    {/* Right: Sidebar (35% on desktop, hidden on mobile) */}
                    <div className="hidden lg:block lg:w-[35%] shrink-0">
                        {/* Render MomentEditor in sidebar when active AND explicitly opened */}
                        {((startSec !== null || endSec !== null) && isCreatorMode) ? (
                            <div className="sticky top-4">
                                <MomentEditor
                                    isOpen={true}
                                    focusTrigger={focusTrigger}
                                    note={note}
                                    startSec={startSec}
                                    endSec={endSec}
                                    editingMomentId={null}
                                    currentUser={user ? { name: user.email, image: null } : undefined}
                                    onNoteChange={setNote}
                                    onSave={handleSave}
                                    onCancel={() => {
                                        setStartSec(null);
                                        setEndSec(null);
                                        setCaptureState('idle');
                                        setError('');
                                        setNote('');
                                        handleCreatorModeChange(false);
                                    }}
                                    onPreview={() => {
                                        if (startSec === null || endSec === null) return;
                                        const mockMoment = {
                                            id: 'preview-draft',
                                            startSec,
                                            endSec,
                                            service: isYouTube ? 'youtube' : 'spotify',
                                            userId: user ? user.id : 'me',
                                            note: note,
                                            createdAt: new Date().toISOString()
                                        };
                                        playMoment(mockMoment as any);
                                    }}
                                    isPreviewing={activeMoment?.id === 'preview-draft'}
                                    formatTime={(seconds) => {
                                        const h = Math.floor(seconds / 3600);
                                        const m = Math.floor((seconds % 3600) / 60);
                                        const s = Math.floor(seconds % 60);
                                        return h > 0
                                            ? `${h}h ${m}m ${s}s`
                                            : `${m}:${s.toString().padStart(2, '0')}`;
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="glass-panel p-3 h-fit space-y-3 sticky top-4">
                                <h3 className="text-sm font-semibold flex items-center gap-2">
                                    <Clock size={16} className="text-purple-400" />
                                    Moment Details
                                </h3>
                                <p className="text-xs text-white/50">
                                    Capture controls and details will appear here when you create a moment.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </section>


            {/* Grouping Confirmation Modal */}
            <GroupingPromptModal
                isOpen={!!groupingConfirmation}
                parentMoment={groupingConfirmation?.conflictMoment!}
                draftStart={startSec || 0}
                draftEnd={endSec || 0}
                onConfirm={() => {
                    if (groupingConfirmation) {
                        executeSmartGroup(groupingConfirmation.conflictMoment, groupingConfirmation.payload);
                        setGroupingConfirmation(null);
                    }
                }}
                onCancel={() => {
                    if (groupingConfirmation) {
                        executeCreateMoment(groupingConfirmation.payload, null);
                        setGroupingConfirmation(null);
                    }
                }}
            />
            {/* Duration Limit Modal */}
            {durationLimitError && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setDurationLimitError(false)}>
                    <div className="bg-zinc-900 border border-orange-500/30 rounded-2xl p-8 max-w-sm w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="text-center space-y-2">
                            <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-4">
                                <Clock size={24} className="text-orange-500" />
                            </div>
                            <h2 className="text-xl font-bold text-white">Moment Too Long! 🛑</h2>
                            <p className="text-white/60">
                                Moments cannot be longer than 3 min.
                            </p>
                        </div>
                        <button
                            onClick={() => setDurationLimitError(false)}
                            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-orange-500/20"
                        >
                            Got it
                        </button>
                    </div>
                </div>
            )}
        </main >
    );
}
