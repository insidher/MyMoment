import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
    const { data: moments, error } = await supabase
        .from('moments')
        .select(`
            id, resource_id, start_time, end_time, track_source_id 
        `)
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) throw error;

    console.log("Latest moments:");
    const grouped = new Map<string, any[]>();
    for (const m of moments) {
        const key = m.track_source_id || m.resource_id;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(m);
    }

    console.log(`Total moments: ${moments.length}`);
    console.log(`Unique track_source_ids/resource_ids: ${grouped.size}`);

    // show any video with > 1 moment
    for (const [k, v] of grouped.entries()) {
        if (v.length > 1) {
            console.log(`Group ${k} has ${v.length} moments:`, v.map(x => x.id).join(', '));
        }
    }

    // Now check grouping by JUST resource_id
    const groupedRes = new Map<string, any[]>();
    for (const m of moments) {
        const key = m.resource_id;
        if (!groupedRes.has(key)) groupedRes.set(key, []);
        groupedRes.get(key)!.push(m);
    }
    console.log(`\nUnique resource_ids: ${groupedRes.size}`);
    for (const [k, v] of groupedRes.entries()) {
        if (v.length > 1) {
            console.log(`Resource ${k} has ${v.length} moments:`, v.map(x => x.id).join(', '));
        }
    }

}

main().catch(console.error);
