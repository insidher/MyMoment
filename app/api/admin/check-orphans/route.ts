import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
    try {
        const supabase = await createClient();

        // Check moments without track_source_id
        const { data: orphanedMoments, error } = await supabase
            .from('moments')
            .select('id, title, platform, resource_id, track_source_id, created_at')
            .is('track_source_id', null)
            .eq('platform', 'youtube')
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log('[ORPHANED-MOMENTS] Found moments without track_source:', orphanedMoments?.length);

        return NextResponse.json({
            message: 'Orphaned moments check',
            count: orphanedMoments?.length || 0,
            moments: orphanedMoments?.map(m => ({
                id: m.id,
                title: m.title,
                url: m.resource_id,
                created: m.created_at
            }))
        });

    } catch (error) {
        console.error('Failed to check orphaned moments:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
