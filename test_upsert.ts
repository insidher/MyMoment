import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Inlining the normalizeYouTubeUrl function for the test script
function normalizeYouTubeUrl(url: string): string {
    if (!url) return url;
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(regex);
    if (match && match[1]) {
        return `https://www.youtube.com/watch?v=${match[1]}`;
    }
    return url;
}

async function testUpsert(rawUrl: string, suffix: string) {
    console.log(`\n--- Testing ${suffix} ---`);
    console.log(`Original URL: ${rawUrl}`);

    // 1. Normalize
    const normalizedUrl = normalizeYouTubeUrl(rawUrl);
    console.log(`Normalized URL: ${normalizedUrl}`);

    // 2. Upsert using service role (like adminClient)
    const { data: trackSourceData, error: trackSourceError } = await supabase
        .from('track_sources')
        .upsert({
            service: 'youtube',
            source_url: normalizedUrl, // Normalized above
            youtube_video_id: 'dQw4w9WgXcQ',
            title: `Test Title ${suffix}`,
            artist: 'Test Artist',
            artwork: null,
            duration_sec: 180
            // omit created_at
        }, {
            onConflict: 'source_url',
            ignoreDuplicates: false
        })
        .select('id, created_at, title')
        .single();

    if (trackSourceError) {
        console.error("Upsert Failed:", trackSourceError);
        return null;
    }

    console.log(`Resulting track_source: ID=${trackSourceData.id} | Title=${trackSourceData.title} | CreatedAt=${trackSourceData.created_at}`);
    return normalizedUrl;
}

async function main() {
    // 1. Create with standard URL
    const id1 = await testUpsert('https://www.youtube.com/watch?v=dQw4w9WgXcQ', "Standard");

    // Wait slightly to ensure a different created_at if it overwrote
    await new Promise(r => setTimeout(r, 1000));

    // 2. Create with youtu.be variant
    await testUpsert('https://youtu.be/dQw4w9WgXcQ?t=10', "ShortLink Variant");

    // 3. Clean up the test row
    if (id1) {
        await supabase.from('track_sources').delete().eq('source_url', id1);
        console.log(`\nCleanup complete.`);
    }
}

main().catch(console.error);
