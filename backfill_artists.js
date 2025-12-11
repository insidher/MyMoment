/**
 * Script to backfill artist/channel names for existing moments
 * For YouTube: Fetches channel name from YouTube API
 * For Spotify: Fetches artist name from Spotify API
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function extractYouTubeId(url) {
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname.includes('youtube.com') && urlObj.searchParams.has('v')) {
            return urlObj.searchParams.get('v');
        }
        if (urlObj.hostname === 'youtu.be') {
            return urlObj.pathname.slice(1).split('?')[0];
        }
        return null;
    } catch {
        return null;
    }
}

function extractSpotifyId(url) {
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname.includes('spotify.com') && urlObj.pathname.includes('/track/')) {
            return urlObj.pathname.split('/track/')[1].split('?')[0];
        }
        return null;
    } catch {
        return null;
    }
}

async function fetchYouTubeChannelName(videoId) {
    const apiKey = process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
    if (!apiKey) {
        console.warn('No YouTube API key found');
        return null;
    }

    try {
        const url = new URL('https://www.googleapis.com/youtube/v3/videos');
        url.searchParams.set('part', 'snippet');
        url.searchParams.set('id', videoId);
        url.searchParams.set('key', apiKey);

        const res = await fetch(url.toString());
        if (!res.ok) return null;

        const data = await res.json();
        if (!data.items || data.items.length === 0) return null;

        return data.items[0].snippet.channelTitle;
    } catch (e) {
        console.error(`Failed to fetch YouTube data for ${videoId}:`, e.message);
        return null;
    }
}

async function getSpotifyAccessToken() {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        console.warn('Missing Spotify credentials');
        return null;
    }

    try {
        const res = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
            },
            body: 'grant_type=client_credentials'
        });

        if (!res.ok) return null;
        const data = await res.json();
        return data.access_token;
    } catch (e) {
        console.error('Failed to get Spotify token:', e.message);
        return null;
    }
}

async function fetchSpotifyArtist(trackId, token) {
    try {
        const res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) return null;
        const data = await res.json();
        return data.artists.map(a => a.name).join(', ');
    } catch (e) {
        console.error(`Failed to fetch Spotify data for ${trackId}:`, e.message);
        return null;
    }
}

async function backfillArtistData() {
    console.log('Starting artist/channel backfill...\n');

    // Find moments with missing artist data
    const moments = await prisma.moment.findMany({
        where: {
            OR: [
                { artist: null },
                { artist: '' },
                { artist: 'Unknown Artist' }
            ]
        },
        select: {
            id: true,
            sourceUrl: true,
            service: true,
            title: true
        }
    });

    console.log(`Found ${moments.length} moments with missing artist data\n`);

    let updated = 0;
    let failed = 0;
    let spotifyToken = null;

    // Get Spotify token once for all Spotify requests
    if (moments.some(m => m.service === 'spotify')) {
        spotifyToken = await getSpotifyAccessToken();
        if (!spotifyToken) {
            console.warn('Could not get Spotify token, Spotify moments will be skipped\n');
        }
    }

    for (const moment of moments) {
        console.log(`Processing: ${moment.title || 'Untitled'} (${moment.service})`);

        let artistName = null;

        try {
            if (moment.service === 'youtube') {
                const videoId = extractYouTubeId(moment.sourceUrl);
                if (videoId) {
                    artistName = await fetchYouTubeChannelName(videoId);
                    if (artistName) {
                        console.log(`  ✓ Found channel: ${artistName}`);
                    }
                }
            } else if (moment.service === 'spotify' && spotifyToken) {
                const trackId = extractSpotifyId(moment.sourceUrl);
                if (trackId) {
                    artistName = await fetchSpotifyArtist(trackId, spotifyToken);
                    if (artistName) {
                        console.log(`  ✓ Found artist: ${artistName}`);
                    }
                }
            }

            if (artistName) {
                await prisma.moment.update({
                    where: { id: moment.id },
                    data: { artist: artistName }
                });
                updated++;
            } else {
                console.log(`  ✗ Could not fetch metadata`);
                failed++;
            }
        } catch (error) {
            console.error(`  ✗ Error:`, error.message);
            failed++;
        }

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`\nBackfill complete!`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Failed: ${failed}`);

    await prisma.$disconnect();
}

backfillArtistData().catch(console.error);
