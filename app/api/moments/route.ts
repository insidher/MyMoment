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

        // Validation
        if (!body.sourceUrl || body.startSec == null || body.endSec == null) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Duration validation
        const duration = body.endSec - body.startSec;
        if (duration <= 0) {
            return NextResponse.json(
                { error: 'End time must be after start time' },
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

        // Step 2: Prepare moment data for Supabase (snake_case columns)
        const momentData = {
            user_id: user.id,
            resource_id: body.sourceUrl,
            platform: service,
            track_source_id: trackSourceId, // Link to track_source
            start_time: body.startSec,
            end_time: body.endSec,
            note: body.note || null,
            title: body.title || 'Unknown Title',
            artist: body.artist || 'Unknown Artist',
            artwork: body.artwork || null,
            saved_by_count: 1,
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
            service: newMoment.platform,
            sourceUrl: newMoment.resource_id,
            startSec: newMoment.start_time,
            endSec: newMoment.end_time,
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
                )
            `)
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
