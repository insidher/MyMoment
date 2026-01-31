'use server';

import { createClient } from '@/lib/supabase/server';
import { MusicService, SongGroup, ArtistStats, Moment } from '@/types';

export async function getGroupedSongs(): Promise<SongGroup[]> {
    try {
        const supabase = await createClient();

        // Fetch all moments with track_source info
        const { data: moments, error } = await supabase
            .from('moments')
            .select(`
                platform, 
                resource_id, 
                title, 
                artist, 
                artwork, 
                created_at,
                track_sources!track_source_id (
                    title,
                    artist,
                    artwork
                )
            `)
            .order('created_at', { ascending: false });

        if (error || !moments) {
            console.error('Failed to fetch moments for grouping:', error);
            return [];
        }

        // Group by service + resourceId in-memory
        const groups = new Map<string, {
            service: string;
            resource_id: string;
            title: string | null;
            artist: string | null;
            artwork: string | null;
            count: number;
            latest: string;
        }>();

        moments.forEach((m) => {
            const key = `${m.platform}-${m.resource_id}`;
            const existing = groups.get(key);

            if (!existing) {
                groups.set(key, {
                    service: m.platform,
                    resource_id: m.resource_id || '',
                    title: m.track_sources?.title || m.title,
                    artist: m.track_sources?.artist || m.artist,
                    artwork: m.track_sources?.artwork || m.artwork,
                    count: 1,
                    latest: m.created_at
                });
            } else {
                existing.count++;
            }
        });

        return Array.from(groups.values()).map((g) => ({
            service: g.service as MusicService,
            sourceUrl: g.resource_id,
            title: g.title || 'Unknown Title',
            artist: g.artist || 'Unknown Artist',
            artwork: g.artwork || '',
            momentsCount: g.count,
            latestMomentAt: new Date(g.latest),
        }));
    } catch (error) {
        console.error('Failed to fetch grouped songs:', error);
        return [];
    }
}

export async function getUserArtistStats(userId: string): Promise<ArtistStats[]> {
    if (!userId) return [];

    try {
        const supabase = await createClient();

        const { data: moments, error } = await supabase
            .from('moments')
            .select('artist, created_at')
            .eq('user_id', userId)
            .not('artist', 'is', null)
            .order('created_at', { ascending: false });

        if (error || !moments) {
            console.error('Failed to fetch user artist stats:', error);
            return [];
        }

        // Group by artist in-memory
        const artistMap = new Map<string, {
            count: number;
            latest: string;
        }>();

        moments.forEach((m) => {
            const artist = m.artist!;
            const existing = artistMap.get(artist);

            if (!existing) {
                artistMap.set(artist, {
                    count: 1,
                    latest: m.created_at
                });
            } else {
                existing.count++;
            }
        });

        return Array.from(artistMap.entries())
            .map(([artist, stats]) => ({
                artist,
                songsCount: stats.count,
                momentsCount: stats.count,
                lastMomentAt: new Date(stats.latest),
            }))
            .sort((a, b) => b.momentsCount - a.momentsCount)
            .slice(0, 12);
    } catch (error) {
        console.error('Failed to fetch user artist stats:', error);
        return [];
    }
}

export async function getArtistSongs(userId: string, artistName: string, excludeSpotify = false): Promise<SongGroup[]> {
    try {
        const supabase = await createClient();

        let query = supabase
            .from('moments')
            .select(`
                platform, 
                resource_id, 
                title, 
                artist, 
                artwork, 
                created_at,
                track_sources!track_source_id (
                    title,
                    artist,
                    artwork
                )
            `)
            .eq('artist', artistName);

        // Apply Spotify filter at query level if requested
        if (excludeSpotify) {
            query = query.neq('platform', 'spotify');
        }

        const { data: moments, error } = await query
            .order('created_at', { ascending: false });

        if (error || !moments) {
            console.error('Failed to fetch artist songs:', error);
            return [];
        }

        // Group by service + resourceId
        const groups = new Map<string, {
            service: string;
            resource_id: string;
            title: string | null;
            artist: string | null;
            artwork: string | null;
            count: number;
            latest: string;
        }>();

        moments.forEach((m) => {
            const key = `${m.platform}-${m.resource_id}`;
            const existing = groups.get(key);

            if (!existing) {
                groups.set(key, {
                    service: m.platform,
                    resource_id: m.resource_id || '',
                    title: m.track_sources?.title || m.title,
                    artist: m.track_sources?.artist || m.artist,
                    artwork: m.track_sources?.artwork || m.artwork,
                    count: 1,
                    latest: m.created_at
                });
            } else {
                existing.count++;
            }
        });

        return Array.from(groups.values()).map((g) => ({
            service: g.service as MusicService,
            sourceUrl: g.resource_id,
            title: g.title || 'Unknown Title',
            artist: g.artist || 'Unknown Artist',
            artwork: g.artwork || '',
            momentsCount: g.count,
            latestMomentAt: new Date(g.latest),
        }));
    } catch (error) {
        console.error('Failed to fetch artist songs:', error);
        return [];
    }
}

export async function getRecentMoments(limit = 50, excludeSpotify = false): Promise<Moment[]> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        // Fetch moments with profiles and likes
        let query = supabase
            .from('moments')
            .select(`
                id,
                platform,
                resource_id,
                start_time,
                end_time,
                moment_duration_sec,
                track_duration_sec,
                title,
                artist,
                artwork,
                note,
                like_count,
                created_at,
                updated_at,
                user_id,
                track_source_id,
                profiles!user_id (
                    name,
                    image
                ),
                likes (
                    user_id
                ),
                track_sources!track_source_id (
                    title,
                    artist,
                    artwork,
                    duration_sec
                ),
                replies: moments!parent_id(count)
            `);

        // Apply Spotify filter at query level if requested
        if (excludeSpotify) {
            query = query.neq('platform', 'spotify');
        }

        const { data: moments, error } = await query
            .is('parent_id', null) // Stacked Feed: Only Top-Level
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Failed to fetch recent moments:', error);
            return [];
        }

        console.log('DEBUG: Fetched moments:', moments?.length);
        if (moments && moments.length > 0) {
            console.log('DEBUG: First moment raw:', JSON.stringify(moments[0], null, 2));
        }

        if (!moments) return [];

        // Transform to camelCase format
        return moments.map((m: any) => ({
            id: m.id,
            service: m.platform as any,
            sourceUrl: m.resource_id,
            startSec: m.start_time,
            endSec: m.end_time,
            momentDurationSec: m.end_time - m.start_time,
            trackDurationSec: m.track_duration_sec,
            title: m.track_sources?.title || m.title || 'Unknown Title',
            artist: m.track_sources?.artist || m.artist || 'Unknown Artist',
            artwork: m.track_sources?.artwork || m.artwork || null,
            note: m.note,
            likeCount: m.like_count || 0,
            replyCount: m.replies?.[0]?.count || 0,
            savedByCount: m.saved_by_count || 0,
            createdAt: m.created_at,
            updatedAt: m.updated_at,
            userId: m.user_id,
            user: {
                name: m.profiles?.name || 'Music Lover',
                image: m.profiles?.image || null
            },
            isLiked: user ? m.likes?.some((like: any) => like.user_id === user.id) : false,
            trackSource: m.track_sources ? {
                id: m.track_source_id,
                service: m.platform as any,
                sourceUrl: m.resource_id,
                title: m.track_sources.title,
                artist: m.track_sources.artist,
                artwork: m.track_sources.artwork,
                durationSec: m.track_sources.duration_sec,
            } : undefined,
        } as Moment));

    } catch (error) {
        console.error('Failed to fetch recent moments:', error);
        return [];
    }
}

export async function getUserMoments(userId: string, excludeSpotify = false): Promise<Moment[]> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        let query = supabase
            .from('moments')
            .select(`
        id,
            platform,
            resource_id,
            start_time,
            end_time,
            moment_duration_sec,
            track_duration_sec,
            title,
            artist,
            artwork,
            note,
            like_count,
            created_at,
            updated_at,
            user_id,
            track_source_id,
            profiles!user_id(
                name,
                image
            ),
                likes(
                    user_id
                ),
                track_sources!track_source_id(
                    title,
                    artist,
                    artwork,
                    duration_sec
                ),
                replies: moments!parent_id(count)
                    `)
            .eq('user_id', userId);

        // Apply Spotify filter at query level if requested
        if (excludeSpotify) {
            query = query.neq('platform', 'spotify');
        }

        const { data: moments, error } = await query
            .is('parent_id', null) // Stacked Feed: Only Top-Level
            .order('created_at', { ascending: false });

        if (error || !moments) {
            console.error('Failed to fetch user moments:', error);
            return [];
        }

        return moments.map((m: any) => ({
            id: m.id,
            service: m.platform as any,
            sourceUrl: m.resource_id,
            startSec: m.start_time,
            endSec: m.end_time,
            momentDurationSec: m.end_time - m.start_time,
            trackDurationSec: m.track_duration_sec,
            title: m.track_sources?.title || m.title || 'Unknown Title',
            artist: m.track_sources?.artist || m.artist || 'Unknown Artist',
            artwork: m.track_sources?.artwork || m.artwork || null,
            note: m.note,
            likeCount: m.like_count || 0,
            savedByCount: m.saved_by_count || 0,
            createdAt: m.created_at,
            updatedAt: m.updated_at,
            userId: m.user_id,
            user: {
                name: m.profiles?.name || 'Music Lover',
                image: m.profiles?.image || null
            },
            isLiked: user ? m.likes?.some((like: any) => like.user_id === user.id) : false,
            trackSource: m.track_sources ? {
                id: m.track_source_id,
                service: m.platform as any,
                sourceUrl: m.resource_id,
                title: m.track_sources.title,
                artist: m.track_sources.artist,
                artwork: m.track_sources.artwork,
                durationSec: m.track_sources.duration_sec,
            } : undefined,
        } as Moment));
    } catch (error) {
        console.error('Failed to fetch user moments:', error);
        return [];
    }
}

export async function getLikedMoments(userId: string, excludeSpotify = false): Promise<Moment[]> {
    try {
        const supabase = await createClient();

        // Fetch likes with moment details
        let query = supabase
            .from('likes')
            .select(`
        moment_id,
            moments!inner(
                id,
                platform,
                resource_id,
                start_time,
                end_time,
                moment_duration_sec,
                track_duration_sec,
                title,
                artist,
                artwork,
                note,
                like_count,
                created_at,
                updated_at,
                user_id,
                track_source_id,
                profiles!user_id(
                    name,
                    image
                ),
                track_sources!track_source_id(
                    title,
                    artist,
                    artwork,
                    duration_sec
                )
            )
                `)
            .eq('user_id', userId);

        // Apply Spotify filter at query level if requested
        if (excludeSpotify) {
            query = query.neq('moments.platform', 'spotify');
        }

        const { data: likes, error } = await query
            .order('created_at', { ascending: false });

        if (error || !likes) {
            console.error('Failed to fetch liked moments:', error);
            return [];
        }

        return likes.map((l: any) => {
            const m = l.moments;
            return {
                id: m.id,
                service: m.platform as any,
                sourceUrl: m.resource_id,
                startSec: m.start_time,
                endSec: m.end_time,
                momentDurationSec: m.end_time - m.start_time,
                trackDurationSec: m.track_duration_sec,
                title: m.track_sources?.title || m.title || 'Unknown Title',
                artist: m.track_sources?.artist || m.artist || 'Unknown Artist',
                artwork: m.track_sources?.artwork || m.artwork || null,
                note: m.note,
                likeCount: m.like_count || 0,
                savedByCount: m.saved_by_count || 0,
                createdAt: m.created_at,
                updatedAt: m.updated_at,
                userId: m.user_id,
                user: {
                    name: m.profiles?.name || 'Anonymous',
                    image: m.profiles?.image || null
                },
                isLiked: true,
                trackSource: m.track_sources ? {
                    id: m.track_source_id,
                    service: m.platform as any,
                    sourceUrl: m.resource_id,
                    title: m.track_sources.title,
                    artist: m.track_sources.artist,
                    artwork: m.track_sources.artwork,
                    durationSec: m.track_sources.duration_sec,
                } : undefined,
            } as Moment;
        });
    } catch (error) {
        console.error('Failed to fetch liked moments:', error);
        return [];
    }
}

export async function getTrackMoments(resourceId: string): Promise<Moment[]> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        const { data: moments, error } = await supabase
            .from('moments')
            .select(`
            id,
            parent_id,
            group_id,
            platform,
            resource_id,
            start_time,
            end_time,
            moment_duration_sec,
            title,
            artist,
            artwork,
            note,
            like_count,
            created_at,
            updated_at,
            user_id,
            track_source_id,
            profiles!user_id(
                name,
                image
            ),
                likes(
                    user_id,
                    user:profiles!user_id(
                        name,
                        image
                    )
                ),
                track_sources!track_source_id(
                    title,
                    artist,
                    artwork,
                    duration_sec
                ),
                    replies: moments!parent_id(
                        id,
                        user_id,
                        note,
                        created_at,
                        like_count,
                        profiles!user_id(
                            name,
                            image
                        ),
                        replies: moments!parent_id(
                            id,
                            user_id,
                            note,
                            created_at,
                            like_count,
                            profiles!user_id(
                                name,
                                image
                            )
                        )
                    )
                        `)
            .eq('resource_id', resourceId)
            .order('created_at', { ascending: false });

        if (error || !moments) {
            console.error('Failed to fetch track moments:', error);
            return [];
        }

        return moments.map((m: any) => ({
            id: m.id,
            parentId: m.parent_id,
            groupId: m.group_id,
            service: m.platform as any,
            sourceUrl: m.resource_id,
            startSec: m.start_time,
            endSec: m.end_time,
            momentDurationSec: m.end_time - m.start_time,
            title: m.track_sources?.title || m.title || 'Unknown Title',
            artist: m.track_sources?.artist || m.artist || 'Unknown Artist',
            artwork: m.track_sources?.artwork || m.artwork || null,
            note: m.note,
            likeCount: m.like_count || 0,
            savedByCount: m.saved_by_count || 0,
            createdAt: m.created_at,
            updatedAt: m.updated_at,
            userId: m.user_id,
            user: {
                name: m.profiles?.name || 'Music Lover',
                image: m.profiles?.image || null
            },
            isLiked: user ? m.likes?.some((like: any) => like.user_id === user.id) : false,
            likes: m.likes ? m.likes.map((like: any) => ({
                user_id: like.user_id,
                user: {
                    name: like.user?.name || 'User',
                    image: like.user?.image || null
                }
            })) : [],
            trackSource: m.track_sources ? {
                id: m.track_source_id,
                service: m.platform as any,
                sourceUrl: m.resource_id,
                title: m.track_sources.title,
                artist: m.track_sources.artist,
                artwork: m.track_sources.artwork,
                durationSec: m.track_sources.duration_sec,
            } : undefined,
            replies: m.replies ? m.replies.map((r: any) => ({
                id: r.id,
                userId: r.user_id,
                note: r.note,
                createdAt: r.created_at,
                likeCount: r.like_count || 0,
                user: {
                    name: r.profiles?.name || 'User',
                    image: r.profiles?.image || null
                },
                replies: r.replies ? r.replies.map((rr: any) => ({
                    id: rr.id,
                    userId: rr.user_id,
                    note: rr.note,
                    createdAt: rr.created_at,
                    likeCount: rr.like_count || 0,
                    user: {
                        name: rr.profiles?.name || 'User',
                        image: rr.profiles?.image || null
                    }
                })).sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) : []
            })).sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) : [],
        } as Moment));
    } catch (error) {
        console.error('Failed to fetch track moments:', error);
        return [];
    }
}

/**
 * Persist corrected metadata back to the track_sources table.
 * This "heals" bad data (like 0s durations) so it's correct for everyone in the Plaza.
 */
export async function healTrackSource(sourceUrl: string, durationSec: number) {
    if (!sourceUrl || !durationSec || durationSec <= 0) return;

    try {
        const supabase = await createClient();

        // Only update if current duration is 0 or significantly different (less than 1s)
        // For now, let's just update if it's 0 or null to be safe and avoid constant writes
        // Actually, we can just update it once per room session if it's found to be better

        const { error } = await supabase
            .from('track_sources')
            .update({ duration_sec: durationSec })
            .eq('source_url', sourceUrl)
            // Safety: only update if currently 0 or smaller than new duration (to handle 20s junk)
            .or('duration_sec.eq.0,duration_sec.is.null,duration_sec.lt.' + durationSec);

        if (error) {
            console.error('[healTrackSource] Failed to update:', error);
        } else {
            console.log('[healTrackSource] Healed duration:', durationSec, 'for', sourceUrl);
        }
    } catch (err) {
        console.error('[healTrackSource] Error healing:', err);
    }
}

/**
 * Fetch YouTube video metadata securely from server-side
 * This prevents exposing the YouTube API key to the client
 */
export async function fetchYoutubeMetadata(videoId: string) {
    try {
        const apiKey = process.env.YOUTUBE_API_KEY;

        if (!apiKey) {
            console.error('[fetchYoutubeMetadata] YouTube API key not configured');
            return null;
        }

        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`
        );

        if (!response.ok) {
            console.error('[fetchYoutubeMetadata] YouTube API error:', response.status);
            return null;
        }

        const data = await response.json();

        if (!data.items || data.items.length === 0) {
            console.error('[fetchYoutubeMetadata] No video found for ID:', videoId);
            return null;
        }

        const snippet = data.items[0].snippet;
        const contentDetails = data.items[0].contentDetails;

        // Parse ISO 8601 duration (PT1M13S)
        const parseDuration = (duration: string): number => {
            const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
            if (!match) return 0;
            const hours = (parseInt(match[1]) || 0);
            const minutes = (parseInt(match[2]) || 0);
            const seconds = (parseInt(match[3]) || 0);
            return hours * 3600 + minutes * 60 + seconds;
        };

        const durationSec = parseDuration(contentDetails.duration);

        return {
            title: snippet.title,
            channelTitle: snippet.channelTitle,
            description: snippet.description || '',
            thumbnail: snippet.thumbnails.maxres?.url || snippet.thumbnails.high?.url || '',
            durationSec,
        };
    } catch (error) {
        console.error('[fetchYoutubeMetadata] Failed to fetch metadata:', error);
        return null;
    }
}

export async function submitFeedback(content: string, category: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            throw new Error('Not authenticated');
        }

        const { error } = await supabase
            .from('user_feedback' as any)
            .insert({
                user_id: user.id,
                user_name: user.email || 'Anonymous',
                feedback_text: content,
                category: category,
                page_url: typeof window !== 'undefined' ? window.location.href : null,
                user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : null,
            });

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Failed to submit feedback:', error);
        return { success: false, error };
    }
}

export async function getUserFeedback(userId: string) {
    try {
        const supabase = await createClient();

        const { data: feedback, error } = await supabase
            .from('user_feedback' as any)
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return feedback || [];
    } catch (error) {
        console.error('Failed to fetch user feedback:', error);
        return [];
    }
}
