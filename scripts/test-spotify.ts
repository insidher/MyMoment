import { getRelatedContent } from '../src/lib/related';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

async function test() {
    console.log('SPOTIFY_CLIENT_ID:', process.env.SPOTIFY_CLIENT_ID ? 'Set' : 'Missing');
    console.log('SPOTIFY_CLIENT_SECRET:', process.env.SPOTIFY_CLIENT_SECRET ? 'Set' : 'Missing');

    const spotifyUrl = 'https://open.spotify.com/track/4pxHVL0syMQwYK3BxDaTIs'; // Paul McCartney - Band on the Run (from user screenshot/logs)

    console.log('Testing Spotify Recommendations for:', spotifyUrl);

    try {
        const items = await getRelatedContent('spotify', spotifyUrl);
        console.log('Result count:', items.length);
        if (items.length > 0) {
            console.log('First item:', items[0]);
        } else {
            console.log('No items returned.');
        }
    } catch (error: any) {
        console.log('TEST FAILED');
        console.log('Error Message:', error.message);
        if (error.cause) console.log('Cause:', error.cause);
    }
}

console.log('Client ID Prefix:', process.env.SPOTIFY_CLIENT_ID?.substring(0, 4));
test();
