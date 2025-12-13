import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> } // Params is a Promise in Next.js 15+
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: momentId } = await params;
        const userId = session.user.id;

        // Check if already liked
        const existingLike = await prisma.like.findUnique({
            where: {
                userId_momentId: {
                    userId,
                    momentId,
                },
            },
        });

        let isLiked = false;
        let diff = 0;

        if (existingLike) {
            // Un-like
            await prisma.$transaction([
                prisma.like.delete({
                    where: { id: existingLike.id },
                }),
                prisma.moment.update({
                    where: { id: momentId },
                    data: { likeCount: { decrement: 1 } },
                }),
            ]);
            isLiked = false;
            diff = -1;
        } else {
            // Like
            await prisma.$transaction([
                prisma.like.create({
                    data: {
                        userId,
                        momentId,
                    },
                }),
                prisma.moment.update({
                    where: { id: momentId },
                    data: { likeCount: { increment: 1 } },
                }),
            ]);
            isLiked = true;
            diff = 1;
        }

        // Fetch updated count
        const moment = await prisma.moment.findUnique({
            where: { id: momentId },
            select: { likeCount: true }
        });

        return NextResponse.json({
            success: true,
            liked: isLiked,
            likeCount: moment?.likeCount || 0
        });

    } catch (error) {
        console.error('[API] Like Toggle Error:', error);
        return NextResponse.json({ error: 'Failed to toggle like' }, { status: 500 });
    }
}
