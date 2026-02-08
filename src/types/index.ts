export type MusicService = 'youtube' | 'spotify' | 'apple-music' | 'unknown' | 'legacy';

export interface TrackSource {
  id: string;
  service: MusicService;
  sourceUrl: string;
  title?: string;
  artist?: string;
  artwork?: string;
  durationSec?: number;
  category_id?: number;
  canonicalTrackId?: string;
  moments?: Array<{ id: string; startSec: number; endSec: number }>; // For ghost clusters
}

export interface Moment {
  id: string;
  groupId?: string | null;
  parentId?: string | null; // Added for hierarchy
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
  trackDurationSec?: number; // Duration of the full track (denormalized)

  // Metadata
  title?: string;
  artist?: string;
  artwork?: string;
  note?: string;

  likeCount?: number;
  isLiked?: boolean; // Add this
  savedByCount?: number;
  likes?: {
    user_id: string;
    user: {
      name?: string | null;
      image?: string | null;
    };
  }[];
  replies?: Moment[];
  replyCount?: number;

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
