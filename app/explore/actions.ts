'use server';

import { prisma } from '@/lib/prisma';
import { MusicService, SongGroup, ArtistStats } from '@/types';

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
