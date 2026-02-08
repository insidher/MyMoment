import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { CATEGORY_MAP } from '@/lib/constants';

// VERSION: 0.1.6
interface SearchResult {
    type: 'moment' | 'video' | 'user' | 'category';
    id: string;
    title: string;
    subtitle: string;
    extra?: string;
    thumbnail: string | null;
    url: string;
    user?: {
        name: string;
        image: string | null;
    };
    service?: string;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    console.log(`[SEARCH API] New request for query: "${query}"`);

    if (!query || query.trim().length === 0) {
        return NextResponse.json({ results: [] });
    }

    const supabase = await createClient();

    try {
        const searchTerm = `%${query.trim()}%`;
        const lowerQuery = query.toLowerCase().trim();

        // 1. Static Category Match
        let categoryMatch: SearchResult | null = null;
        for (const [name, id] of Object.entries(CATEGORY_MAP)) {
            if (name.includes(lowerQuery)) {
                categoryMatch = {
                    type: 'category',
                    id: id.toString(),
                    title: name.charAt(0).toUpperCase() + name.slice(1),
                    subtitle: 'Category',
                    thumbnail: null,
                    url: `/?category=${id}`
                };
                break;
            }
        }

        // 2. Parallel Queries (Removed Direct Video Search D)
        const [usersResult, momentsByNoteResult, momentsBySourceResult] = await Promise.all([
            // Query A: Search users by name
            supabase
                .from('profiles')
                .select('id, name, image')
                .ilike('name', searchTerm)
                .limit(4),

            // Query B: Search moments by note content
            supabase
                .from('moments')
                .select(`
                    id, note, start_time, end_time, resource_id,
                    trackSource:track_sources!inner(id, title, artist, artwork, service),
                    user:profiles(id, name, image)
                `)
                .ilike('note', searchTerm)
                .not('note', 'is', null)
                .limit(10),

            // Query C: Search moments by track source metadata
            supabase
                .from('moments')
                .select(`
                    id, note, start_time, end_time, resource_id,
                    trackSource:track_sources!inner(id, title, artist, artwork, service),
                    user:profiles(id, name, image)
                `)
                .or(`title.ilike.${searchTerm},artist.ilike.${searchTerm}`, { foreignTable: 'track_sources' })
                .limit(10)
        ]);

        const results: SearchResult[] = [];
        const momentMap = new Map<string, any>();

        if (categoryMatch) results.push(categoryMatch);

        // Process Moments (Deduplicated)
        [...(momentsByNoteResult.data || []), ...(momentsBySourceResult.data || [])].forEach((m: any) => {
            if (!momentMap.has(m.id)) {
                momentMap.set(m.id, m);
                results.push({
                    type: 'moment',
                    id: m.id,
                    title: m.trackSource?.title || 'Untitled',
                    subtitle: m.trackSource?.artist || 'Unknown Artist',
                    extra: m.note || '',
                    thumbnail: m.trackSource?.artwork || null,
                    url: `/room/view?url=${encodeURIComponent(m.resource_id)}&start=${m.start_time}&end=${m.end_time}`,
                    user: m.user,
                    service: m.trackSource?.service
                });
            }
        });

        // Process Users
        (usersResult.data || []).forEach((u: any) => {
            results.push({
                type: 'user',
                id: u.id,
                title: u.name || 'Anonymous',
                subtitle: 'User',
                thumbnail: u.image || null,
                url: `/profile/${u.id}`
            });
        });

        return NextResponse.json({
            results: results.slice(0, 4),
            query
        });

    } catch (error) {
        console.error('[SEARCH API] ERROR:', error);
        return NextResponse.json(
            { error: 'Failed to perform search' },
            { status: 500 }
        );
    }
}
