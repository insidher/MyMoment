import { prisma } from '@/lib/prisma';
import { getYouTubeVideoMetadata } from './youtube';

export async function findOrCreateTrackSource(
    service: string,
    sourceUrl: string,
    providedMetadata?: {
        title?: string;
        artist?: string;
        artwork?: string;
        durationSec?: number;
    }
) {
    // 1. Try to find existing
    const existing = await prisma.trackSource.findUnique({
        where: { sourceUrl },
    });

    if (existing) {
        return existing;
    }

    // 2. If not found, prepare metadata
    let title = providedMetadata?.title;
    let artist = providedMetadata?.artist;
    let artwork = providedMetadata?.artwork;
    let durationSec: number | null = providedMetadata?.durationSec || null;

    // 3. Fetch from YouTube if needed
    if (service === 'youtube') {
        // Extract video ID from URL
        // Supports: youtube.com/watch?v=ID, youtu.be/ID, etc.
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
                title = ytMeta.title;
                artist = ytMeta.channelTitle;
                artwork = ytMeta.thumbnails.maxres || ytMeta.thumbnails.high || ytMeta.thumbnails.medium;
                durationSec = ytMeta.durationSec;
            }
        }
    }

    // 4. Create new TrackSource
    return await prisma.trackSource.create({
        data: {
            service,
            sourceUrl,
            title: title || 'Unknown Title',
            artist: artist || 'Unknown Artist',
            artwork,
            durationSec,
        },
    });
}
