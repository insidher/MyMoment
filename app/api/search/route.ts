import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

interface SearchResult {
    type: 'moment' | 'video' | 'user';
    id: string;
    title: string;
    subtitle: string;
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
        // Clean and sanitize query
        const searchTerm = `%${query.trim()}%`;
        console.log(`[SEARCH API] Using searchTerm: "${searchTerm}"`);

        // Run 3 parallel queries using Promise.all
        // Using Promise.all for speed, but logging results immediately after
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
                    id,
                    note,
                    start_sec,
                    end_sec,
                    source_url,
                    trackSource:track_sources(
                        id,
                        title,
                        artist,
                        artwork,
                        service
                    ),
                    user:profiles(
                        id,
                        name,
                        image
                    )
                `)
                .ilike('note', searchTerm)
                .not('note', 'is', null)
                .limit(10),

            // Query C: Search moments by track source metadata (title OR artist)
            // Using !inner to ensure we only get moments that HAVE a matching track_source
            supabase
                .from('moments')
                .select(`
                    id,
                    note,
                    start_sec,
                    end_sec,
                    source_url,
                    trackSource:track_sources!inner(
                        id,
                        title,
                        artist,
                        artwork,
                        service
                    ),
                    user:profiles(
                        id,
                        name,
                        image
                    )
                `)
                // Correct syntax for filtering nested joined columns in Supabase
                .or(`title.ilike.${searchTerm},artist.ilike.${searchTerm}`, { foreignTable: 'track_sources' })
                .limit(10)
        ]);

        // --- DEBUG LOGGING ---
        console.log(`[SEARCH API] RAW RESULTS:`);
        console.log(` - User results count: ${usersResult.data?.length || 0}`);
        console.log(` - Moment (ByNote) count: ${momentsByNoteResult.data?.length || 0}`);
        console.log(` - Moment (BySource) count: ${momentsBySourceResult.data?.length || 0}`);

        if (momentsByNoteResult.data && momentsByNoteResult.data.length > 0) {
            console.log(`[SEARCH API] Sample Moment (ByNote):`, JSON.stringify(momentsByNoteResult.data[0], null, 2));
        }
        if (momentsBySourceResult.data && momentsBySourceResult.data.length > 0) {
            console.log(`[SEARCH API] Sample Moment (BySource):`, JSON.stringify(momentsBySourceResult.data[0], null, 2));
        }

        if (usersResult.error) console.error('[SEARCH API] User Query Error:', usersResult.error);
        if (momentsByNoteResult.error) console.error('[SEARCH API] ByNote Query Error:', momentsByNoteResult.error);
        if (momentsBySourceResult.error) console.error('[SEARCH API] BySource Query Error:', momentsBySourceResult.error);
        // -----------------------

        // Extract data
        const users = usersResult.data || [];
        const momentsByNote = momentsByNoteResult.data || [];
        const momentsBySource = momentsBySourceResult.data || [];

        // Merge and deduplicate moments
        const momentMap = new Map<string, any>();

        // Add moments from note search
        momentsByNote.forEach((moment: any) => {
            momentMap.set(moment.id, moment);
        });

        // Add moments from source search (won't duplicate if already exists)
        momentsBySource.forEach((moment: any) => {
            if (!momentMap.has(moment.id)) {
                momentMap.set(moment.id, moment);
            }
        });

        // Convert to array
        const uniqueMoments = Array.from(momentMap.values());
        console.log(`[SEARCH API] Total unique moments after merge: ${uniqueMoments.length}`);

        // Format results
        const results: SearchResult[] = [];

        // Add moment results
        uniqueMoments.forEach((moment: any) => {
            results.push({
                type: 'moment',
                id: moment.id,
                title: moment.trackSource?.title || 'Untitled',
                subtitle: moment.note || '',
                thumbnail: moment.trackSource?.artwork || null,
                url: `/room/view?url=${encodeURIComponent(moment.source_url)}&start=${moment.start_sec}&end=${moment.end_sec}`,
                user: moment.user,
                service: moment.trackSource?.service
            });
        });

        // Add user results
        users.forEach((user: any) => {
            results.push({
                type: 'user',
                id: user.id,
                title: user.name || 'Anonymous',
                subtitle: '',
                thumbnail: user.image || null,
                url: `/profile/${user.id}`
            });
        });

        // Final slice for high-quality top 4
        const slicedResults = results.slice(0, 4);
        console.log(`[SEARCH API] Returning ${slicedResults.length} results`);

        return NextResponse.json({
            results: slicedResults,
            query,
            debug: {
                counts: {
                    momentsByNote: momentsByNote.length,
                    momentsBySource: momentsBySource.length,
                    uniqueMoments: uniqueMoments.length,
                    users: users.length
                }
            }
        });

    } catch (error) {
        console.error('[SEARCH API] CRITICAL ERROR:', error);
        return NextResponse.json(
            { error: 'Failed to perform search' },
            { status: 500 }
        );
    }
}
