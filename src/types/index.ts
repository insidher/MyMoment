export type MusicService = 'youtube' | 'spotify' | 'apple-music' | 'unknown' | 'legacy';

export interface TrackSource {
  id: string;
  service: MusicService;
  sourceUrl: string;
  title?: string;
  artist?: string;
  artwork?: string;
  durationSec?: number;
}

export interface Moment {
  id: string;
  userId?: string;

  // Source
  service: MusicService;
  sourceUrl: string;
  canonicalTrackId?: string;

  trackSourceId?: string;
  trackSource?: TrackSource;

  // Timing (in seconds)
  startSec: number;
  endSec: number;
  momentDurationSec?: number;

  // Metadata
  title?: string;
  artist?: string;
  artwork?: string;
  note?: string;

  likeCount?: number;

  createdAt: string | Date;
  updatedAt?: string | Date;

  // Optional user info (for display)
  user?: {
    name?: string | null;
    image?: string | null;
  };
}

export interface SongGroup {
  service: MusicService;
  sourceUrl: string;
  title: string;
  artist: string;
  artwork: string;
  momentsCount: number;
  latestMomentAt: Date;
}

export interface ArtistStats {
  artist: string;
  songsCount: number;
  momentsCount: number;
  lastMomentAt: Date;
}
