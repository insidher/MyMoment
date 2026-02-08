import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { CATEGORY_MAP } from '@/lib/constants';

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
    const lowerQuery = query.toLowerCase().trim();
    console.log(`[SEARCH API] Using searchTerm: "${searchTerm}"`);

    // Check for direct category match first
    let categoryMatch: SearchResult | null = null;
    for (const [name, id] of Object.entries(CATEGORY_MAP)) {
        if (name.includes(lowerQuery)) {
            categoryMatch = {
                type: 'category',
                id: id.toString(),
                title: name.charAt(0).toUpperCase() + name.slice(1), // Capitalize
                subtitle: 'Category',
                thumbnail: null,
                url: `/?category=${id}`
            };
            break; // Return first match
        }
    }

    // Run 4 parallel queries using Promise.all (Category is now static check)
    const [usersResult, momentsByNoteResult, momentsBySourceResult, directSourcesResult] = await Promise.all([
        // Query A: Search users by name
        supabase
            .from('profiles')
            .select('id, name, image')
            .ilike('name', searchTerm)
            .limit(4),

        // Query B: Search moments by note content
        // FIXED: Using !inner to ensure we only get moments with valid track data (prevents "Untitled")
        supabase
            .from('moments')
            .select(`
                    id,
                    note,
                    start_time,
                    end_time,
                    resource_id,
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
            .ilike('note', searchTerm)
            .not('note', 'is', null)
            .limit(10),

        // Query C: Search moments by track source metadata (title OR artist)
        // Using !inner to ensure we only get moments that HAVE a matching track_source AND to filter on it
        supabase
            .from('moments')
            .select(`
                    id,
                    note,
                    start_time,
                    end_time,
                    resource_id,
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
            .or(`title.ilike.${searchTerm},artist.ilike.${searchTerm}`, { foreignTable: 'track_sources' })
            .limit(10),

        // Query D: Direct Search on track_sources (for Artist/Title discovery)
        // !inner on moments ensures we ONLY show videos that actually have moments
        supabase
            .from('track_sources')
            .select(`
                    id,
                    title,
                    artist,
                    artwork,
                    service,
                    source_url,
                    moments!inner(
                        id,
                        start_time,
                        end_time
                    )
                `)
            .or(`title.ilike.${searchTerm},artist.ilike.${searchTerm}`)
            .limit(4)
    ]);

    // --- DEBUG LOGGING ---
    console.log(`[SEARCH API] RAW RESULTS:`);
    console.log(` - User results count: ${usersResult.data?.length || 0}`);
    console.log(` - Moment (ByNote) count: ${momentsByNoteResult.data?.length || 0}`);
    console.log(` - Moment (BySource) count: ${momentsBySourceResult.data?.length || 0}`);
    console.log(` - Direct Source count: ${directSourcesResult.data?.length || 0}`);
    console.log(` - Category Match: ${categoryMatch ? categoryMatch.title : 'None'}`);

    if (usersResult.error) console.error('[SEARCH API] User Query Error:', usersResult.error);
    if (momentsByNoteResult.error) console.error('[SEARCH API] ByNote Query Error:', momentsByNoteResult.error);
    if (momentsBySourceResult.error) console.error('[SEARCH API] BySource Query Error:', momentsBySourceResult.error);
    if (directSourcesResult.error) console.error('[SEARCH API] Direct Source Query Error:', directSourcesResult.error);
    // -----------------------

    const results: SearchResult[] = [];
    const momentMap = new Map<string, any>();
    const sourceMap = new Map<string, any>();

    // 1. Process Categories (Top Priority)
    if (categoryMatch) {
        results.push(categoryMatch);
    }

    // 2. Process Moments (Deduplicated)
    const combinedMoments = [...(momentsByNoteResult.data || []), ...(momentsBySourceResult.data || [])];
    combinedMoments.forEach((moment: any) => {
        if (!momentMap.has(moment.id)) {
            momentMap.set(moment.id, moment);

            // Use track source title if available, otherwise fallback
            const title = moment.trackSource?.title || 'Untitled';
            // Subtitle is the Artist
            const subtitle = moment.trackSource?.artist || 'Unknown Artist';
            // Extra is the Note
            const extra = moment.note || '';

            results.push({
                type: 'moment',
                id: moment.id,
                title: title,
                subtitle: subtitle, // Now Artist
                extra: extra,       // Now Note
                thumbnail: moment.trackSource?.artwork || null,
                url: `/room/view?url=${encodeURIComponent(moment.resource_id)}&start=${moment.start_time}&end=${moment.end_time}`,
                user: moment.user,
                service: moment.trackSource?.service
            });
        }
    });

    // 3. Process Direct Sources (Videos/Artists)
    const directSources = directSourcesResult.data || [];
    directSources.forEach((source: any) => {
        if (!sourceMap.has(source.id)) {
            sourceMap.set(source.id, source);
            const firstMoment = source.moments?.[0];
            // Only add if we have valid moments (guaranteed by inner join, but safe check)
            if (firstMoment) {
                results.push({
                    type: 'video',
                    id: source.id,
                    title: source.title || 'Untitled Video',
                    subtitle: source.artist || 'Unknown Artist',
                    thumbnail: source.artwork || null,
                    // FIXED: Use standardized URL with videoId parameter
                    url: `/room/listen?videoId=${source.source_url}`,
                    service: source.service
                });
            }
        }
    });

    // 4. Process Users
    const users = usersResult.data || [];
    users.forEach((user: any) => {
        results.push({
            type: 'user',
            id: user.id,
            title: user.name || 'Anonymous',
            subtitle: '', // Users don't need a subtitle in this context
            thumbnail: user.image || null,
            url: `/profile/${user.id}`
        });
    });

    // Final slice for top 4
    const slicedResults = results.slice(0, 4);
    console.log(`[SEARCH API] Returning ${slicedResults.length} standardized results`);

    return NextResponse.json({
        results: slicedResults,
        query
    });

} catch (error) {
    console.error('[SEARCH API] CRITICAL ERROR:', error);
    return NextResponse.json(
        { error: 'Failed to perform search' },
        { status: 500 }
    );
}
}
