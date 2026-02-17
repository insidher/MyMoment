const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Try loading .env (default) and .env.local
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
    console.log('Loading .env.local');
    dotenv.config({ path: envLocalPath });
}
if (fs.existsSync(envPath)) {
    console.log('Loading .env');
    dotenv.config({ path: envPath });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    console.error('URL:', supabaseUrl ? 'Set' : 'Missing');
    console.error('Key:', supabaseKey ? 'Set' : 'Missing');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCategoryIds() {
    console.log('Checking category_id values in track_sources...');

    const { data, error } = await supabase
        .from('track_sources')
        .select('id, category_id, title');

    if (error) {
        console.error('Error fetching data:', error);
        return;
    }

    const invalidEntries = data.filter(item => {
        if (item.category_id === null) return false; // Nulls are fine (will stay null)
        if (typeof item.category_id === 'number') return false; // Already numbers?
        // Check if it's a string that is NOT a valid integer
        return isNaN(parseInt(item.category_id));
    });

    const validEntries = data.filter(item => {
        if (item.category_id === null) return true;
        return !isNaN(parseInt(item.category_id));
    });

    console.log(`Total rows: ${data.length}`);
    console.log(`Rows with valid numeric (or null) category_id: ${validEntries.length}`);
    console.log(`Rows with INVALID category_id: ${invalidEntries.length}`);

    if (invalidEntries.length > 0) {
        console.log('Example invalid entries:', invalidEntries.slice(0, 5));
        console.log('WARNING: Migration will fail for these rows.');
    } else {
        console.log('SUCCESS: All category_id values are numeric or null. Migration is safe.');
    }
}

checkCategoryIds();
