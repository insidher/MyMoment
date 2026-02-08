// Category Mapping (ID -> Name)
export const CATEGORY_MAP: Record<string, number> = {
    'music': 1,
    'podcast': 2,
    'comedy': 3,
    'educational': 4,
    'gaming': 5,
    'sports': 6,
    'news': 7,
    'technology': 8,
    'entertainment': 9
};

// Reverse mapping for display
export const CATEGORY_name_BY_ID: Record<number, string> =
    Object.entries(CATEGORY_MAP).reduce((acc, [name, id]) => {
        acc[id] = name;
        return acc;
    }, {} as Record<number, string>);
