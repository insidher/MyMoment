# Moments Refactor Walkthrough

I have successfully refactored the Moments data model and UX to be more robust, consistent, and future-proof.

## 1. Data Model Changes

### New `TrackSource` Model
I introduced a `TrackSource` model to represent the "base track" (YouTube video or Spotify song) separately from the user's "Moment" snippet. This ensures:
- **Single Source of Truth**: Metadata (title, artist, artwork, duration) is stored once per track.
- **Consistency**: All moments for the same track share the same metadata.
- **Future-Proofing**: We can add track-level features later without duplicating data.

### Updated `Moment` Model
- Linked to `TrackSource` via `trackSourceId`.
- Added `momentDurationSec` (derived from `endSec - startSec`).
- Added `likeCount` for future community features.
- Kept legacy fields for backward compatibility but prioritized `TrackSource` data.

## 2. Backend Improvements

### YouTube Metadata Helper
Updated `src/lib/youtube.ts` to include `getYouTubeVideoMetadata`, which fetches:
- Title
- Channel Title (mapped to Artist)
- High-res Thumbnails
- Full Video Duration (parsed from ISO 8601)

### TrackSource Helper
Created `src/lib/trackSource.ts` with `findOrCreateTrackSource`. This helper:
1. Checks if a `TrackSource` exists.
2. If not, fetches fresh metadata from YouTube (or uses provided Spotify data).
3. Creates the `TrackSource` record.

### API Endpoints
- **POST /api/moments**: Now uses `findOrCreateTrackSource` to link new moments to a track.
- **GET /api/moments**: Returns moments with their associated `TrackSource`.
- **POST /api/moments/[id]/refresh**: New endpoint to force-refresh metadata from the source (YouTube/Spotify).
- **DELETE /api/moments/[id]**: New endpoint to delete moments.

## 3. Frontend Components

### `TrackCard`
A reusable component that displays the base track info:
- Artwork
- Title
- Artist
- Full Duration

### `MomentCard`
A unified card component used across the app (Profile, Listening Room). It composes `TrackCard` and adds:
- **Moment Pill**: Shows start/end time and snippet duration (e.g., "0:40 → 1:05 · 25s").
- **Refresh Button**: Appears if metadata is missing or artwork is broken.
- **Delete Button**: Allows users to remove their moments.
- **Note**: Displays the user's note.

## 4. Page Updates

### Listening Room (`/room/[id]`)
- Updated the "Saved Moments" list to use `MomentCard`.
- Implemented delete functionality.
- Clicking a moment seeks the player (via custom `onClick` handler).

### User Profile (`/profile`)
- Updated "My Moments" grid to use `MomentCard`.
- Implemented delete functionality.

## 5. UI Refinements (Post-Refactor)

### `MomentCard` UX
- **Split Interactions**:
    - Clicking Artwork/Title -> Plays Full Track.
    - Clicking Orange Pill -> Plays Moment Snippet.
- **Visuals**:
    - Moved Moment Pill to the right side to prevent overlap.
    - Added "MOMENT" label for clarity.
    - Removed full-card hover overlay.

### Listening Room Layout
- Wrapped "Saved Moments" list in a `glass-panel` for better visual separation.
- Improved vertical spacing between Player, Metadata, and Moments list.
- Aligned "Moment Details" panel in the right column.

## Verification
- **Metadata**: New moments will automatically fetch and store rich metadata (Channel Name, Duration).
- **Refresh**: Old moments with missing data can be updated via the "Refresh" button on the card.
- **Consistency**: The same card design is used everywhere.
