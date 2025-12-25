import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
    console.log('Inspecting profiles table...');
    console.log('Using key type:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Service Role (Admin)' : 'Anon (Public)');

    // 1. Try to select to see columns
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error selecting from profiles:', error);
    } else if (data && data.length > 0) {
        console.log('Found existent row keys:', Object.keys(data[0]));
    } else {
        console.log('No profiles found to inspect keys.');
    }

    // 2. Try to insert a dummy row to test constraints
    // We use a random ID to avoid collisions
    const dummyId = crypto.randomUUID();
    const dummyEmail = `debug_test_${Date.now()}@example.com`;

    console.log(`\nAttempting to insert debug row: ID=${dummyId}, Email=${dummyEmail}`);

    const { data: insertData, error: insertError } = await supabase
        .from('profiles')
        .insert({
            id: dummyId,
            email: dummyEmail,
            name: 'Debug User',
            image: null,
            // Explicitly testing null username if it exists in code types, 
            // but we rely on database to handle it if column exists
        })
        .select();

    if (insertError) {
        console.log(JSON.stringify({ status: 'ERROR', error: insertError }, null, 2));
    } else {
        console.log(JSON.stringify({ status: 'SUCCESS', data: insertData }, null, 2));
        await supabase.from('profiles').delete().eq('id', dummyId);
    }
}

inspectSchema().catch(e => console.error(JSON.stringify({ status: 'CRASH', error: e.message })));
