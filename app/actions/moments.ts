'use server';

import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function toggleLike(momentId: string, path: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    // Check if like exists
    const existingLike = await prisma.like.findUnique({
        where: {
            userId_momentId: {
                userId: user.id,
                momentId: momentId
            }
        }
    });

    if (existingLike) {
        // Unlike
        await prisma.like.delete({
            where: {
                id: existingLike.id
            }
        });

        // Decrement count
        await prisma.moment.update({
            where: { id: momentId },
            data: { likeCount: { decrement: 1 } }
        });
    } else {
        // Like
        await prisma.like.create({
            data: {
                userId: user.id,
                momentId: momentId
            }
        });

        // Increment count
        await prisma.moment.update({
            where: { id: momentId },
            data: { likeCount: { increment: 1 } }
        });
    }

    revalidatePath(path);
}

export async function createComment(momentId: string, content: string, path: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    if (!content.trim()) return;

    // Fetch parent moment details to copy context
    const parentMoment = await prisma.moment.findUnique({
        where: { id: momentId }
    });

    if (!parentMoment) throw new Error('Parent moment not found');

    // Create Reply Moment
    await prisma.moment.create({
        data: {
            userId: user.id,
            parentId: momentId,
            note: content,

            // Context Copying
            trackSourceId: parentMoment.trackSourceId,
            resourceId: parentMoment.resourceId,
            service: parentMoment.service,
            title: parentMoment.title, // Optional: Denote reply?
            artist: parentMoment.artist,
            artwork: parentMoment.artwork,

            // Timing Match (so it appears at same spot)
            startSec: parentMoment.startSec,
            endSec: parentMoment.endSec,

            // Ensure profile exists (it should if logged in)
            // No strict check here, implicit via userId FK
        }
    });

    revalidatePath(path);
}
