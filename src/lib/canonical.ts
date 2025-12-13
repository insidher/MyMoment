import crypto from 'crypto';

/**
 * Normalizes artist and title strings for fuzzy matching.
 * Removes common suffixes, special characters, and case differences.
 */
export function normalizeString(str: string): string {
    if (!str) return '';

    return str
        .toLowerCase()
        // Remove content in brackets/parentheses (e.g., "Official Video", "Feat. X")
        .replace(/\s*[([].*?[)\]]/g, '')
        // Remove common suffixes
        .replace(/\s+(official video|official audio|lyrics|video|audio)\s*$/g, '')
        // Remove special characters (keep logic minimal for V0)
        .replace(/[^a-z0-9]/g, '')
        .trim();
}

/**
 * Generates a deterministic canonical ID based on artist and title.
 * Format: "can_" + sha256(normalized_artist + "_" + normalized_title)
 */
export function generateCanonicalId(artist: string, title: string): string {
    const normArtist = normalizeString(artist || 'unknown');
    const normTitle = normalizeString(title || 'unknown');

    // Create a key like "thebeatles_heyjude"
    const key = `${normArtist}_${normTitle}`;

    // Hash it for a consistent ID
    const hash = crypto.createHash('sha256').update(key).digest('hex').substring(0, 16);
    return `can_${hash}`;
}

/**
 * Helper to check if two tracks are likely the same
 */
export function areTracksEqual(t1: { artist: string; title: string }, t2: { artist: string; title: string }): boolean {
    const id1 = generateCanonicalId(t1.artist, t1.title);
    const id2 = generateCanonicalId(t2.artist, t2.title);
    return id1 === id2;
}
