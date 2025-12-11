const https = require('https');
require('dotenv').config({ path: '.env.local' }); // Try .env.local first
require('dotenv').config(); // Then .env

const apiKey = process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

console.log('API Key present:', !!apiKey);

if (!apiKey) {
    console.error('No API Key found!');
    process.exit(1);
}

const videoId = 'ksZ69Rj86ac'; // Example video
const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&relatedToVideoId=${videoId}&type=video&maxResults=5&key=${apiKey}`;

console.log('Fetching:', url.replace(apiKey, 'HIDDEN'));

https.get(url, (res) => {
    console.log('Status:', res.statusCode);
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.error) {
                console.error('API Error:', json.error);
            } else {
                console.log('Results:', json.items ? json.items.length : 0);
            }
        } catch (e) {
            console.error('Parse error:', e);
            console.log('Raw:', data);
        }
    });
}).on('error', (e) => {
    console.error('Network error:', e);
});
