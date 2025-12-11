import { getSpotifyTrackMetadata } from '../src/lib/related';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

async function test() {
    // The Doors - People Are Strange
    const trackId = '1Jmqubf9kGkWeYQXQKImL5';

    console.log('Testing Metadata Fetch for:', trackId);

    try {
        const metadata = await getSpotifyTrackMetadata(trackId);
        console.log('Result:', metadata);
    } catch (error) {
        console.error('Error:', error);
    }
}

test();
