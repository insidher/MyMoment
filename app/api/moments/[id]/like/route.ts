import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> } // Type as Promise
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            console.log('[LikeAPI] Unauthorized request');
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id: momentId } = await params; // Await the promise!

        console.log('[LikeAPI] Processing like for User:', user.id, 'Moment:', momentId);

        // Check if like exists
        const { data: existingLike, error: fetchError } = await supabase
            .from('likes')
            .select('id')
            .eq('user_id', user.id)
            .eq('moment_id', momentId)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "No rows found"
            console.error('[LikeAPI] Error fetching existing like:', fetchError);
        }

        console.log('[LikeAPI] Existing like found?', !!existingLike);

        let liked = false;
        let likeCount = 0;

        if (existingLike) {
            // Unlike - delete the like
            console.log('[LikeAPI] Deleting like...');
            const { error: deleteError } = await supabase
                .from('likes')
                .delete()
                .eq('id', existingLike.id);

            if (deleteError) {
                console.error('[LikeAPI] Delete failed:', deleteError);
                throw deleteError;
            }

            // Decrement like count
            const { data: moment } = await supabase
                .from('moments')
                .select('like_count')
                .eq('id', momentId)
                .single();

            if (moment) {
                likeCount = Math.max(0, (moment.like_count || 0) - 1);
                await supabase
                    .from('moments')
                    .update({ like_count: likeCount })
                    .eq('id', momentId);
            }
            liked = false;
        } else {
            // Like - create new like
            console.log('[LikeAPI] Inserting new like...');
            const { error: insertError } = await supabase
                .from('likes')
                .insert({
                    user_id: user.id,
                    moment_id: momentId
                });

            if (insertError) {
                console.error('[LikeAPI] Insert failed:', insertError);
                throw insertError;
            }

            // Increment like count
            const { data: moment } = await supabase
                .from('moments')
                .select('like_count')
                .eq('id', momentId)
                .single();

            if (moment) {
                likeCount = (moment.like_count || 0) + 1;
                await supabase
                    .from('moments')
                    .update({ like_count: likeCount })
                    .eq('id', momentId);
            }
            liked = true;
        }

        console.log('[LikeAPI] Success. Liked:', liked, 'Count:', likeCount);
        return NextResponse.json({ success: true, liked, likeCount });
    } catch (error) {
        console.error('[LikeAPI] Fatal Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to toggle like' },
            { status: 500 }
        );
    }
}
