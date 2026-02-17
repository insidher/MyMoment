'use server';

import { createClient } from '@/lib/supabase/server';
import { checkIsAdmin } from '../admin/feedback/actions';
import { mapYouTubeCategory } from '@/lib/youtube';

// Internal IDs: music=1, podcast=2, comedy=3, educational=4, gaming=5, sports=6, news=7, technology=8, entertainment=9

interface SyncPayload {
    videoUrl: string;
    categoryId: string | null;
    overrideCategoryId: number | null;
    tags: string[];
    topics: string[];
    description: string;
    title: string;
    channelTitle: string;
    durationSec: number;
    thumbnailUrl: string | null;
}

/**
 * Sync fresh YouTube API data into the track_sources table.
 * Admin-only. UPDATE ONLY — never creates new rows.
 * NON-DESTRUCTIVE: only updates fields that have real values.
 * Matches by source_url. Errors if row not found.
 */
export async function syncTrackSource(payload: SyncPayload): Promise<{ success: boolean; error?: string }> {
    // Auth check
    const adminCheck = await checkIsAdmin();
    if (!adminCheck.isAdmin) {
        return { success: false, error: 'Unauthorized: Admin access required' };
    }

    // Build the canonical source URL to match against (verify videoId first)
    const videoId = extractVideoId(payload.videoUrl);
    if (!videoId) {
        return { success: false, error: 'Could not extract video ID from URL' };
    }
    const sourceUrl = `https://www.youtube.com/watch?v=${videoId}`;

    const supabase = await createClient();

    // --- Build dynamic update object: only include non-null, non-empty fields ---
    const updates: Record<string, unknown> = {};

    // Always stamp the sync time
    updates.metadata_updated_at = new Date().toISOString();

    // Scalar fields — only set if truthy
    if (payload.title) updates.title = payload.title;
    if (payload.channelTitle) { updates.artist = payload.channelTitle; updates.channel_title = payload.channelTitle; }
    if (payload.description) updates.description = payload.description;
    if (payload.thumbnailUrl) updates.artwork = payload.thumbnailUrl;
    if (payload.durationSec) updates.duration_sec = payload.durationSec;

    // Category — ALWAYS save raw YT ID to youtube_category_id, mapped internal ID (1-9) to category_id
    // Priority: manual override > smart mapping via mapYouTubeCategory
    if (payload.overrideCategoryId) {
        // Admin explicitly chose a category via dropdown → already an internal ID (1-9)
        updates.category_id = String(payload.overrideCategoryId);
    } else {
        // Smart mapping: Topics → Keywords → YouTube categoryId fallback
        const cleanTopics = payload.topics.map((url: string) => url.split('/').pop() || url);
        const internalId = mapYouTubeCategory({
            youtubeCategoryId: payload.categoryId,
            topics: cleanTopics,
            title: payload.title || '',
            tags: payload.tags || [],
        });
        updates.category_id = String(internalId);
    }
    // Always preserve the raw YouTube category ID
    if (payload.categoryId) updates.youtube_category_id = payload.categoryId;

    // Array fields — only set if the array has items
    if (payload.tags && payload.tags.length > 0) updates.tags = payload.tags;
    if (payload.topics && payload.topics.length > 0) {
        updates.topics = payload.topics.map((url: string) => url.split('/').pop() || url);
    }

    // --- UPDATE ONLY — no upsert, no insert ---
    // Lookup by video ID (more robust than URL matching)
    const { data: existing } = await supabase
        .from('track_sources')
        .select('id')
        .eq('youtube_video_id', videoId)
        .maybeSingle();

    if (!existing) {
        return { success: false, error: 'Track source not found in database (by ID). Cannot sync.' };
    }

    const { error } = await supabase
        .from('track_sources')
        .update({
            ...updates,
            // Ensure URL is normalized to canonical format
            source_url: sourceUrl
        })
        .eq('id', existing.id);

    if (error) {
        console.error('syncTrackSource error:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

function extractVideoId(url: string): string | null {
    if (!url) return null;
    // Direct video ID (11 chars)
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
    try {
        const parsed = new URL(url);
        if (parsed.hostname.includes('youtu.be')) {
            return parsed.pathname.slice(1).split('/')[0] || null;
        }
        return parsed.searchParams.get('v') || null;
    } catch {
        return null;
    }
}
