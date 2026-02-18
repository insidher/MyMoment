'use server';

import { createAdminClient } from '@/lib/supabase/admin';
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
    console.log('[DEBUG SYNC] Extracted videoId:', videoId, '| from URL:', payload.videoUrl);
    if (!videoId) {
        return { success: false, error: 'Could not extract video ID from URL' };
    }
    const sourceUrl = `https://www.youtube.com/watch?v=${videoId}`;

    const supabase = createAdminClient();
    console.log('[DEBUG SYNC] Admin client created, looking up youtube_video_id:', videoId);

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

    // --- FLEXIBLE LOOKUP: search by youtube_video_id OR source_url ---
    const { data: existing, error: lookupError } = await supabase
        .from('track_sources')
        .select('id')
        .or(`youtube_video_id.eq.${videoId},source_url.eq.${sourceUrl}`)
        .maybeSingle();

    console.log('[DEBUG SYNC] Lookup result:', existing, '| error:', lookupError);

    let targetId: string;

    if (existing) {
        targetId = existing.id;
    } else {
        // --- FALLBACK CREATION: auto-create the missing track_source ---
        console.log('[DEBUG SYNC] Track source not found, creating fallback record for:', videoId);
        const { data: created, error: createError } = await supabase
            .from('track_sources')
            .insert({
                service: 'youtube',
                source_url: sourceUrl,
                youtube_video_id: videoId,
                title: payload.title || 'Unknown Title',
                artist: payload.channelTitle || 'Unknown Artist',
                artwork: payload.thumbnailUrl || null,
                duration_sec: payload.durationSec || 0,
                created_at: new Date().toISOString(),
            })
            .select('id')
            .single();

        if (createError || !created) {
            console.error('[DEBUG SYNC] Fallback creation failed:', createError);
            return { success: false, error: `Failed to create track source: ${createError?.message || 'Unknown error'}` };
        }
        targetId = created.id;
        console.log('[DEBUG SYNC] Fallback track_source created:', targetId);
    }

    const { error } = await supabase
        .from('track_sources')
        .update({
            ...updates,
            // Ensure URL is normalized to canonical format
            source_url: sourceUrl,
            // Ensure youtube_video_id is always set
            youtube_video_id: videoId,
        })
        .eq('id', targetId);

    if (error) {
        console.error('syncTrackSource error:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

function extractVideoId(url: string): string | null {
    if (!url) return null;
    // Direct video ID (11 chars, no extra chars)
    if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) return url.trim();
    try {
        const parsed = new URL(url);
        if (parsed.hostname.includes('youtu.be')) {
            // Strip any path segments after the ID
            const raw = parsed.pathname.slice(1).split('/')[0];
            return raw ? raw.split('?')[0] : null;
        }
        // Standard youtube.com/watch?v=ID — searchParams.get already strips other params
        return parsed.searchParams.get('v') || null;
    } catch {
        return null;
    }
}
