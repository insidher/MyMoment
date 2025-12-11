export interface SongMetadata {
    title: string;
    artist: string;
    artwork: string;
}

export async function fetchSpotifyMetadata(url: string): Promise<SongMetadata | null> {
    try {
        const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
        const res = await fetch(oembedUrl);

        if (!res.ok) {
            console.error('Failed to fetch Spotify oEmbed', res.status);
            return null;
        }

        const data = await res.json();

        // Spotify oEmbed returns:
        // title: "Song Title" (sometimes includes artist)
        // thumbnail_url: "..."
        // author_name: "Artist Name" (sometimes)

        return {
            title: data.title || 'Unknown Title',
            artist: data.author_name || 'Unknown Artist',
            artwork: data.thumbnail_url || '',
        };
    } catch (error) {
        console.error('Error fetching Spotify metadata:', error);
        return null;
    }
}
