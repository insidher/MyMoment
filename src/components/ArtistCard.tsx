import Link from 'next/link';
import { ArtistStats } from '@/types';

interface ArtistCardProps {
    stats: ArtistStats;
}

export default function ArtistCard({ stats }: ArtistCardProps) {
    return (
        <Link
            href={`/explore?artist=${encodeURIComponent(stats.artist)}`}
            className="flex-shrink-0 w-48 p-4 glass-panel hover:bg-white/10 transition-all hover:-translate-y-1 flex flex-col items-center text-center gap-3"
        >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                {stats.artist.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 w-full">
                <h3 className="font-bold truncate text-white">{stats.artist}</h3>
                <p className="text-xs text-white/60">
                    {stats.songsCount} songs · {stats.momentsCount} moments
                </p>
            </div>
        </Link>
    );
}
