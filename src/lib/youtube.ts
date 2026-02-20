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
    description: string;
    thumbnails: {
        default?: string;
        medium?: string;
        high?: string;
        maxres?: string;
    };
    durationSec: number;
}

/**
 * Normalizes any valid YouTube URL variant into its canonical format.
 * Canonical format: https://www.youtube.com/watch?v=VIDEO_ID
 * Examples handled: youtu.be, youtube.com/shorts, youtube.com/v/
 */
export function normalizeYouTubeUrl(url: string): string {
    if (!url) return url;

    // Extract the 11-character video ID using the existing regex logic from lib/related.ts
    // For safety and standalone usage, we reproduce the core regex here.
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(regex);

    if (match && match[1]) {
        // Enforce the standard watch URL format
        return `https://www.youtube.com/watch?v=${match[1]}`;
    }

    // If we can't parse an ID, assume it might not be a YouTube URL or is heavily malformed.
    // Return original, validation catches bad URLs upstream.
    return url;
}

/**
 * Fetch video details including duration
 * Cache-First Logic: Checks track_sources before calling YouTube API
 */
/**
 * Smart category mapping: Topics → Keywords → YouTube categoryId fallback.
 * Internal IDs: music=1, podcast=2, comedy=3, educational=4, gaming=5, sports=6, news=7, technology=8, entertainment=9, debate=10, politics=11
 */
export function mapYouTubeCategory(input: {
    youtubeCategoryId: string | null;
    topics: string[];
    title: string;
    tags: string[];
}): number {
    const { youtubeCategoryId, topics, title, tags } = input;
    const topicsLower = topics.map(t => t.toLowerCase().replace(/_/g, ' '));
    const titleLower = title.toLowerCase();
    const tagsLower = tags.map(t => t.toLowerCase());

    // --- Priority 1: Check Topics (AI-assigned, most reliable) ---
    if (topicsLower.some(t => t.includes('music'))) return 1;  // Music
    if (topicsLower.some(t => t.includes('comedy') || t.includes('humor'))) return 3;  // Comedy
    if (topicsLower.some(t => t.includes('gaming'))) return 5;  // Gaming
    if (topicsLower.some(t => t.includes('sport'))) return 6;  // Sports
    if (topicsLower.some(t => t.includes('debate') || t.includes('argument') || t.includes('panel'))) return 10; // Debate
    if (topicsLower.some(t => t.includes('politics') || t.includes('government') || t.includes('election'))) return 11; // Politics

    // --- Priority 2: Check Keywords in title + tags ---
    if (titleLower.includes('official music video') || titleLower.includes('official audio'))
        return 1;  // Music
    if (tagsLower.some(t => ['funny', 'standup', 'stand up', 'prank', 'comedy', 'sketch'].includes(t)))
        return 3;  // Comedy
    if (tagsLower.some(t => ['debate', 'argument', 'panel', 'discussion'].includes(t)))
        return 10; // Debate
    if (tagsLower.some(t => ['politics', 'government', 'election', 'political', 'congress', 'senate'].includes(t)))
        return 11; // Politics

    // --- Priority 3: Fallback to YouTube categoryId (creator's choice) ---
    const YOUTUBE_CATEGORY_FALLBACK: Record<string, number> = {
        '10': 1,   // Music → music
        '17': 6,   // Sports → sports
        '20': 5,   // Gaming → gaming
        '23': 3,   // Comedy → comedy
        '24': 9,   // Entertainment → entertainment
        '25': 7,   // News & Politics → news (default; debate/politics keywords checked above)
        '27': 4,   // Education → educational
        '28': 8,   // Science & Technology → technology (FIXED: was 5/gaming)
    };

    if (youtubeCategoryId && YOUTUBE_CATEGORY_FALLBACK[youtubeCategoryId] !== undefined) {
        return YOUTUBE_CATEGORY_FALLBACK[youtubeCategoryId];
    }

    // Default
    return 9;  // Entertainment
}

export async function getYouTubeVideoMetadata(videoId: string): Promise<YouTubeMetadata | null> {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const supabase = createAdminClient();

    try {
        // 1. Check Cache
        const { data: cached } = await supabase
            .from('track_sources')
            .select('*')
            .eq('youtube_video_id', videoId)
            .single();

        if (cached && cached.title !== 'Unknown Title') {
            const lastUpdated = cached.metadata_updated_at ? new Date(cached.metadata_updated_at) : new Date(0);
            const now = new Date();
            const daysSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);

            if (daysSinceUpdate < 30) {
                console.log('🎯 Cache HIT (Fresh) for video:', videoId);
                return {
                    title: cached.title || 'Unknown Title',
                    channelTitle: cached.channel_title || '',
                    description: cached.description || '',
                    thumbnails: {
                        high: cached.artwork || undefined,
                    },
                    durationSec: cached.duration_sec || 0,
                };
            }
            console.log('♻️ Cache STALE (30+ days). Refreshing video:', videoId);
        } else {
            console.log('❄️ Thawing new video:', videoId);
        }

        // 2. Fetch from YouTube API
        const apiKey = process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
        if (!apiKey) {
            console.warn('YouTube API key not configured');
            return null;
        }

        const url = new URL('https://www.googleapis.com/youtube/v3/videos');
        url.searchParams.set('part', 'snippet,contentDetails,statistics,topicDetails');
        url.searchParams.set('id', videoId);
        url.searchParams.set('key', apiKey);

        const res = await fetch(url.toString());
        if (!res.ok) return null;

        const data = await res.json();
        if (!data.items || data.items.length === 0) return null;

        const item = data.items[0];
        const snippet = item.snippet;
        const contentDetails = item.contentDetails;
        const statistics = item.statistics;
        const topicDetails = item.topicDetails || {};

        // Clean topic URLs: "https://en.wikipedia.org/wiki/Pop_music" → "Pop_music"
        const cleanedTopics: string[] = (topicDetails.topicCategories || []).map(
            (url: string) => url.split('/').pop() || url
        );

        // Smart category mapping: Topics → Keywords → YouTube categoryId fallback
        const youtubeCategoryId = snippet.categoryId || null;
        const internalCategoryId = mapYouTubeCategory({
            youtubeCategoryId,
            topics: cleanedTopics,
            title: snippet.title || '',
            tags: snippet.tags || [],
        });

        const metadata: YouTubeMetadata = {
            title: snippet.title,
            channelTitle: snippet.channelTitle,
            description: snippet.description || '',
            thumbnails: {
                default: snippet.thumbnails?.default?.url,
                medium: snippet.thumbnails?.medium?.url,
                high: snippet.thumbnails?.high?.url,
                maxres: snippet.thumbnails?.maxres?.url,
            },
            durationSec: parseISODuration(contentDetails.duration),
        };

        // 3. Freeze (Update/Insert Cache)
        // NOTE: created_at intentionally omitted — column not in PostgREST schema cache (PGRST204).
        // The DB default (now()) handles it on INSERT; upsert will not overwrite it on conflict.
        const { error: upsertError } = await supabase.from('track_sources').upsert({
            youtube_video_id: videoId,
            source_url: `https://www.youtube.com/watch?v=${videoId}`,
            service: 'youtube',
            title: metadata.title,
            artist: metadata.channelTitle,
            channel_title: metadata.channelTitle,
            description: metadata.description,
            artwork: metadata.thumbnails.high || metadata.thumbnails.medium || metadata.thumbnails.default,
            duration_sec: metadata.durationSec,
            view_count: statistics.viewCount ? parseInt(statistics.viewCount) : null,
            // PRESERVE CATEGORY: Only use internalCategoryId if no existing category is set
            category_id: (cached && cached.category_id) ? cached.category_id : String(internalCategoryId),
            youtube_category_id: youtubeCategoryId,
            tags: snippet.tags || [],
            topics: cleanedTopics,
            metadata_updated_at: new Date().toISOString(),
        }, { onConflict: 'youtube_video_id' })
            .select('id');

        if (upsertError) {
            console.error('❌ Failed to cache metadata in track_sources:', {
                message: upsertError.message,
                details: upsertError.details,
                hint: upsertError.hint,
                code: upsertError.code
            });
        }

        return metadata;
    } catch (e: any) {
        console.error('Failed to get video details:', e);
        return null;
    }
}

/**
 * Fetch FULL debug data for a video — both parsed and raw YouTube API response.
 * Always calls YouTube API directly (bypasses cache) for debugging purposes.
 */
export async function getYouTubeVideoDebugData(videoId: string): Promise<{
    parsed: YouTubeMetadata;
    raw: Record<string, unknown>;
    diagnostics: {
        categoryId: string | null;
        categoryName: string | null;
        topicCategories: string[];
        tags: string[];
        hasMusicTopic: boolean;
    };
} | null> {
    try {
        const apiKey = process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
        if (!apiKey) {
            console.warn('YouTube API key not configured');
            return null;
        }

        const url = new URL('https://www.googleapis.com/youtube/v3/videos');
        url.searchParams.set('part', 'snippet,contentDetails,statistics,topicDetails');
        url.searchParams.set('id', videoId);
        url.searchParams.set('key', apiKey);

        const res = await fetch(url.toString());
        if (!res.ok) return null;

        const data = await res.json();
        if (!data.items || data.items.length === 0) return null;

        const item = data.items[0];
        const snippet = item.snippet;
        const contentDetails = item.contentDetails;
        const topicDetails = item.topicDetails || {};

        // YouTube category IDs → names (from YouTube Data API, not our internal map)
        const YOUTUBE_CATEGORIES: Record<string, string> = {
            '1': 'Film & Animation', '2': 'Autos & Vehicles', '10': 'Music',
            '15': 'Pets & Animals', '17': 'Sports', '18': 'Short Movies',
            '19': 'Travel & Events', '20': 'Gaming', '21': 'Videoblogging',
            '22': 'People & Blogs', '23': 'Comedy', '24': 'Entertainment',
            '25': 'News & Politics', '26': 'Howto & Style', '27': 'Education',
            '28': 'Science & Technology', '29': 'Nonprofits & Activism',
            '30': 'Movies', '31': 'Anime/Animation', '32': 'Action/Adventure',
            '33': 'Classics', '34': 'Comedy', '35': 'Documentary',
            '36': 'Drama', '37': 'Family', '38': 'Foreign',
            '39': 'Horror', '40': 'Sci-Fi/Fantasy', '41': 'Thriller',
            '42': 'Shorts', '43': 'Shows', '44': 'Trailers',
        };

        const categoryId = snippet.categoryId || null;
        const topicCategories: string[] = topicDetails.topicCategories || [];
        const hasMusicTopic = topicCategories.some((t: string) =>
            t.toLowerCase().includes('music') || t.includes('/Music')
        );

        const parsed: YouTubeMetadata = {
            title: snippet.title,
            channelTitle: snippet.channelTitle,
            description: snippet.description || '',
            thumbnails: {
                default: snippet.thumbnails?.default?.url,
                medium: snippet.thumbnails?.medium?.url,
                high: snippet.thumbnails?.high?.url,
                maxres: snippet.thumbnails?.maxres?.url,
            },
            durationSec: parseISODuration(contentDetails.duration),
        };

        return {
            parsed,
            raw: item,
            diagnostics: {
                categoryId,
                categoryName: categoryId ? (YOUTUBE_CATEGORIES[categoryId] || `Unknown (${categoryId})`) : null,
                topicCategories,
                tags: snippet.tags || [],
                hasMusicTopic,
            },
        };
    } catch (e: any) {
        console.error('Failed to get debug data:', e);
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
