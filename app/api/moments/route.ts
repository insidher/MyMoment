import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { findOrCreateTrackSource } from '@/lib/trackSource';

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        console.log('[API] POST /api/moments - Session:', JSON.stringify(session, null, 2));

        if (!session?.user?.id) {
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
        if (duration > 60) {
            return NextResponse.json(
                { error: 'Moment duration cannot exceed 60 seconds' },
                { status: 400 }
            );
        }

        // Detect service
        const service = body.service || detectService(body.sourceUrl);

        // Find or create TrackSource
        const trackSource = await findOrCreateTrackSource(service, body.sourceUrl, {
            title: body.title,
            artist: body.artist,
            artwork: body.artwork,
            durationSec: body.duration, // Capture duration from client
        });

        const momentData = {
            sourceUrl: body.sourceUrl,
            service,
            title: trackSource.title || body.title, // Prefer TrackSource but fallback
            artist: trackSource.artist || body.artist,
            artwork: trackSource.artwork || body.artwork,
            startSec: body.startSec,
            endSec: body.endSec,
            momentDurationSec: duration,
            note: body.note,
            trackSourceId: trackSource.id,
        };

        const newMoment = await prisma.moment.create({
            data: {
                ...momentData,
                userId: session.user.id,
            },
            include: {
                trackSource: true,
            }
        });

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

        console.log(`[API] Found ${moments.length} moments`);
        return NextResponse.json({ moments });
    } catch (error) {
        console.error('[API] GET /api/moments Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch moments' },
            { status: 500 }
        );
    }
}
