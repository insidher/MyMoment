import { RelatedItem } from '@/lib/related';

type RelatedStripProps = {
    items: RelatedItem[];
    onSelect: (item: RelatedItem) => void;
};

export default function RelatedStrip({ items, onSelect, orientation = 'horizontal' }: RelatedStripProps & { orientation?: 'horizontal' | 'vertical' }) {
    if (items.length === 0) return null;

    const isVertical = orientation === 'vertical';

    return (
        <div className={isVertical ? "h-full flex flex-col" : "space-y-4"}>
            <div className={`relative ${isVertical ? 'flex-1 min-h-0' : ''}`}>
                <div className={`
                    ${isVertical
                        ? 'flex flex-col gap-4 overflow-y-auto h-full pr-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent'
                        : 'flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent'
                    }
                `}>
                    {items.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => onSelect(item)}
                            className={`
                                glass-panel flex-shrink-0 p-3 hover:bg-white/10 transition-all group cursor-pointer text-left
                                ${isVertical ? 'w-full flex gap-3' : 'w-64 block'}
                            `}
                        >
                            {/* Thumbnail */}
                            <div className={`
                                relative rounded-lg overflow-hidden bg-black
                                ${isVertical ? 'w-24 h-16 flex-shrink-0' : 'aspect-video mb-3 w-full'}
                            `}>
                                <img
                                    src={item.artwork}
                                    alt={item.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                {/* Play overlay */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <div className={`${isVertical ? 'w-8 h-8' : 'w-12 h-12'} rounded-full bg-white/90 flex items-center justify-center`}>
                                        <svg
                                            className={`${isVertical ? 'w-4 h-4' : 'w-6 h-6'} text-black ml-1`}
                                            fill="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Info */}
                            <div className={isVertical ? 'flex-1 min-w-0 flex flex-col justify-center' : ''}>
                                {/* Title */}
                                <p className={`font-medium text-sm line-clamp-2 ${isVertical ? 'mb-0.5' : 'mb-1'}`}>
                                    {item.title}
                                </p>

                                {/* Artist/Channel */}
                                {item.artist && (
                                    <p className="text-xs text-white/50 line-clamp-1">
                                        {item.artist}
                                    </p>
                                )}

                                {/* Moment Badge */}
                                {item.momentCount !== undefined && item.momentCount > 0 && (
                                    <div className="mt-1.5">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-medium text-white/80 border border-white/5">
                                            {item.momentCount} moment{item.momentCount !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
