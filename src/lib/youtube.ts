import { RelatedItem } from './related';

interface YouTubeSearchResult {
    kind: string;
    etag: string;
    id: {
        kind: string;
        videoId: string;
    };
    snippet: {
        publishedAt: string;
        channelId: string;
        title: string;
        description: string;
        thumbnails: {
            default: { url: string; width: number; height: number };
            medium: { url: string; width: number; height: number };
            high: { url: string; width: number; height: number };
        };
        channelTitle: string;
    };
}

interface YouTubeSearchResponse {
    kind: string;
    etag: string;
    items: YouTubeSearchResult[];
}

interface YouTubeVideoDetails {
    items: {
        snippet: {
            title: string;
            channelTitle: string;
        };
    }[];
}

/**
 * Parse ISO 8601 duration (PT#M#S) to seconds
 */
function parseISODuration(duration: string): number {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 0;

    const hours = (parseInt(match[1] || '0') || 0);
    const minutes = (parseInt(match[2] || '0') || 0);
    const seconds = (parseInt(match[3] || '0') || 0);

    return hours * 3600 + minutes * 60 + seconds;
}

export interface YouTubeMetadata {
    title: string;
    channelTitle: string;
    thumbnails: {
        default?: string;
        medium?: string;
        high?: string;
        maxres?: string;
    };
    durationSec: number;
}

/**
 * Fetch video details including duration
 */
export async function getYouTubeVideoMetadata(videoId: string): Promise<YouTubeMetadata | null> {
    const apiKey = process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
    if (!apiKey) {
        console.warn('YouTube API key not configured');
        return null;
    }

    try {
        const url = new URL('https://www.googleapis.com/youtube/v3/videos');
        url.searchParams.set('part', 'snippet,contentDetails');
        url.searchParams.set('id', videoId);
        url.searchParams.set('key', apiKey);

        const res = await fetch(url.toString());
        if (!res.ok) return null;

        const data = await res.json();
        if (!data.items || data.items.length === 0) return null;

        const item = data.items[0];
        const snippet = item.snippet;
        const contentDetails = item.contentDetails;

        return {
            title: snippet.title,
            channelTitle: snippet.channelTitle,
            thumbnails: {
                default: snippet.thumbnails?.default?.url,
                medium: snippet.thumbnails?.medium?.url,
                high: snippet.thumbnails?.high?.url,
                maxres: snippet.thumbnails?.maxres?.url,
            },
            durationSec: parseISODuration(contentDetails.duration),
        };
    } catch (e) {
        console.error('Failed to get video details:', e);
        return null;
    }
}

/**
 * Fetch video details to get title/channel for search fallback
 * @deprecated Use getYouTubeVideoMetadata instead
 */
async function getVideoDetails(videoId: string, apiKey: string): Promise<{ title: string; channel: string } | null> {
    const metadata = await getYouTubeVideoMetadata(videoId);
    if (!metadata) return null;
    return {
        title: metadata.title,
        channel: metadata.channelTitle
    };
}

/**
 * Search YouTube for query
 */
async function searchYouTube(query: string, apiKey: string): Promise<RelatedItem[]> {
    try {
        const url = new URL('https://www.googleapis.com/youtube/v3/search');
        url.searchParams.set('part', 'snippet');
        url.searchParams.set('q', query);
        url.searchParams.set('type', 'video');
        url.searchParams.set('maxResults', '8');
        url.searchParams.set('key', apiKey);

        console.log('[YouTube API] Fallback Search:', query);

        const res = await fetch(url.toString());
        if (!res.ok) {
            const text = await res.text();
            console.error('[YouTube API] Search failed:', res.status, text);
            return [];
        }

        const data: YouTubeSearchResponse = await res.json();
        return (data.items || []).map((item): RelatedItem => ({
            id: item.id.videoId,
            service: 'youtube',
            title: item.snippet.title,
            artist: item.snippet.channelTitle,
            artwork: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
            sourceUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        }));
    } catch (e) {
        console.error('Failed to search YouTube:', e);
        return [];
    }
}

/**
 * Fetch related videos from YouTube Data API v3
 * Falls back to search if relatedToVideoId returns empty
 */
export async function getYouTubeRelatedVideos(videoId: string): Promise<RelatedItem[]> {
    const apiKey = process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

    console.log('[YouTube API] Called with videoId:', videoId);
    console.log('[YouTube API] API key exists:', !!apiKey);

    if (!apiKey) {
        console.warn('YouTube API key not configured');
        return [];
    }

    try {
        // Get video details first for search-based approach
        // Note: relatedToVideoId parameter is deprecated by YouTube API
        console.log('[YouTube API] Getting video details for search...');

        const details = await getVideoDetails(videoId, apiKey);
        if (!details) {
            console.warn('[YouTube API] Could not get video details');
            return [];
        }

        // Search for similar content using title and channel
        const query = `${details.channel} ${details.title}`;
        console.log('[YouTube API] Searching for related videos:', query);
        return searchYouTube(query, apiKey);

    } catch (error) {
        console.error('Failed to fetch YouTube related videos:', error);
        return [];
    }
}
