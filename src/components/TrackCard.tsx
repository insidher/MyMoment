import { Music } from 'lucide-react';
import { TrackSource } from '@/types';

interface TrackCardProps {
    track: Partial<TrackSource> & { title?: string; artist?: string; artwork?: string; durationSec?: number };
    className?: string;
    children?: React.ReactNode; // For overlays/actions
    onClick?: () => void;
}

export default function TrackCard({ track, className = '', children, onClick }: TrackCardProps) {
    const formatDuration = (seconds?: number) => {
        if (!seconds) return '';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className={`glass-panel p-3 relative group block overflow-hidden ${className}`}>
            <div
                className={`flex gap-4 ${onClick ? 'cursor-pointer hover:bg-white/5 rounded-lg -m-2 p-2 transition-colors' : ''}`}
                onClick={onClick}
            >
                {/* Artwork */}
                <div className="w-24 h-24 rounded-lg bg-black/50 overflow-hidden flex-shrink-0 relative">
                    {track.artwork ? (
                        <img src={track.artwork} alt={track.title || 'Track artwork'} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/20">
                            <Music size={24} />
                        </div>
                    )}
                </div>

                {/* Metadata */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h3 className="font-bold truncate text-white text-base">{track.title || 'Unknown Title'}</h3>
                    <p className="text-sm text-white/60 truncate">{track.artist || 'Unknown Artist'}</p>

                    {track.durationSec && (
                        <p className="text-xs text-white/40 mt-1">
                            {formatDuration(track.durationSec)}
                        </p>
                    )}
                </div>
            </div>

            {/* Children (Overlays, Actions, Moment Pill) */}
            {children}
        </div>
    );
}
