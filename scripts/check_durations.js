// Simple diagnostic script to check track_sources duration
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDurations() {
    const { data, error } = await supabase
        .from('track_sources')
        .select('id, title, source_url, duration_sec')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('\n📊 Recent Track Sources:\n');
    data.forEach((t, i) => {
        console.log(`${i + 1}. "${t.title}"`);
        console.log(`   Duration: ${t.duration_sec || 0}s`);
        console.log(`   URL: ${t.source_url.substring(0, 50)}...`);
        console.log('');
    });
}

checkDurations();
