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

export async function createComment(
    momentId: string,
    content: string,
    path: string,
    isHead: boolean = false // NEW PARAMETER (Default false for backward compat)
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    if (!content.trim()) return;

    // Fetch parent moment details to copy context
    const { data: parentMoment, error } = await supabase
        .from('moments')
        .select('parent_id, track_source_id, resource_id, platform, title, artist, artwork, start_time, end_time')
        .eq('id', momentId)
        .single();

    if (error || !parentMoment) {
        throw new Error('Parent moment not found');
    }

    let finalParentId = momentId; // Default: Attach directly to the moment we clicked (creating a child)

    // SMART CAP LOGIC
    // ONLY run this if we are NOT replying to the Head (Main Moment)
    if (!isHead && parentMoment.parent_id) {
        // It has a parent. Now we check if it is DEEP nested (Level 3).

        // Fetch the Grandparent to check depth
        const { data: grandParent } = await supabase
            .from('moments')
            .select('parent_id')
            .eq('id', parentMoment.parent_id)
            .single();

        if (grandParent && grandParent.parent_id) {
            // Parent (Level 3) -> Grandparent (Level 2) -> GreatGrandparent (Level 1)
            // We are at max depth. We cannot create a Level 4 item.
            // Action: Flatten. Attach to the immediate parent (Level 2) to keep it at Level 3.
            finalParentId = parentMoment.parent_id;
        }

        // IF grandParent has NO parent_id (Level 2), then parentMoment is Level 2.
        // We CAN create a Level 3 item. So we leave finalParentId = momentId.
        // This ensures the Main Moment (Level 2) stays the Parent of the new Reply (Level 3).
    }

    const { data: newComment } = await supabase
        .from('moments')
        .insert({
            user_id: user.id,
            parent_id: finalParentId,
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
            moment_duration_sec: parentMoment.end_time - parentMoment.start_time,
            saved_by_count: 1,
        })
        .select('*, profiles(name, image)')
        .single();

    revalidatePath(path);
    return newComment;
}
