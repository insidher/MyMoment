import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            console.warn('[API] Unauthorized attempt to save moment');
            return NextResponse.json(
                { error: 'You must be logged in to save moments' },
                { status: 401 }
            );
        }

        const body = await request.json();
        console.log('[API] POST /api/moments - Payload:', JSON.stringify(body, null, 2));

        // ========================================
        // COMPREHENSIVE INPUT VALIDATION
        // ========================================

        // 1. Required fields check
        if (!body.sourceUrl || body.startSec == null || body.endSec == null) {
            return NextResponse.json(
                { error: 'Missing required fields: sourceUrl, startSec, and endSec are required' },
                { status: 400 }
            );
        }

        // 2. URL validation
        if (typeof body.sourceUrl !== 'string' || body.sourceUrl.trim().length === 0) {
            return NextResponse.json(
                { error: 'Invalid sourceUrl: must be a non-empty string' },
                { status: 400 }
            );
        }

        // Basic URL format check (must contain http/https and a domain)
        const urlPattern = /^https?:\/\/.+\..+/;
        if (!urlPattern.test(body.sourceUrl)) {
            return NextResponse.json(
                { error: 'Invalid sourceUrl: must be a valid HTTP/HTTPS URL' },
                { status: 400 }
            );
        }

        // URL length check (prevent extremely long URLs)
        if (body.sourceUrl.length > 2048) {
            return NextResponse.json(
                { error: 'Invalid sourceUrl: URL too long (max 2048 characters)' },
                { status: 400 }
            );
        }

        // 3. Numeric validation for timestamps
        if (typeof body.startSec !== 'number' || typeof body.endSec !== 'number') {
            return NextResponse.json(
                { error: 'Invalid timestamps: startSec and endSec must be numbers' },
                { status: 400 }
            );
        }

        // Check for NaN or Infinity
        if (!Number.isFinite(body.startSec) || !Number.isFinite(body.endSec)) {
            return NextResponse.json(
                { error: 'Invalid timestamps: must be finite numbers' },
                { status: 400 }
            );
        }

        // Timestamps must be non-negative
        if (body.startSec < 0 || body.endSec < 0) {
            return NextResponse.json(
                { error: 'Invalid timestamps: cannot be negative' },
                { status: 400 }
            );
        }

        // 4. Duration validation
        const duration = body.endSec - body.startSec;

        if (duration <= 0) {
            return NextResponse.json(
                { error: 'Invalid duration: end time must be after start time' },
                { status: 400 }
            );
        }

        // Maximum moment duration: 10 minutes (600 seconds)
        const MAX_MOMENT_DURATION = 600;
        if (duration > MAX_MOMENT_DURATION) {
            return NextResponse.json(
                { error: `Invalid duration: moment cannot exceed ${MAX_MOMENT_DURATION} seconds (10 minutes)` },
                { status: 400 }
            );
        }

        // Minimum moment duration: 1 second
        if (duration < 1) {
            return NextResponse.json(
                { error: 'Invalid duration: moment must be at least 1 second' },
                { status: 400 }
            );
        }

        // 5. Note validation
        if (body.note !== undefined && body.note !== null) {
            if (typeof body.note !== 'string') {
                return NextResponse.json(
                    { error: 'Invalid note: must be a string' },
                    { status: 400 }
                );
            }

            const MAX_NOTE_LENGTH = 500;
            if (body.note.length > MAX_NOTE_LENGTH) {
                return NextResponse.json(
                    { error: `Invalid note: cannot exceed ${MAX_NOTE_LENGTH} characters` },
                    { status: 400 }
                );
            }
        }

        // 6. Optional fields validation
        if (body.title !== undefined && typeof body.title !== 'string') {
            return NextResponse.json(
                { error: 'Invalid title: must be a string' },
                { status: 400 }
            );
        }

        if (body.artist !== undefined && typeof body.artist !== 'string') {
            return NextResponse.json(
                { error: 'Invalid artist: must be a string' },
                { status: 400 }
            );
        }

        if (body.duration !== undefined && (typeof body.duration !== 'number' || !Number.isFinite(body.duration) || body.duration < 0)) {
            return NextResponse.json(
                { error: 'Invalid duration: must be a non-negative number' },
                { status: 400 }
            );
        }

        // Detect service
        const service = body.service || detectService(body.sourceUrl);

        // Step 1: Find or Create track_source (ALWAYS, regardless of duration)
        let trackSourceId: string | null = null;

        // Check if track_source already exists for this URL
        const { data: existingTrackSource } = await supabase
            .from('track_sources')
            .select('id')
            .eq('source_url', body.sourceUrl)
            .single();

        if (existingTrackSource) {
            // Use existing track_source
            trackSourceId = existingTrackSource.id;
            console.log('[API] Using existing track_source:', trackSourceId);

            // Auto-Heal: If new duration provided > 0, update existing record (blindly update to ensure latest duration)
            if (duration > 0) {
                await supabase
                    .from('track_sources')
                    .update({ duration_sec: duration })
                    .eq('id', trackSourceId);
            }
        } else {
            // Create new track_source (even if duration is 0 or missing)
            const { data: newTrackSource, error: trackSourceError } = await supabase
                .from('track_sources')
                .insert({
                    service: service,
                    source_url: body.sourceUrl,
                    title: body.title || 'Unknown Title',
                    artist: body.artist || 'Unknown Artist',
                    artwork: body.artwork || null,
                    duration_sec: body.duration || 0, // Default to 0 if missing
                })
                .select('id')
                .single();

            if (trackSourceError) {
                console.error('[API] Failed to create track_source:', trackSourceError);
                // Continue without track_source rather than failing
            } else {
                trackSourceId = newTrackSource.id;
                console.log('[API] Created new track_source:', trackSourceId);
            }
        }

        // Step 1.5: Fuzzy Threading & Heirarchy Flattening
        let parentId: string | null = null;
        let proposedParentId = body.parentId || null;

        if (!proposedParentId && trackSourceId) {
            // No parent specified, proceed with Fuzzy Search
            /* DISABLED: Fuzzy Threading - Capture should always create a new Root Moment
            const FUZZY_THRESHOLD = 3;

            // Search for ANY overlapping moment (Partner or Child)
            const { data: fuzzyMatch } = await supabase
                .from('moments')
                .select('id')
                .eq('track_source_id', trackSourceId)
                .gte('end_time', body.startSec - FUZZY_THRESHOLD)
                .lte('start_time', body.endSec + FUZZY_THRESHOLD)
                .order('created_at', { ascending: true }) // Find oldest overlap
                .limit(1)
                .single();

            if (fuzzyMatch) {
                proposedParentId = fuzzyMatch.id;
                console.log('[API] Fuzzy match found:', proposedParentId);
            }
            */
        }

        // Recursive Parent Check (Flattening)
        if (proposedParentId) {
            // Fetch the proposed parent to see if it is already a child
            const { data: targetMoment } = await supabase
                .from('moments')
                .select('id, parent_id')
                .eq('id', proposedParentId)
                .single();

            if (targetMoment) {
                // If target has a parent, link to THAT parent (Root).
                // If target IS a parent (parent_id null), link to target.
                parentId = targetMoment.parent_id || targetMoment.id;
                console.log(`[API] Resolved Parent: ${proposedParentId} -> ${parentId} (Flattened)`);
            }
        }

        // Step 2: Prepare moment data for Supabase (snake_case columns)
        const momentData = {
            user_id: user.id,
            resource_id: body.sourceUrl,
            platform: service,
            track_source_id: trackSourceId, // Link to track_source
            parent_id: parentId, // Set the determined parent (Manual or Fuzzy)
            group_id: body.groupId || null, // Peer-to-Peer Grouping
            start_time: body.startSec,
            end_time: body.endSec,
            track_duration_sec: body.duration || 0, // Store track duration directly
            note: body.note || null,
            title: body.title || 'Unknown Title',
            artist: body.artist || 'Unknown Artist',
            artwork: body.artwork || null,
            saved_by_count: 1,
            moment_duration_sec: body.endSec - body.startSec,
        };

        console.log('[API] Creating moment with data:', JSON.stringify(momentData, null, 2));

        // Step 3: Insert moment into Supabase
        const { data: newMoment, error } = await supabase
            .from('moments')
            .insert(momentData)
            .select(`
                *,
                profiles!user_id (
                    name,
                    image
                ),
                track_sources!track_source_id (
                    title,
                    artist,
                    artwork,
                    duration_sec
                )
            `)
            .single();

        if (error) {
            console.error('[API] Supabase Insert Error:', error);
            return NextResponse.json(
                { error: 'Database error: ' + error.message },
                { status: 500 }
            );
        }

        console.log('[API] Moment saved successfully:', newMoment.id);

        // Transform to match expected client format
        const transformedMoment = {
            id: newMoment.id,
            groupId: (newMoment as any).group_id,
            service: newMoment.platform,
            sourceUrl: newMoment.resource_id,
            startSec: newMoment.start_time,
            endSec: newMoment.end_time,
            trackDurationSec: newMoment.track_sources?.duration_sec || 0,
            note: newMoment.note,
            title: newMoment.track_sources?.title || newMoment.title || 'Unknown Title',
            artist: newMoment.track_sources?.artist || newMoment.artist || 'Unknown Artist',
            artwork: newMoment.track_sources?.artwork || newMoment.artwork || null,
            likeCount: newMoment.like_count || 0,
            savedByCount: newMoment.saved_by_count || 1,
            createdAt: newMoment.created_at,
            updatedAt: newMoment.updated_at,
            user: {
                name: newMoment.profiles?.name || 'Music Lover',
                image: newMoment.profiles?.image || null,
            },
            trackSource: newMoment.track_sources ? {
                id: newMoment.track_source_id,
                service: newMoment.platform as any,
                sourceUrl: newMoment.resource_id,
                title: newMoment.track_sources.title,
                artist: newMoment.track_sources.artist,
                artwork: newMoment.track_sources.artwork,
                durationSec: newMoment.track_sources.duration_sec,
            } : undefined,
        };

        return NextResponse.json({ success: true, moment: transformedMoment });
    } catch (error) {
        console.error('[API] POST /api/moments Error:', error);
        return NextResponse.json(
            { error: 'Failed to save moment' },
            { status: 500 }
        );
    }
}

function detectService(url: string): string {
    if (url.includes('youtube')) return 'youtube';
    if (url.includes('spotify')) return 'spotify';
    if (url.includes('apple')) return 'apple-music';
    return 'unknown';
}

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { searchParams } = new URL(request.url);
        const sourceUrl = searchParams.get('sourceUrl');
        const userId = searchParams.get('userId');

        console.log(`[API] GET /api/moments - sourceUrl: ${sourceUrl}, userId: ${userId}`);

        // Build query
        let query = supabase
            .from('moments')
            .select(`
                *,
                profiles!user_id (
                    name,
                    image
                ),
                track_sources!track_source_id (
                    title,
                    artist,
                    artwork,
                    duration_sec
                ),
                replies: moments!parent_id(count)
            `)
            .is('parent_id', null) // Stacked Feed: Only Top-Level
            .order('created_at', { ascending: false });

        // Apply filters
        if (sourceUrl) {
            query = query.eq('resource_id', sourceUrl);
        }

        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data: moments, error } = await query;

        if (error) {
            console.error('[API] Supabase Query Error:', error);
            return NextResponse.json(
                { error: 'Failed to fetch moments' },
                { status: 500 }
            );
        }

        // Transform to match expected client format
        let transformedMoments = moments.map(m => ({
            id: m.id,
            groupId: (m as any).group_id,
            userId: m.user_id,
            service: m.platform,
            sourceUrl: m.resource_id,
            startSec: m.start_time,
            endSec: m.end_time,
            momentDurationSec: m.end_time - m.start_time,
            note: m.note,
            title: m.track_sources?.title || m.title || 'Unknown Title',
            artist: m.track_sources?.artist || m.artist || 'Unknown Artist',
            artwork: m.track_sources?.artwork || m.artwork || null,
            likeCount: m.like_count || 0,
            replyCount: (m.replies as any)?.[0]?.count || 0,
            savedByCount: m.saved_by_count || 1,
            createdAt: m.created_at,
            updatedAt: m.updated_at,
            user: {
                name: m.profiles?.name || 'User',
                image: m.profiles?.image || null,
            },
            trackSource: m.track_sources ? {
                id: m.track_source_id,
                service: m.platform as any,
                sourceUrl: m.resource_id,
                title: m.track_sources.title,
                artist: m.track_sources.artist,
                artwork: m.track_sources.artwork,
                durationSec: m.track_sources.duration_sec,
            } : undefined,
        }));

        // Check for likes if user is logged in
        const { data: { user } } = await supabase.auth.getUser();

        if (user && moments.length > 0) {
            const momentIds = moments.map(m => m.id);

            const { data: likes } = await supabase
                .from('likes')
                .select('moment_id')
                .eq('user_id', user.id)
                .in('moment_id', momentIds);

            const likedSet = new Set(likes?.map(l => l.moment_id) || []);

            transformedMoments = transformedMoments.map(m => ({
                ...m,
                isLiked: likedSet.has(m.id),
            }));
        }

        console.log(`[API] Found ${moments.length} moments`);
        return NextResponse.json({ moments: transformedMoments });
    } catch (error) {
        console.error('[API] GET /api/moments Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch moments' },
            { status: 500 }
        );
    }
}
