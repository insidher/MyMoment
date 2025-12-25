'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function toggleLike(momentId: string, path: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    // Check if like exists
    const { data: existingLike } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('moment_id', momentId)
        .single();

    if (existingLike) {
        // Unlike - delete the like
        await supabase
            .from('likes')
            .delete()
            .eq('id', existingLike.id);

        // Decrement like count
        const { data: moment } = await supabase
            .from('moments')
            .select('like_count')
            .eq('id', momentId)
            .single();

        if (moment) {
            await supabase
                .from('moments')
                .update({ like_count: Math.max(0, (moment.like_count || 0) - 1) })
                .eq('id', momentId);
        }
    } else {
        // Like - create new like
        await supabase
            .from('likes')
            .insert({
                user_id: user.id,
                moment_id: momentId
            });

        // Increment like count
        const { data: moment } = await supabase
            .from('moments')
            .select('like_count')
            .eq('id', momentId)
            .single();

        if (moment) {
            await supabase
                .from('moments')
                .update({ like_count: (moment.like_count || 0) + 1 })
                .eq('id', momentId);
        }
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
    const { data: parentMoment, error } = await supabase
        .from('moments')
        .select('track_source_id, resource_id, platform, title, artist, artwork, start_time, end_time')
        .eq('id', momentId)
        .single();

    if (error || !parentMoment) {
        throw new Error('Parent moment not found');
    }

    // Create Reply Moment (comment)
    await supabase
        .from('moments')
        .insert({
            user_id: user.id,
            parent_id: momentId,
            note: content,

            // Context Copying
            track_source_id: parentMoment.track_source_id,
            resource_id: parentMoment.resource_id,
            platform: parentMoment.platform,
            title: parentMoment.title,
            artist: parentMoment.artist,
            artwork: parentMoment.artwork,

            // Timing Match (so it appears at same spot)
            start_time: parentMoment.start_time,
            end_time: parentMoment.end_time,
        });

    revalidatePath(path);
}
