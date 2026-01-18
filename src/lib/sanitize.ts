import { Moment } from '@/types';

/**
 * Sanitizes raw moment/reply data from API responses
 * Handles inconsistent field naming (camelCase vs snake_case) and missing data
 * 
 * @param rawReply - Raw data from API (may have missing or inconsistent fields)
 * @returns Sanitized Moment object with guaranteed field values
 */
export function sanitizeMoment(rawReply: any): Moment {
    // Handle date field (support both camelCase and snake_case)
    const createdAt = rawReply.createdAt || rawReply.created_at || new Date().toISOString();

    // Handle user field (support both 'user' and 'profiles' schemas)
    const user = rawReply.user || rawReply.profiles || { name: 'Unknown', image: null };

    // Handle profiles field (some schemas use this instead of user)
    const profiles = rawReply.profiles || rawReply.user || { name: 'Unknown', image: null };

    // Handle ID (generate fallback for optimistic UI)
    const id = rawReply.id || `temp-fallback-${Date.now()}`;

    return {
        ...rawReply,
        id,
        createdAt,
        user,
        profiles,
    } as Moment;
}

/**
 * Sanitizes an array of moments
 * 
 * @param rawMoments - Array of raw moment data
 * @returns Array of sanitized Moment objects
 */
export function sanitizeMoments(rawMoments: any[]): Moment[] {
    return rawMoments.map(sanitizeMoment);
}
