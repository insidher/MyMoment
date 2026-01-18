import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Parse ISO 8601 duration (PT1M13S)
const parseDuration = (duration: string): number => {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 0;
    const hours = (parseInt(match[1]) || 0);
    const minutes = (parseInt(match[2]) || 0);
    const seconds = (parseInt(match[3]) || 0);
    return hours * 3600 + minutes * 60 + seconds;
};

// Extract YouTube ID
const getYouTubeId = (url: string): string | null => {
    if (url.includes('v=')) return url.split('v=')[1]?.split('&')[0];
    if (url.includes('youtu.be/')) return url.split('youtu.be/')[1]?.split('?')[0];
    return null;
};

async function fetchYouTubeMetadata(videoId: string): Promise<any> {
    const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

    if (!YOUTUBE_API_KEY) {
        console.error('YouTube API key not found');
        return null;
    }

    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`
        );
        const data = await response.json();

        if (data.items && data.items.length > 0) {
            const snippet = data.items[0].snippet;
            const contentDetails = data.items[0].contentDetails;
            const duration = parseDuration(contentDetails.duration);

            return {
                title: snippet.title,
                artist: snippet.channelTitle,
                artwork: snippet.thumbnails.maxres?.url || snippet.thumbnails.high?.url || '',
                duration
            };
        }
    } catch (error) {
        console.error(`Failed to fetch metadata for ${videoId}:`, error);
    }

    return null;
}

export async function GET() {
    try {
        const supabase = await createClient();

        // Get orphaned moments
        const { data: orphanedMoments, error } = await supabase
            .from('moments')
            .select('id, platform, resource_id, title, artist, artwork')
            .is('track_source_id', null)
            .eq('platform', 'youtube')
            .limit(25);

        if (error || !orphanedMoments || orphanedMoments.length === 0) {
            return NextResponse.json({
                message: 'No orphaned moments found',
                fixed: 0
            });
        }

        console.log(`[FIX-ORPHANS] Found ${orphanedMoments.length} orphaned moments`);

        let fixed = 0;
        let failed = 0;
        const results = [];

        for (const moment of orphanedMoments) {
            const videoId = getYouTubeId(moment.resource_id!);

            if (!videoId) {
                results.push({
                    id: moment.id,
                    title: moment.title,
                    status: 'skipped',
                    reason: 'invalid URL'
                });
                failed++;
                continue;
            }

            console.log(`[FIX-ORPHANS] Processing: ${moment.title}`);

            // 1. Check if track_source already exists for this URL
            const { data: existingTrackSource } = await supabase
                .from('track_sources')
                .select('id')
                .eq('source_url', moment.resource_id!)
                .eq('service', 'youtube')
                .single();

            let trackSourceId = existingTrackSource?.id;

            // 2. If no track_source exists, create one
            if (!trackSourceId) {
                // videoId is guaranteed to be string here (passed null check above)
                const metadata = await fetchYouTubeMetadata(videoId!);

                if (!metadata) {
                    results.push({
                        id: moment.id,
                        title: moment.title,
                        status: 'failed',
                        reason: 'could not fetch metadata'
                    });
                    failed++;
                    continue;
                }

                // Create new track_source using exact pattern from /api/moments
                const { data: newTrackSource, error: createError } = await supabase
                    .from('track_sources')
                    .insert({
                        service: 'youtube',
                        source_url: moment.resource_id!,
                        title: metadata.title,
                        artist: metadata.artist,
                        artwork: metadata.artwork || null,
                        duration_sec: metadata.duration || 0,
                    })
                    .select('id')
                    .single();

                if (createError || !newTrackSource) {
                    results.push({
                        id: moment.id,
                        title: moment.title,
                        status: 'failed',
                        reason: `create track_source failed: ${createError?.message}`
                    });
                    failed++;
                    continue;
                }

                trackSourceId = newTrackSource.id;
                console.log(`[FIX-ORPHANS] Created track_source: ${trackSourceId}`);
            } else {
                console.log(`[FIX-ORPHANS] Found existing track_source: ${trackSourceId}`);
            }

            // 3. Link the moment to the track_source
            const { error: updateError } = await supabase
                .from('moments')
                .update({ track_source_id: trackSourceId })
                .eq('id', moment.id);

            if (updateError) {
                results.push({
                    id: moment.id,
                    title: moment.title,
                    status: 'failed',
                    reason: `link failed: ${updateError.message}`
                });
                failed++;
            } else {
                results.push({
                    id: moment.id,
                    title: moment.title,
                    status: 'fixed',
                    trackSourceId
                });
                fixed++;
            }

            // Rate limit
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return NextResponse.json({
            message: 'Orphan fix completed',
            fixed,
            failed,
            total: orphanedMoments.length,
            results
        });

    } catch (error) {
        console.error('[FIX-ORPHANS] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
