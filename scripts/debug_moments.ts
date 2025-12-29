import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function inspectMoments() {
    console.log('Fetching recent moments...');
    const { data: moments, error } = await supabase
        .from('moments')
        .select(`
      id,
      title,
      start_time,
      end_time,
      resource_id,
      track_source_id,
      track_sources (
        id,
        title,
        duration_sec
      )
    `)
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Recent Moments:');
    moments.forEach(m => {
        console.log('------------------------------------------------');
        console.log(`Title: ${m.title || m.track_sources?.title}`);
        console.log(`Resource: ${m.resource_id}`);
        console.log(`Start/End: ${m.start_time} - ${m.end_time}`);
        console.log(`Duration (Calc): ${(m.end_time || 0) - (m.start_time || 0)}`);
        console.log(`Track Source ID: ${m.track_source_id}`);
        console.log(`Track Source Duration: ${m.track_sources?.duration_sec}`);
    });
}

inspectMoments();
