# Moment Capture Logic: Current State

This document describes the current implementation of moment capturing in the application.

## Overview
Moments are user-defined segments of a track (audio or video) that can be annotated, saved, and shared. The application supports both **Spotify** (via IFrame API) and **YouTube** (via IFrame API).

## 1. Frontend Logic
**File**: `app/room/[id]/page.tsx`

### Context Detection
The application determines the service based on the URL parameter:
- **Spotify**: `url` includes `spotify.com`
- **YouTube**: `url` includes `youtube.com` or `youtu.be`

### Smart Capture
The `handleSmartCapture` function manages interaction with the playback timeline:
1.  **Idle**: First click sets the `startSec` to the current player time. State becomes `start-captured`.
2.  **Start Captured**: Second click sets the `endSec` to the current player time. State becomes `end-captured`.
    *   **Validation**: Ensures `endSec` > `startSec`.

### Saving Logic
When the user clicks "Save Moment":
1.  **Metadata Collection**:
    *   **YouTube**: Fetches reliable metadata (Channel Name, Video Title) via Server-Side YouTube Data API (`/api/metadata` or in `onPlayerReady` via direct fetch if key is present).
    *   **Spotify**: Fetches metadata via `/api/metadata`.
    *   **User Input**: Collects the `note` (annotation).
2.  **Payload Construction**:
    ```typescript
    {
      sourceUrl: string;
      startSec: number;
      endSec: number;
      note: string;
      title: string;
      artist: string;
      artwork: string;
      service: 'spotify' | 'youtube';
      duration: number; // Total track duration
    }
    ```
3.  **API Call**: Sends a `POST` request to `/api/moments`.

## 2. Backend Logic
**File**: `app/api/moments/route.ts`

### Authentication
- Checks for a valid session using `supabase.auth.getUser()`.
- Returns `401 Unauthorized` if not logged in.

### Validation
- Ensures `startSec`, `endSec`, and `sourceUrl` are present.
- Validates `endSec > startSec`.

### Data Persistence Flow
1.  **Track Source Resolution**:
    *   Checks `track_sources` table for an existing entry with the given `sourceUrl`.
    *   **If found**: Reuses the existing `id`.
    *   **If not found**: Creates a new `track_source` entry using the provided metadata (Title, Artist, Artwork, Duration).
2.  **Moment Creation**:
    *   Inserts a new moment into the `moments` table.
    *   Links it to the `track_source_id`.
    *   **No Overlap Check**: Currently, the system simply inserts the new moment. It does **not** check if a similar moment already exists for that user or globally.

### Response
Returns the fully populated moment object, including resolved user profile and track source details, formatted for frontend consumption.

## 3. Database Schema
**File**: `src/types/supabase.ts`

### `track_sources`
Stores unique playable entities (videos/songs) to avoid duplication.
- `id`: UUID (Primary Key)
- `source_url`: String (Unique per service URL)
- `service`: 'spotify' | 'youtube'
- `title`, `artist`, `artwork`, `duration_sec`: Metadata

### `moments`
Stores user-defined segments.
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key to `profiles`/`users`)
- `track_source_id`: UUID (Foreign Key to `track_sources`)
- `resource_id`: String (Redundant copy of source_url for faster lookups)
- `start_time`: Number (Seconds)
- `end_time`: Number (Seconds)
- `note`: Text (User annotation)
- `created_at`: Timestamp
