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

        await prisma.moment.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete moment:', error);
        return NextResponse.json({ error: 'Failed to delete moment' }, { status: 500 });
    }
}
