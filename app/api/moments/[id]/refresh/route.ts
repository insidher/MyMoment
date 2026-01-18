import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { getYouTubeVideoMetadata } from '@/lib/youtube';
import { fetchSpotifyMetadata } from '@/lib/metadata';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Await params to get the id
        const { id: momentId } = await params;
        const moment = await prisma.moment.findUnique({
            where: { id: momentId },
            include: { trackSource: true },
        });

        if (!moment) {
            return NextResponse.json({ error: 'Moment not found' }, { status: 404 });
        }

        // Only allow owner to refresh? Or anyone?
        // Let's allow owner for now, or maybe anyone since it's just metadata.
        // User asked for "Refresh Source" button, implies user action.

        if (!moment.trackSource) {
            // Should not happen with new moments, but legacy might
            return NextResponse.json({ error: 'No TrackSource linked' }, { status: 400 });
        }

        const { service, sourceUrl } = moment.trackSource;
        let updatedMetadata: any = {};

        if (service === 'youtube') {
            let videoId = '';
            try {
                const urlObj = new URL(sourceUrl);
                if (urlObj.hostname.includes('youtube.com')) {
                    videoId = urlObj.searchParams.get('v') || '';
                } else if (urlObj.hostname.includes('youtu.be')) {
                    videoId = urlObj.pathname.slice(1);
                }
            } catch (e) {
                console.warn('Invalid YouTube URL:', sourceUrl);
            }

            if (videoId) {
                const ytMeta = await getYouTubeVideoMetadata(videoId);
                if (ytMeta) {
                    updatedMetadata = {
                        title: ytMeta.title,
                        artist: ytMeta.channelTitle,
                        artwork: ytMeta.thumbnails.maxres || ytMeta.thumbnails.high || ytMeta.thumbnails.medium,
                        durationSec: ytMeta.durationSec,
                    };
                }
            }
        }
        if (service === 'spotify') {
            const meta = await fetchSpotifyMetadata(sourceUrl);
            if (meta) {
                updatedMetadata = {
                    title: meta.title,
                    artist: meta.artist,
                    artwork: meta.artwork,
                };
            }
        }

        if (Object.keys(updatedMetadata).length > 0) {
            // Update TrackSource
            const updatedTrackSource = await prisma.trackSource.update({
                where: { id: moment.trackSource.id },
                data: updatedMetadata,
            });

            // Update Moment (sync fields)
            const updatedMoment = await prisma.moment.update({
                where: { id: momentId },
                data: {
                    title: updatedMetadata.title,
                    artist: updatedMetadata.artist,
                    artwork: updatedMetadata.artwork,
                    // Recalculate momentDurationSec if needed? No, that depends on start/end.
                },
                include: { trackSource: true },
            });

            return NextResponse.json({ success: true, moment: updatedMoment });
        }

        return NextResponse.json({ success: false, message: 'No metadata found to update' });

    } catch (error) {
        console.error('[API] Refresh Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
