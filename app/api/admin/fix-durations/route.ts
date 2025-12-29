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

async function fetchYouTubeDuration(videoId: string): Promise<number> {
    const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

    if (!YOUTUBE_API_KEY) {
        console.error('YouTube API key not found');
        return 0;
    }

    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`
        );
        const data = await response.json();

        if (data.items && data.items.length > 0) {
            const duration = data.items[0].contentDetails.duration;
            return parseDuration(duration);
        }
    } catch (error) {
        console.error(`Failed to fetch duration for ${videoId}:`, error);
    }

    return 0;
}

export async function GET() {
    try {
        const supabase = await createClient();

        // Find all track sources with duration_sec = 0 or null (YouTube only)
        // First, let's log what we have
        const { data: allTracks, error: allError } = await supabase
            .from('track_sources')
            .select('id, service, source_url, title, duration_sec')
            .eq('service', 'youtube')
            .limit(10);

        console.log('[FIX-DURATIONS] Sample YouTube tracks in DB:', allTracks?.map(t => ({
            title: t.title,
            duration: t.duration_sec
        })));

        const { data: brokenTracks, error } = await supabase
            .from('track_sources')
            .select('id, service, source_url, title, duration_sec')
            .eq('service', 'youtube')
            .or('duration_sec.is.null,duration_sec.eq.0')
            .limit(50);

        console.log('[FIX-DURATIONS] Broken tracks found:', brokenTracks?.length);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!brokenTracks || brokenTracks.length === 0) {
            return NextResponse.json({
                message: 'No broken tracks found',
                fixed: 0,
                failed: 0,
                total: 0
            });
        }

        const results = [];
        let fixed = 0;
        let failed = 0;

        for (const track of brokenTracks) {
            const videoId = getYouTubeId(track.source_url);

            if (!videoId) {
                results.push({
                    title: track.title,
                    status: 'skipped',
                    reason: 'invalid URL'
                });
                failed++;
                continue;
            }

            const duration = await fetchYouTubeDuration(videoId);

            if (duration > 0) {
                const { error: updateError } = await supabase
                    .from('track_sources')
                    .update({ duration_sec: duration })
                    .eq('id', track.id);

                if (updateError) {
                    results.push({
                        title: track.title,
                        status: 'failed',
                        reason: updateError.message
                    });
                    failed++;
                } else {
                    results.push({
                        title: track.title,
                        status: 'fixed',
                        duration: duration
                    });
                    fixed++;
                }
            } else {
                results.push({
                    title: track.title,
                    status: 'failed',
                    reason: 'could not fetch duration'
                });
                failed++;
            }

            // Rate limit: wait 100ms between requests
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return NextResponse.json({
            message: 'Duration fix completed',
            fixed,
            failed,
            total: brokenTracks.length,
            results
        });

    } catch (error) {
        console.error('Failed to fix durations:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
