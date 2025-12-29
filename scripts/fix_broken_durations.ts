const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

// Parse ISO 8601 duration (PT1M13S)
const parseDuration = (duration) => {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 0;
    const hours = (parseInt(match[1]) || 0);
    const minutes = (parseInt(match[2]) || 0);
    const seconds = (parseInt(match[3]) || 0);
    return hours * 3600 + minutes * 60 + seconds;
};

// Extract YouTube ID
const getYouTubeId = (url) => {
    if (url.includes('v=')) return url.split('v=')[1]?.split('&')[0];
    if (url.includes('youtu.be/')) return url.split('youtu.be/')[1]?.split('?')[0];
    return null;
};

async function fetchYouTubeDuration(videoId) {
    if (!YOUTUBE_API_KEY) {
        console.error('YouTube API key not found');
        return 0;
    }

    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`
        );
        const data = await response.json();

        if (data.items && data.items.length > 0) {
            const duration = data.items[0].contentDetails.duration;
            return parseDuration(duration);
        }
    } catch (error) {
        console.error(`Failed to fetch duration for ${videoId}:`, error);
    }

    return 0;
}

async function fixBrokenDurations() {
    console.log('🔍 Finding track sources with missing duration...\n');

    // Find all track sources with duration_sec = 0 or null
    const { data: brokenTracks, error } = await supabase
        .from('track_sources')
        .select('id, service, source_url, title, duration_sec')
        .or('duration_sec.eq.0,duration_sec.is.null')
        .eq('service', 'youtube') // Only fix YouTube for now
        .limit(50);

    if (error) {
        console.error('Error fetching broken tracks:', error);
        return;
    }

    if (!brokenTracks || brokenTracks.length === 0) {
        console.log('✅ No broken tracks found!');
        return;
    }

    console.log(`Found ${brokenTracks.length} broken YouTube tracks\n`);

    let fixed = 0;
    let failed = 0;

    for (const track of brokenTracks) {
        const videoId = getYouTubeId(track.source_url);

        if (!videoId) {
            console.log(`⚠️  Skipping "${track.title}" - invalid URL`);
            failed++;
            continue;
        }

        console.log(`🔧 Fixing: "${track.title}"`);
        console.log(`   Video ID: ${videoId}`);

        const duration = await fetchYouTubeDuration(videoId);

        if (duration > 0) {
            const { error: updateError } = await supabase
                .from('track_sources')
                .update({ duration_sec: duration })
                .eq('id', track.id);

            if (updateError) {
                console.log(`   ❌ Failed to update: ${updateError.message}`);
                failed++;
            } else {
                console.log(`   ✅ Updated duration: ${duration}s\n`);
                fixed++;
            }
        } else {
            console.log(`   ⚠️  Could not fetch duration\n`);
            failed++;
        }

        // Rate limit: wait 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n📊 Summary:');
    console.log(`   Fixed: ${fixed}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Total: ${brokenTracks.length}`);
}

fixBrokenDurations();
