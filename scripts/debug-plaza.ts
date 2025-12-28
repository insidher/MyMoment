import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env from root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
// Also try .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key exists:', !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('Fetching moments...');

    // Replicate the query from getRecentMoments in app/explore/actions.ts
    const { data, error } = await supabase
        .from('moments')
        .select(`
                id,
                platform,
                resource_id,
                title,
                track_sources!track_source_id (
                    title,
                    duration_sec
                )
            `)
        .is('parent_id', null)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error fetching moments:', error);
        fs.writeFileSync('debug_results.txt', `Error: ${JSON.stringify(error, null, 2)}`);
    } else {
        if (data && data.length > 0) {
            const output = `Found ${data.length} moments\nPlatforms: ${data.map(m => m.platform).join(', ')}\nFirst moment: ${JSON.stringify(data[0], null, 2)}`;
            fs.writeFileSync('debug_results.txt', output);
            console.log('Results written to debug_results.txt');
        } else {
            fs.writeFileSync('debug_results.txt', 'No moments found');
        }
    }
}

main();
