'use server';

import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { MusicService, SongGroup, ArtistStats, Moment } from '@/types';

export async function getGroupedSongs(): Promise<SongGroup[]> {
    try {
        const songs = await prisma.$queryRaw<any[]>`
      SELECT 
        service, 
        sourceUrl, 
        MAX(title) as title, 
        MAX(artist) as artist, 
        MAX(artwork) as artwork, 
        COUNT(*) as momentsCount, 
        MAX(createdAt) as latestMomentAt
      FROM Moment
      GROUP BY service, sourceUrl
      ORDER BY latestMomentAt DESC
    `;

        return songs.map((s) => ({
            service: s.service as MusicService,
            sourceUrl: s.sourceUrl,
            title: s.title || 'Unknown Title',
            artist: s.artist || 'Unknown Artist',
            artwork: s.artwork || '',
            momentsCount: Number(s.momentsCount),
            latestMomentAt: new Date(s.latestMomentAt),
        }));
    } catch (error) {
        console.error('Failed to fetch grouped songs:', error);
        return [];
    }
}

export async function getUserArtistStats(userId: string): Promise<ArtistStats[]> {
    if (!userId) return [];

    try {
        const stats = await prisma.$queryRaw<any[]>`
      SELECT 
        artist, 
        COUNT(DISTINCT sourceUrl) as songsCount, 
        COUNT(*) as momentsCount, 
        MAX(createdAt) as lastMomentAt
      FROM Moment
      WHERE userId = ${userId} AND artist IS NOT NULL AND artist != ''
      GROUP BY artist
      ORDER BY momentsCount DESC, lastMomentAt DESC
      LIMIT 12
    `;

        return stats.map((s) => ({
            artist: s.artist,
            songsCount: Number(s.songsCount),
            momentsCount: Number(s.momentsCount),
            lastMomentAt: new Date(s.lastMomentAt),
        }));
    } catch (error) {
        console.error('Failed to fetch user artist stats:', error);
        return [];
    }
}

export async function getArtistSongs(userId: string, artistName: string): Promise<SongGroup[]> {
    try {
        const songs = await prisma.$queryRaw<any[]>`
        SELECT 
          service, 
          sourceUrl, 
          MAX(title) as title, 
          MAX(artist) as artist, 
          MAX(artwork) as artwork, 
          COUNT(*) as momentsCount, 
          MAX(createdAt) as latestMomentAt
        FROM Moment
        WHERE artist = ${artistName}
        GROUP BY service, sourceUrl
        ORDER BY latestMomentAt DESC
      `;

        return songs.map((s) => ({
            service: s.service as MusicService,
            sourceUrl: s.sourceUrl,
            title: s.title || 'Unknown Title',
            artist: s.artist || 'Unknown Artist',
            artwork: s.artwork || '',
            momentsCount: Number(s.momentsCount),
            latestMomentAt: new Date(s.latestMomentAt),
        }));
    } catch (error) {
        console.error('Failed to fetch artist songs:', error);
        return [];
    }
}

export async function getRecentMoments(limit = 50): Promise<Moment[]> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        const { data: moments, error } = await supabase
            .from('moments')
            .select(`
                *,
                profiles (
                    full_name,
                    avatar_url
                ),
                likes (
                    user_id
                )
            `)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Supabase fetch error:', error);
            return [];
        }

        if (!moments) return [];

        return moments.map((m: any) => ({
            id: m.id,
            service: m.platform as any,
            // Guard against null resource_id (though schema should enforce)
            sourceUrl: m.platform === 'youtube' && m.resource_id ? `https://www.youtube.com/watch?v=${m.resource_id}` : (m.resource_id || ''),
            startSec: Number(m.start_time) || 0,
            endSec: Number(m.end_time) || 0,
            note: m.note || '',
            title: m.title || 'Untitled',
            artist: m.artist || 'Unknown Artist',
            artwork: m.artwork || '',
            likeCount: Number(m.like_count) || 0,
            savedByCount: Number(m.saved_by_count) || 0,
            createdAt: m.created_at ? new Date(m.created_at).toISOString() : new Date().toISOString(), // String for Client Component safety
            user: {
                name: m.profiles?.full_name || 'Anonymous',
                image: m.profiles?.avatar_url || null
            },
            isLiked: user ? m.likes?.some((l: any) => l.user_id === user.id) : false
        }));

    } catch (error) {
        console.error('Failed to fetch recent moments:', error);
        return [];
    }
}
