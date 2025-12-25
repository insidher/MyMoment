import { MusicService } from '@/types';
import { getYouTubeRelatedVideos } from './youtube';

export type RelatedItem = {
    id: string;             // e.g. YouTube videoId
    service: MusicService;  // 'youtube' | 'spotify' | 'apple-music' | 'unknown'
    title: string;
    artist?: string;
    artwork: string;
    sourceUrl: string;
    momentCount?: number;
};

/**
 * Extract YouTube video ID from various URL formats
 */
export function extractYouTubeId(sourceUrl: string): string | null {
    try {
        const url = new URL(sourceUrl);

        // Handle youtube.com/watch?v=VIDEO_ID
        if (url.hostname.includes('youtube.com') && url.searchParams.has('v')) {
            return url.searchParams.get('v');
        }

        // Handle youtu.be/VIDEO_ID
        if (url.hostname === 'youtu.be') {
            return url.pathname.slice(1).split('?')[0];
        }

        // Handle youtube.com/embed/VIDEO_ID
        if (url.pathname.startsWith('/embed/')) {
            return url.pathname.split('/')[2];
        }

        return null;
    } catch {
        return null;
    }
}

/**
 * Extract Spotify Track ID
 */
export function extractSpotifyId(sourceUrl: string): string | null {
    try {
        const url = new URL(sourceUrl);
        if (url.hostname.includes('spotify.com') && url.pathname.includes('/track/')) {
            // Handle /track/ID?si=...
            return url.pathname.split('/track/')[1].split('?')[0];
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Get Spotify Access Token (Client Credentials Flow)
 */
async function getSpotifyAccessToken(): Promise<string> {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        console.error('[Spotify] Missing credentials in environment variables');
        throw new Error('Missing Spotify credentials');
    }

    try {
        const res = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
            },
            body: 'grant_type=client_credentials'
        });

        if (!res.ok) {
            const text = await res.text();
            console.error(`[Spotify] Token fetch failed: ${res.status} ${text}`);
            throw new Error(`Spotify Token Error: ${res.status}`);
        }

        const data = await res.json();
        if (!data.access_token) {
            console.error('[Spotify] No access token in response:', data);
            throw new Error('Failed to retrieve Spotify access token');
        }

        return data.access_token;
    } catch (error: any) {
        console.error('[Spotify] Failed to get token:', error);
        throw error;
    }
}

/**
 * Get Track Details (to find Artist ID)
 */
async function getTrackDetails(trackId: string, token: string): Promise<{ artistId: string } | null> {
    try {
        const res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (data.artists && data.artists.length > 0) {
            return { artistId: data.artists[0].id };
        }
        return null;
    } catch (e) {
        console.error('[Spotify] Failed to get track details', e);
        return null;
    }
}

/**
 * Get Full Track Metadata
 */
export async function getSpotifyTrackMetadata(trackId: string): Promise<{ title: string; artist: string; artwork: string; duration_sec?: number } | null> {
    try {
        const token = await getSpotifyAccessToken();
        const res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) return null;

        const data = await res.json();
        return {
            title: data.name,
            artist: data.artists.map((a: any) => a.name).join(', '),
            artwork: data.album.images[0]?.url || '',
            duration_sec: Math.floor(data.duration_ms / 1000)
        };
    } catch (e) {
        console.error('[Spotify] Failed to get track metadata', e);
        return null;
    }
}

/**
 * Get Artist Top Tracks
 */
async function getArtistTopTracks(artistId: string, token: string): Promise<RelatedItem[]> {
    try {
        console.log(`[Spotify] Fetching top tracks for artist: ${artistId}`);
        const res = await fetch(`https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            console.warn('[Spotify] Failed to fetch top tracks', res.status);
            return [];
        }

        const data = await res.json();
        return (data.tracks || []).slice(0, 10).map((track: any) => ({
            id: track.id,
            service: 'spotify',
            title: track.name,
            artist: track.artists.map((a: any) => a.name).join(', '),
            artwork: track.album.images[0]?.url || '',
            sourceUrl: track.external_urls.spotify
        }));
    } catch (e) {
        console.error('[Spotify] Failed to get artist top tracks', e);
        return [];
    }
}

/**
 * Get Spotify Recommendations
 */
async function getSpotifyRecommendations(trackId: string): Promise<RelatedItem[]> {
    console.log(`[Spotify] Getting recommendations for track: ${trackId}`);

    // This will throw if it fails
    const token = await getSpotifyAccessToken();

    try {
        // 1. Try standard recommendations
        try {
            const res = await fetch(`https://api.spotify.com/v1/recommendations?seed_tracks=${trackId}&limit=10`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                const data = await res.json();
                if (data.tracks && data.tracks.length > 0) {
                    console.log(`[Spotify] Found ${data.tracks.length} recommendations`);
                    return data.tracks.map((track: any) => ({
                        id: track.id,
                        service: 'spotify',
                        title: track.name,
                        artist: track.artists.map((a: any) => a.name).join(', '),
                        artwork: track.album.images[0]?.url || '',
                        sourceUrl: track.external_urls.spotify
                    }));
                }
            } else {
                console.warn(`[Spotify] Recommendations endpoint failed (${res.status}). Trying fallback...`);
            }
        } catch (e) {
            console.warn('[Spotify] Recommendations fetch failed. Trying fallback...', e);
        }

        console.log('[Spotify] Trying fallback (Artist Top Tracks)...');

        // 2. Fallback: Artist Top Tracks
        const details = await getTrackDetails(trackId, token);
        if (!details) {
            console.warn('[Spotify] Could not get track details for fallback');
            return [];
        }

        return getArtistTopTracks(details.artistId, token);

    } catch (error: any) {
        console.error('[Spotify] Failed to fetch recommendations', error);
        throw error; // Re-throw to be caught by the API route
    }
}

/**
 * Main entry point for fetching related content
 */
export async function getRelatedContent(
    service: MusicService,
    sourceUrl: string
): Promise<RelatedItem[]> {
    if (service === 'youtube') {
        const videoId = extractYouTubeId(sourceUrl);
        if (!videoId) return [];
        return getYouTubeRelatedVideos(videoId);
    } else if (service === 'spotify') {
        const trackId = extractSpotifyId(sourceUrl);
        if (!trackId) return [];
        return getSpotifyRecommendations(trackId);
    }

    return [];
}
