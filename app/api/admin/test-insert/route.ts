import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
    try {
        const supabase = await createClient();

        // Try various insert approaches to determine what works
        const testUrl = 'https://test.youtube.com/watch?v=TEST123';

        // Approach 1: Without id (let Supabase generate)
        try {
            const { error: err1 } = await supabase
                .from('track_sources')
                .insert({
                    service: 'youtube',
                    source_url: testUrl,
                    title: 'Test Track',
                    artist: 'Test Artist',
                    duration_sec: 100
                })
                .select();

            if (!err1) {
                //Clean up
                await supabase.from('track_sources').delete().eq('source_url', testUrl);
                return NextResponse.json({ success: true, method: 'without_id' });
            } else {
                console.log('Approach 1 failed:', err1);
            }
        } catch (e) {
            console.log('Approach 1 exception:', e);
        }

        // Approach 2: With crypto.randomUUID()
        try {
            const { error: err2 } = await supabase
                .from('track_sources')
                .insert({
                    id: crypto.randomUUID(),
                    service: 'youtube',
                    source_url: testUrl,
                    title: 'Test Track',
                    artist: 'Test Artist',
                    duration_sec: 100
                })
                .select();

            if (!err2) {
                await supabase.from('track_sources').delete().eq('source_url', testUrl);
                return NextResponse.json({ success: true, method: 'with_crypto_uuid' });
            } else {
                console.log('Approach 2 failed:', err2);
            }
        } catch (e) {
            console.log('Approach 2 exception:', e);
        }

        return NextResponse.json({ success: false, message: 'All approaches failed' });

    } catch (error) {
        console.error('[TEST] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
