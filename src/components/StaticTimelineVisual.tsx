import { Moment } from '@/types';

interface StaticTimelineVisualProps {
    moments: Moment[];
    totalDuration: number;
}

export default function StaticTimelineVisual({ moments, totalDuration }: StaticTimelineVisualProps) {
    if (totalDuration === 0 || moments.length === 0) {
        return null;
    }

    return (
        <div className="w-full h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden relative">
            {moments.map((moment, index) => {
                const startPercent = ((moment.startSec || 0) / totalDuration) * 100;
                const widthPercent = (((moment.endSec || 0) - (moment.startSec || 0)) / totalDuration) * 100;

                return (
                    <div
                        key={moment.id || index}
                        className="absolute top-0 bottom-0 bg-gradient-to-r from-orange-500 to-red-500"
                        style={{
                            left: `${startPercent}%`,
                            width: `${widthPercent}%`,
                        }}
                        title={`${moment.startSec}s - ${moment.endSec}s`}
                    />
                );
            })}
        </div>
    );
}
