export interface Chapter {
    title: string;
    startSec: number;
}

/**
 * Parses YouTube description text to extract chapter timestamps
 * Format examples:
 * 00:00 Intro
 * 2:45 Verse 1
 * 01:15:20 Long Video Chapter
 */
export function parseChapters(description: string): Chapter[] {
    if (!description) return [];

    const lines = description.split('\n');
    const chapters: Chapter[] = [];
    const timestampRegex = /(?:(\d{1,2}):)?(\d{1,2}):(\d{2})/;

    for (const line of lines) {
        // Look for timestamp at start of line
        const match = line.match(timestampRegex);
        if (match) {
            const timeStr = match[0];

            // Calculate seconds
            // match[1] = hours (optional), match[2] = minutes, match[3] = seconds
            // But regex above is slightly loose. Let's act on the captured groups more carefully.
            // Actually, simple split by ':' is robust for 00:00 or 00:00:00
            const parts = timeStr.split(':').map(p => parseInt(p, 10));
            let seconds = 0;

            if (parts.length === 3) {
                // hh:mm:ss
                seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
            } else if (parts.length === 2) {
                // mm:ss
                seconds = parts[0] * 60 + parts[1];
            }

            // Extract title (everything after the timestamp)
            // We use the match index + length to find where the timestamp ended
            let title = line.substring(match.index! + timeStr.length).trim();

            // Clean up separators like "- Intro" or " : Intro"
            title = title.replace(/^[-:.]+\s+/, '');

            if (title && !isNaN(seconds)) {
                chapters.push({ title, startSec: seconds });
            }
        }
    }

    // Sort by time just in case
    return chapters.sort((a, b) => a.startSec - b.startSec);
}

/**
 * efficient helper to find current chapter
 */
export function getCurrentChapter(chapters: Chapter[], currentSec: number): Chapter | null {
    // Find the last chapter that has startSec <= currentSec
    // Since chapters are sorted, we can iterate backwards or use findLast logic

    // Simple iterate forward and keep track
    let current: Chapter | null = null;

    for (const chapter of chapters) {
        if (chapter.startSec <= currentSec) {
            current = chapter;
        } else {
            // Future chapter, stop checking
            break;
        }
    }

    return current;
}
