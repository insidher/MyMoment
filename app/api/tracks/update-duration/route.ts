import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { sourceUrl, durationSec } = body;

        if (!sourceUrl || !durationSec) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const updated = await prisma.trackSource.update({
            where: { sourceUrl },
            data: { durationSec: Math.floor(durationSec) },
        });

        console.log(`[API] Updated duration for ${sourceUrl} to ${durationSec}s`);
        return NextResponse.json({ success: true, trackSource: updated });
    } catch (error) {
        console.error('[API] Update Duration Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
