import { Moment } from "@/types";

export interface ClusterRange {
    totalRange: { start: number; end: number };
    coreRange: { start: number; end: number };
}

/**
 * Calculates the total range (Tail) and the max-overlap range (Core/Heat) for a cluster of moments.
 * Uses a Sweep Line algorithm to find density.
 */
export function calculateClusterRanges(moments: Moment[]): ClusterRange {
    if (moments.length === 0) {
        return { totalRange: { start: 0, end: 0 }, coreRange: { start: 0, end: 0 } };
    }

    // 1. Total Range (Union) - simple Min/Max
    let minStart = Infinity;
    let maxEnd = -Infinity;

    moments.forEach(m => {
        if (m.startSec < minStart) minStart = m.startSec;
        if (m.endSec > maxEnd) maxEnd = m.endSec;
    });

    const totalRange = { start: minStart, end: maxEnd };

    // 2. Core Range (Intersection/Heat) - Sweep Line Logic
    // Create events: +1 at start, -1 at end
    const events: { time: number; type: 'start' | 'end' }[] = [];

    moments.forEach(m => {
        events.push({ time: m.startSec, type: 'start' });
        events.push({ time: m.endSec, type: 'end' });
    });

    // Sort events: time asc. If time equal, 'start' before 'end' to maximize overlap count at boundary?
    // Actually for "overlap" strictly, if one ends at T and another starts at T, is that 2 overlaps?
    // Usually no. So process 'end' before 'start' if times are equal to avoid fake peaks.
    events.sort((a, b) => {
        if (a.time !== b.time) return a.time - b.time;
        if (a.type === 'end' && b.type === 'start') return -1;
        if (a.type === 'start' && b.type === 'end') return 1;
        return 0;
    });

    let currentOverlap = 0;
    let maxOverlap = 0;

    // We want the longest continuous segment with the HIGHEST overlap count.
    // Or maybe just *A* segment with highest overlap.

    // We'll track the candidates for "Max Overlap".
    let bestSegment = { start: minStart, end: maxEnd, overlap: 0, duration: 0 };

    // Sweep
    for (let i = 0; i < events.length - 1; i++) {
        const event = events[i];

        if (event.type === 'start') currentOverlap++;
        else currentOverlap--;

        // The segment between this event and the next event has `currentOverlap` depth
        const nextTime = events[i + 1].time;
        const duration = nextTime - event.time;

        if (duration > 0) {
            // Check if this is the new best
            if (currentOverlap > maxOverlap) {
                maxOverlap = currentOverlap;
                bestSegment = { start: event.time, end: nextTime, overlap: currentOverlap, duration };
            } else if (currentOverlap === maxOverlap) {
                // Tie-breaker: Longer duration wins?
                if (duration > bestSegment.duration) {
                    bestSegment = { start: event.time, end: nextTime, overlap: currentOverlap, duration };
                }
            }
        }
    }

    // Fallback: If max overlap is only 1 (no overlaps), default Core to Total Range
    // The requirement says: "If no distinct overlap exists... default coreRange to the same as totalRange"
    if (maxOverlap <= 1) {
        return { totalRange, coreRange: totalRange };
    }

    return {
        totalRange,
        coreRange: { start: bestSegment.start, end: bestSegment.end }
    };
}
