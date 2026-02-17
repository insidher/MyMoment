/**
 * Format a date string into a short relative time string.
 * Examples: "2h", "5d", "1w", "1y"
 */
export function formatRelativeTime(dateString: string | Date): string {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    // Convert to seconds
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    // Handle future dates or clock skew
    if (diffSec < 0) return '0s';
    if (diffSec < 60) return `${diffSec}s`;

    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m`;

    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h`;

    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay}d`;

    const diffWeek = Math.floor(diffDay / 7);
    if (diffWeek < 52) return `${diffWeek}w`;

    const diffYear = Math.floor(diffDay / 365);
    return `${diffYear}y`;
}
