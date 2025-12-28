# Timeline Feature Reference: Chapters & Moment Notes

This document contains the core logic for the timeline feature, specifically how "Chapter Titles" and "Moment Notes" are parsed, grouped, and rendered.

## 1. Logic Layer: Chapter Parsing
**File**: `src/lib/chapters.ts`

This utility extracts timestamps from video descriptions (e.g. from YouTube).

```typescript
export interface Chapter {
    title: string;
    startSec: number;
}

export function parseChapters(description: string): Chapter[] {
    if (!description) return [];

    const lines = description.split('\n');
    const chapters: Chapter[] = [];
    // Regex for [hh]:mm:ss or mm:ss
    const timestampRegex = /(?:(\d{1,2}):)?(\d{1,2}):(\d{2})/;

    for (const line of lines) {
        const match = line.match(timestampRegex);
        if (match) {
            const timeStr = match[0];
            const parts = timeStr.split(':').map(p => parseInt(p, 10));
            let seconds = 0;

            if (parts.length === 3) {
                seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
            } else if (parts.length === 2) {
                seconds = parts[0] * 60 + parts[1];
            }

            // Extract title
            let title = line.substring(match.index! + timeStr.length).trim();
            title = title.replace(/^[-:.]+\s+/, ''); // Clean separators

            if (title && !isNaN(seconds)) {
                chapters.push({ title, startSec: seconds });
            }
        }
    }
    return chapters.sort((a, b) => a.startSec - b.startSec);
}
```

## 2. Rendering Layer: Timeline & Grouping
**File**: `src/components/PlayerTimeline.tsx`

This component receives both `chapters` and `moments` and merges them visually.

### Merging & Packing Logic
```typescript
// Inside PlayerTimeline render function...
{(() => {
    // 1. Group items that are close in time (within 1s)
    const groups: { time: number; chapter?: Chapter; moment?: Moment; labelWidth?: number }[] = [];
    const THRESHOLD = 1; // Seconds

    // Add Chapters
    chapters.forEach(ch => {
        groups.push({ time: ch.startSec, chapter: ch });
    });

    // Add or Merge Moments
    moments.forEach(m => {
        // Check overlap with existing group
        const existing = groups.find(g => Math.abs(g.time - m.startSec) <= THRESHOLD);
        if (existing) {
            existing.moment = m; // Merge into group
        } else {
            groups.push({ time: m.startSec, moment: m });
        }
    });

    // Sort by time
    groups.sort((a, b) => a.time - b.time);

    // 2. Row Packing (Avoid Visual Overlap)
    // Simple greedy packing into 2 rows + 1 active row
    let row1End = -10;
    const LABEL_BUFFER = 12; // Estimated % width of a label

    const packedGroups = groups.map(group => {
        const isRow1 = ((group.time / safeDuration) * 100) > (row1End + 1);
        if (isRow1) {
            row1End = ((group.time / safeDuration) * 100) + LABEL_BUFFER;
        }
        return { ...group, assignedRow: isRow1 ? 1 : 2 };
    });

    // Render...
    return (
        <div className="relative h-10 w-full">
            {packedGroups.map((group, i) => {
                // Determine Row
                const isActiveGroup = group.moment && (
                    activeMomentId === group.moment.id ||
                    (currentTime >= group.moment.startSec && currentTime < group.moment.endSec)
                );
                const row = isActiveGroup ? 0 : group.assignedRow;
                const topPos = row === 0 ? 'top-1' : row === 1 ? 'top-3.5' : 'top-9';

                // ...
```

### Visual Component (The Label Stack)

```typescript
                return (
                    <div 
                        className={`absolute ... ${topPos} ...`} 
                        style={{ left: `${left}%`, ... }}
                    >
                        <div className="flex flex-row items-stretch">
                            {/* Vertical Line */}
                            <div className={`w-[1px] mr-1.5 ...`} />

                            {/* Stacked Labels */}
                            <div className="flex flex-col items-start gap-0.5 ...">
                                
                                {/* A. Chapter Title (Green) */}
                                {group.chapter && (
                                    <span className="text-[10px] bg-black text-green-400 ...">
                                        {group.chapter.title}
                                    </span>
                                )}

                                {/* B. Moment Note (Orange) */}
                                {group.moment && (
                                    <div className="flex flex-col ...">
                                        <div className="flex items-center gap-1 bg-black text-orange-400 ...">
                                            {/* Truncated Note or "Edit" */}
                                            <span className="text-[10px] ...">
                                                {currentUser?.id === group.moment.userId 
                                                    ? "Edit Moment" 
                                                    : group.moment.note}
                                            </span>
                                            
                                            {/* Expand Button */}
                                            <button onClick={toggleExpand}>
                                                <ChevronDown size={8} />
                                            </button>
                                        </div>

                                        {/* Expanded Full Note Overlay */}
                                        {isExpanded && (
                                            <div className="mt-1 w-[300px] p-4 bg-zinc-950 ...">
                                                <p>{group.moment.note}</p>
                                                {/* Likes, Replies, Edit Buttons ... */}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
})()}
```
