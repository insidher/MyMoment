# Technical Specification

## **Tech Stack**
*   **Framework**: [Next.js 16](https://nextjs.org/) (App Router, React 19)
*   **Language**: TypeScript
*   **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
*   **Database**: Supabase (PostgreSQL)
*   **Authentication**: [Supabase Auth](https://supabase.com/auth)
*   **State Management**: React Hooks (`useState`, `useContext`, `useRef`) + URL Search Params.

## **External APIs**
1.  **YouTube Data API v3**: Used for reliable metadata fetching (Channel name, Titles) to avoid IFrame limitations.
2.  **YouTube IFrame Player API**: For playback control, seeking, and volume management.
3.  **Spotify Embed / IFrame API**: For playing Spotify tracks. *Note: Requires Premium for full playback; relies on "Hot Engine" workarounds for seeking.*

## **Database Schema & Data Model**
*   **`profiles`**: User identity (extends Supabase Auth).
*   **`track_sources`**: Normalized representation of a song/video.
    *   `service` ("youtube" | "spotify")
    *   `source_url` (Unique key)
    *   `duration_sec` (Cached duration)
*   **`moments`**: The core entity.
    *   `start_time` / `end_time`: Timestamps.
    *   `note`: User annotation.
    *   `user_id`: Owner.
    *   `resource_id`: Platform ID.
*   **`likes`**: User likes on moments.

## **Architectural Patterns**
*   **Client-Side Player Logic**: Heavy logic in `app/room/[id]/page.tsx` handling audio synchronization, polling (for YouTube), and cross-service playback normalization.
*   **"Enforcer" / "Supervisor" Pattern**: `useSoundEffects` and `useEffect` hooks in the Room component actively monitor playback time to enforce "Moment" boundaries (auto-pause/fade out).
*   **Optimistic UI**: Immediate UI updates (e.g., "Saved" state) while background fetch syncs to DB.
*   **Hybrid Metadata Fetching**: Tries Server-Side (API Routes) for robust data, falls back to Client-Side (IFrame events) if API keys fail.
