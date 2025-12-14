import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const moment = await prisma.moment.findUnique({
            where: { id: params.id },
        });

        if (!moment) {
            return NextResponse.json({ error: 'Moment not found' }, { status: 404 });
        }

        if (moment.userId !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Consolidate Cleanup: Delete this moment AND any exact duplicates owned by the same user.
        // matches: sourceUrl, startSec, endSec, userId
        await prisma.moment.deleteMany({
            where: {
                userId: user.id, // Security check: Ensure we only delete user's own items
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
