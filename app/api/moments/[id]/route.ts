import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const moment = await prisma.moment.findUnique({
            where: { id: params.id },
        });

        if (!moment) {
            return NextResponse.json({ error: 'Moment not found' }, { status: 404 });
        }

        if (moment.userId !== session.user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Consolidate Cleanup: Delete this moment AND any exact duplicates owned by the same user.
        // matches: sourceUrl, startSec, endSec, userId
        await prisma.moment.deleteMany({
            where: {
                userId: session.user.id, // Security check: Ensure we only delete user's own items
                sourceUrl: moment.sourceUrl,
                startSec: moment.startSec,
                endSec: moment.endSec,
                // We don't strictly match note, title, etc. If it's the same timestamp/source, it's the "same moment" for this user.
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete moment:', error);
        return NextResponse.json({ error: 'Failed to delete moment' }, { status: 500 });
    }
}
