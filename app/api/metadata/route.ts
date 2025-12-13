import { NextResponse } from 'next/server';
import { getSpotifyTrackMetadata, extractSpotifyId, extractYouTubeId } from '@/lib/related';
import { getYouTubeVideoMetadata } from '@/lib/youtube';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    try {
        // Check if it's a Spotify URL
        if (url.includes('spotify.com')) {
            const trackId = extractSpotifyId(url);
            if (!trackId) {
                return NextResponse.json({ error: 'Invalid Spotify URL' }, { status: 400 });
            }

            const metadata = await getSpotifyTrackMetadata(trackId);
            if (metadata) {
                return NextResponse.json(metadata);
            } else {
                return NextResponse.json({ error: 'Failed to fetch metadata' }, { status: 404 });
            }
        }

        // Check if it's a YouTube URL
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            const videoId = extractYouTubeId(url);
            if (!videoId) {
                return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
            }

            const metadata = await getYouTubeVideoMetadata(videoId);
            if (metadata) {
                return NextResponse.json(metadata);
            } else {
                return NextResponse.json({ error: 'Failed to fetch metadata' }, { status: 404 });
            }
        }

        return NextResponse.json({ error: 'Unsupported service' }, { status: 400 });

    } catch (error: any) {
        console.error('Metadata API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
