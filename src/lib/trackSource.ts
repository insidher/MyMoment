import { prisma } from '@/lib/prisma';
import { getYouTubeVideoMetadata } from './youtube';
import { generateCanonicalId } from './canonical';

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
    const finalTitle = title || 'Unknown Title';
    const finalArtist = artist || 'Unknown Artist';

    // Import dynamically or at top-level. Top-level preferred.
    // I'll assume I can add the import at the top in a separate edit or let the user do it, 
    // but for this tool I must be precise.
    // Actually, I should add the import first. But I can do it in one go if I change the whole file or use multi_replace.
    // Since I'm using replace_file_content for a chunk, I'll add the import in a separate call or use multi_replace.
    // I'll use multi_replace to do both.
    return await prisma.trackSource.create({
        data: {
            service,
            sourceUrl,
            title: finalTitle,
            artist: finalArtist,
            artwork,
            durationSec,
            canonicalTrackId: generateCanonicalId(finalArtist, finalTitle),
        },
    });
}
