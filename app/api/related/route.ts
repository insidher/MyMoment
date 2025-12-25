import { NextResponse } from 'next/server';
import { MusicService } from '@/types';
import { getRelatedContent, extractYouTubeId, extractSpotifyId } from '@/lib/related';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { service, sourceUrl } = body;

        // Validate inputs
        if (!service || !sourceUrl) {
            return NextResponse.json(
                { error: 'Missing required fields: service and sourceUrl', items: [] },
                { status: 400 }
            );
        }

        // Validate service type
        const validServices: MusicService[] = ['youtube', 'spotify', 'apple-music', 'unknown', 'legacy'];
        if (!validServices.includes(service as MusicService)) {
            return NextResponse.json(
                { error: 'Invalid service type', items: [] },
                { status: 400 }
            );
        }

        // Check for Spotify credentials
        if (service === 'spotify') {
            if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
                console.error('Missing Spotify credentials');
                return NextResponse.json(
                    { error: 'Server missing Spotify credentials', items: [] },
                    { status: 200 } // Return 200 so frontend handles it gracefully as an error state
                );
            }
        }

        // Fetch related content
        let items = await getRelatedContent(service as MusicService, sourceUrl);

        // Enrich with moment counts
        // We use Promise.all to fetch counts in parallel
        items = await Promise.all(items.map(async (item) => {
            let count = 0;
            try {
                // Try to match by ID if possible for better accuracy
                let id = null;
                if (item.service === 'youtube') {
                    id = extractYouTubeId(item.sourceUrl);
                } else if (item.service === 'spotify') {
                    id = extractSpotifyId(item.sourceUrl);
                }

                if (id) {
                    // Count moments where sourceUrl contains the ID
                    count = await prisma.moment.count({
                        where: {
                            resourceId: {
                                contains: id
                            }
                        }
                    });
                } else {
                    // Fallback to exact URL match
                    count = await prisma.moment.count({
                        where: {
                            resourceId: item.sourceUrl
                        }
                    });
                }
            } catch (e) {
                console.warn(`[API] Failed to count moments for ${item.sourceUrl}`, e);
            }

            return { ...item, momentCount: count };
        }));

        return NextResponse.json({ items });
    } catch (error: any) {
        console.error('[API] POST /api/related Error:', error);
        // Return 200 with error message so UI can handle it gracefully
        return NextResponse.json(
            { error: error.message || 'Failed to fetch related content', items: [] },
            { status: 200 }
        );
    }
}
