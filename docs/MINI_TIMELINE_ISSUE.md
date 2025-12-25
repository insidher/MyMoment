# Mini Timeline Missing in Plaza & Profile Views

## Problem Statement

The mini timeline visualization (gray track bar with orange moment segment) appears in the **Listening Room** but is missing in the **Plaza** and **Profile** views, even though all three views use the same `MomentCard` component.

## Current Behavior

### Listening Room (Working ✅)
- Shows mini timeline with:
  - Gray track bar representing full song duration
  - Orange segment showing the moment's position (e.g., 0:45 → 1:58 on a 4:13 track)
  - Time labels (0:00 and track duration)
  - Orange pill button with moment timestamps

### Plaza & Profile (Not Working ❌)
- Only shows the orange pill button with timestamps
- No gray track bar
- No visual representation of where the moment sits in the song

## Architecture Analysis

### Component Usage
All three views use `MomentCard` component:

**Plaza (`app/explore/page.tsx` - line 121):**
```tsx
<MomentCard
    key={moment.id}
    moment={moment}
    trackDuration={moment.trackSource?.durationSec}
    showDelete={false}
/>
```

**Profile (`app/profile/page.tsx` - lines 139, 161):**
```tsx
<MomentCard
    key={moment.id}
    moment={moment}
    trackDuration={moment.trackSource?.durationSec || 0}
    onDelete={handleDelete}
    onPlayFull={(m) => router.push(`/room/view?url=${encodeURIComponent(m.sourceUrl)}`)}
    onPlayMoment={(m) => router.push(`/room/view?url=${encodeURIComponent(m.sourceUrl)}&start=${m.startSec}&end=${m.endSec}`)}
/>
```

**Listening Room (`app/room/[id]/page.tsx` - line 1195-1199):**
```tsx
<MomentGroup
    key={group.main.id}
    mainMoment={group.main}
    replies={group.replies}
    trackDuration={group.main.trackSource?.durationSec || (isSpotify ? spotifyProgress.duration : playbackState.duration)}
    // ... other props
/>
```

Note: `MomentGroup` wraps `MomentCard` internally and passes through the `trackDuration` prop.

### The Critical Difference

**Listening Room has a fallback:**
```typescript
trackDuration={
    group.main.trackSource?.durationSec || 
    (isSpotify ? spotifyProgress.duration : playbackState.duration)
}
```

If `trackSource.durationSec` is missing, it falls back to the **active player's duration**.

**Plaza & Profile have no fallback:**
```typescript
trackDuration={moment.trackSource?.durationSec}  // undefined if not in DB
```

## MomentCard Logic

The mini timeline is conditionally rendered in `MomentCard.tsx` (line 390):

```tsx
const showMiniTimeline = trackDuration && trackDuration > 0;

// ...

{showMiniTimeline ? (
    <div className="space-y-1.5">
        {/* Gray Track Bar */}
        <div className="h-1.5 w-full bg-white/5 rounded-full relative overflow-hidden ring-1 ring-white/5">
            {/* Orange Moment Segment */}
            <div
                className="absolute inset-y-0 rounded-full bg-orange-500"
                style={{
                    left: `${startPercent}%`,
                    width: `${Math.max(1, widthPercent)}%`
                }}
            />
        </div>
        {/* Time Labels */}
        <div className="flex justify-between text-[10px] text-white/30">
            <span>0:00</span>
            <span>{formatTime(trackDuration!)}</span>
        </div>
    </div>
) : (
    // Fallback: Just show the pill button
)}
```

## Root Cause

The `trackSource` table is not being populated when moments are created.

**Evidence from `app/api/moments/route.ts` (lines 41-53):**
```typescript
const momentData = {
    user_id: user.id,
    resource_id: body.sourceUrl,
    platform: service,
    track_source_id: null,  // ⚠️ Not creating trackSource!
    start_time: body.startSec,
    end_time: body.endSec,
    note: body.note || null,
    title: body.title || 'Unknown Title',
    artist: body.artist || 'Unknown Artist',
    artwork: body.artwork || null,
    saved_by_count: 1,
};
```

The API sets `track_source_id: null` and doesn't create a `trackSource` record with the duration.

## Database Schema

**`moments` table:**
- `id`, `user_id`, `resource_id`, `platform`
- `track_source_id` (foreign key to `track_sources`)
- `start_time`, `end_time`, `note`
- `title`, `artist`, `artwork`
- `like_count`, `saved_by_count`
- `created_at`, `updated_at`

**`track_sources` table:**
- `id`, `service`, `source_url`
- `title`, `artist`, `artwork`
- `duration_sec` ⭐ (This is what we need!)
- `canonical_track_id`
- `created_at`, `updated_at`

## Data Flow

When fetching moments, the queries join with `track_sources`:

```typescript
// From app/explore/actions.ts
const { data: moments } = await supabase
    .from('moments')
    .select(`
        *,
        profiles!user_id (name, image),
        likes (user_id)
    `)
    .order('created_at', { ascending: false });
```

**Note:** The query doesn't include `track_sources` join! So `moment.trackSource` is always undefined.

## Questions for Gemini

1. **Should we create `track_sources` records when saving moments?**
   - Pros: Centralized track metadata, deduplication
   - Cons: More complex save logic, potential race conditions

2. **Should we store `duration_sec` directly on the `moments` table?**
   - Pros: Simpler queries, guaranteed data availability
   - Cons: Denormalization, data duplication

3. **Should we add the `track_sources` join to the queries?**
   - Current queries don't join with `track_sources` table
   - Need to add: `track_sources!track_source_id (duration_sec, ...)`

4. **What's the best approach to backfill existing moments?**
   - Many moments already exist without `track_source_id`
   - How do we populate duration for existing data?

## Desired Outcome

All moment cards should display the mini timeline consistently across:
- ✅ Plaza (explore feed)
- ✅ Profile page (user's moments)
- ✅ Listening room (already working)

The timeline should show:
- Gray bar representing full track duration
- Orange segment showing moment position
- Time labels (0:00 and track duration)

## Current Code Files

- **MomentCard component**: `src/components/MomentCard.tsx`
- **Plaza page**: `app/explore/page.tsx`
- **Profile page**: `app/profile/page.tsx`
- **Listening room**: `app/room/[id]/page.tsx`
- **Data fetching**: `app/explore/actions.ts`
- **Moment creation API**: `app/api/moments/route.ts`
- **Database types**: `src/types/supabase.ts`

## Tech Stack

- **Framework**: Next.js 15
- **Database**: Supabase (PostgreSQL)
- **ORM**: Direct Supabase client (migrated from Prisma)
- **Frontend**: React with TypeScript
