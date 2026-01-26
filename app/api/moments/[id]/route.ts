import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> } // Params is a Promise in Next.js 15
) {
    const { id } = await params;
    const supabase = await createClient(); // Await the promise
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const json = await request.json();
        const { note, groupId } = json;

        const updates: any = { updated_at: new Date().toISOString() };
        if (note !== undefined) updates.note = note;
        if (groupId !== undefined) updates.group_id = groupId; // Support Peer-to-Peer grouping update

        //Verify ownership
        const { data: moment, error: fetchError } = await supabase
            .from('moments')
            .select('user_id')
            .eq('id', id)
            .single();

        if (fetchError || !moment) {
            return NextResponse.json({ error: 'Moment not found' }, { status: 404 });
        }

        if (moment.user_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Update
        const { data, error } = await supabase
            .from('moments')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, moment: data });

    } catch (error) {
        console.error('Update moment error:', error);
        return NextResponse.json({ error: 'Failed to update moment' }, { status: 500 });
    }
}
