export interface CategoryDefinition {
    id: number;
    label: string;
    keywords: string[];
}

export const CATEGORIES: Record<number, CategoryDefinition> = {
    1: { id: 1, label: 'Music', keywords: ['official music video', 'official audio', 'lyrics', 'feat.', 'ft.'] },
    2: { id: 2, label: 'Podcast', keywords: ['podcast', 'episode', 'interview'] },
    3: { id: 3, label: 'Comedy', keywords: ['funny', 'standup', 'stand up', 'prank', 'comedy', 'sketch'] },
    4: { id: 4, label: 'Education', keywords: ['lecture', 'tutorial', 'how to', 'lesson'] },
    5: { id: 5, label: 'Gaming', keywords: ['gameplay', 'walkthrough', 'playthrough', 'let\'s play', 'speedrun'] },
    6: { id: 6, label: 'Sports', keywords: ['highlight', 'match', 'game', 'vs', 'championship'] },
    7: { id: 7, label: 'News', keywords: ['news', 'report', 'update', 'breaking'] },
    8: { id: 8, label: 'Technology', keywords: ['review', 'unboxing', 'tech', 'gadget', 'software', 'programming'] },
    9: { id: 9, label: 'Entertainment', keywords: [] }, // Default
    10: { id: 10, label: 'Debate', keywords: ['debate', 'vs', 'argument', 'discussion', 'panel'] },
    11: { id: 11, label: 'Politics', keywords: ['politics', 'government', 'election', 'political', 'congress', 'senate', 'policy', 'speech'] },
};

// Export simple label map for UI components (Dropdowns, Badges)
export const CATEGORY_LABELS: Record<number, string> = Object.fromEntries(
    Object.values(CATEGORIES).map(c => [c.id, c.label])
);

/**
 * Smart mapping helper: finds the best category ID based on text content (title/tags/topics)
 * Returns null if no strong match found (caller should use fallback)
 */
export function findCategoryByMetadata(text: string): number | null {
    const content = text.toLowerCase();

    // Check specific categories with unique keywords
    // Priority order: Debate/Politics > Music > Comedy > Gaming > Sports > Tech

    // Debate (10)
    if (CATEGORIES[10].keywords.some(k => content.includes(k))) return 10;

    // Politics (11)
    if (CATEGORIES[11].keywords.some(k => content.includes(k))) return 11;

    // Music (1)
    if (CATEGORIES[1].keywords.some(k => content.includes(k))) return 1;

    // Comedy (3)
    if (CATEGORIES[3].keywords.some(k => content.includes(k))) return 3;

    // Gaming (5)
    if (CATEGORIES[5].keywords.some(k => content.includes(k))) return 5;

    // Sports (6)
    if (CATEGORIES[6].keywords.some(k => content.includes(k))) return 6;

    // Tech (8)
    if (CATEGORIES[8].keywords.some(k => content.includes(k))) return 8;

    return null;
}
