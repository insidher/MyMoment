import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { findOrCreateTrackSource } from '@/lib/trackSource';
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
        // Duration limit removed

        // Detect service
        const service = body.service || detectService(body.sourceUrl);

        // Find or create TrackSource
        const trackSource = await findOrCreateTrackSource(service, body.sourceUrl, {
            title: body.title,
            artist: body.artist,
            artwork: body.artwork,
            durationSec: body.duration, // Capture duration from client
        });

        // Detect Canonical ID
        const canonicalTrackId = trackSource.canonicalTrackId;

        // Neighbor Search (SavedBy Logic)
        // Find moments that share the canonical ID (or trackSourceId) and overlap in time
        // Matching Strategy: Start/End within +/- 2 seconds
        const TOLERANCE_SEC = 2;

        const neighbors = await prisma.moment.findMany({
            where: {
                // Match by Canonical ID if available, else exact TrackSource
                OR: [
                    { trackSourceId: trackSource.id },
                    ...(canonicalTrackId ? [{ canonicalTrackId }] : [])
                ],
                // Time Overlap Logic: 
                // Neighbor Start is near New Start AND Neighbor End is near New End
                startSec: {
                    gte: body.startSec - TOLERANCE_SEC,
                    lte: body.startSec + TOLERANCE_SEC,
                },
                endSec: {
                    gte: body.endSec - TOLERANCE_SEC,
                    lte: body.endSec + TOLERANCE_SEC,
                }
            },
            select: { id: true }
        });

        const initialSavedByCount = neighbors.length + 1;

        const momentData = {
            sourceUrl: body.sourceUrl,
            service,
            title: trackSource.title || body.title,
            artist: trackSource.artist || body.artist,
            artwork: trackSource.artwork || body.artwork,
            startSec: body.startSec,
            endSec: body.endSec,
            momentDurationSec: duration,
            note: body.note,
            trackSourceId: trackSource.id,
            canonicalTrackId, // Store on moment for faster reads
            savedByCount: initialSavedByCount,
        };

        // Transaction: Create Moment + Update Neighbors
        const [newMoment] = await prisma.$transaction([
            prisma.moment.create({
                data: {
                    ...momentData,
                    userId: user.id,
                },
                include: {
                    trackSource: true,
                }
            }),
            // Increment savedByCount for all neighbors
            ...(neighbors.length > 0 ? [
                prisma.moment.updateMany({
                    where: {
                        id: { in: neighbors.map(n => n.id) }
                    },
                    data: {
                        savedByCount: { increment: 1 }
                    }
                })
            ] : [])
        ]);

        console.log('[API] Moment saved successfully:', newMoment.id);
        return NextResponse.json({ success: true, moment: newMoment });
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
        const { searchParams } = new URL(request.url);
        const sourceUrl = searchParams.get('sourceUrl');
        const userId = searchParams.get('userId');

        console.log(`[API] GET /api/moments - sourceUrl: ${sourceUrl}, userId: ${userId}`);

        let whereClause: any = {};

        if (sourceUrl) {
            whereClause.sourceUrl = sourceUrl;
        }

        if (userId) {
            whereClause.userId = userId;
        }

        // If no filters, maybe return recent public moments?
        // For now, let's return all if no filter (for Explore page)

        const moments = await prisma.moment.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { name: true, image: true } },
                trackSource: true
            }
        });

        // Check for likes if user is logged in
        let momentsWithLikes = moments;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            const likedMomentIds = await prisma.like.findMany({
                where: {
                    userId: user.id,
                    momentId: { in: moments.map(m => m.id) }
                },
                select: { momentId: true }
            });

            const likedSet = new Set(likedMomentIds.map(l => l.momentId));

            momentsWithLikes = moments.map(m => ({
                ...m,
                isLiked: likedSet.has(m.id)
            }));
        }

        console.log(`[API] Found ${moments.length} moments`);
        return NextResponse.json({ moments: momentsWithLikes });
    } catch (error) {
        console.error('[API] GET /api/moments Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch moments' },
            { status: 500 }
        );
    }
}
