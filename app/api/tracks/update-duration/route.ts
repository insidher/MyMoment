import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { sourceUrl, durationSec } = body;

        if (!sourceUrl || !durationSec) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        // Update using Supabase
        const { data: updated, error } = await supabase
            .from('track_sources')
            .update({
                duration_sec: Math.floor(durationSec)
            })
            .eq('source_url', sourceUrl)
            .eq('source_url', sourceUrl)
            .select();

        if (error) {
            console.error('[API] Supabase Update Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!updated || updated.length === 0) {
            console.log(`[API] Track source not found for ${sourceUrl}, skipping duration update.`);
            return NextResponse.json({ message: 'Track not found, skipping update' });
        }

        console.log(`[API] Updated duration for ${sourceUrl} to ${durationSec}s`);
        return NextResponse.json({ success: true, trackSource: updated[0] });
    } catch (error) {
        console.error('[API] Update Duration Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
