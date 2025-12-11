import Link from 'next/link';
import { Play, Music } from 'lucide-react';
import { SongGroup } from '@/types';

interface SongCardProps {
    song: SongGroup;
}

export default function SongCard({ song }: SongCardProps) {
    return (
        <Link
            href={`/room/view?url=${encodeURIComponent(song.sourceUrl)}`}
            className="glass-panel p-4 group hover:bg-white/10 transition-all hover:-translate-y-1 block"
        >
            <div className="flex gap-4">
                <div className="w-24 h-24 rounded-lg bg-black/50 overflow-hidden flex-shrink-0 relative">
                    {song.artwork ? (
                        <img src={song.artwork} alt={song.title} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/20">
                            <Music size={24} />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play size={24} className="fill-white text-white" />
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold truncate text-white">{song.title}</h3>
                    <p className="text-sm text-white/60 truncate">{song.artist}</p>

                    <div className="mt-3 flex items-center gap-2 text-xs text-white/40">
                        <span className="bg-white/10 px-2 py-1 rounded-md text-white/80 font-mono">
                            {song.momentsCount} moment{song.momentsCount !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
}
