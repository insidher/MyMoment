# Roadmap (Reverse Engineered)

## **✅ Complete**
*   **Core Navigation & Landing**: Home page with search/paste functionality.
*   **Room Experience**:
    *   Unified Player interface for YouTube & Spotify.
    *   "Smart Capture" UI (Start -> End -> Note).
    *   Local State management for playback control.
*   **Data Layer**:
    *   Prisma Schema defined (`User`, `Moment`, `TrackSource`).
    *   API Routes for saving/fetching moments (`/api/moments`).
    *   Basic Metadata fetching (YouTube API integration).
*   **UI Components**:
    *   `MomentCard`: Complex interactive component with mini-timeline and "Pill" player.
    *   `RelatedStrip`: Recommendations sidebar.

## **🚧 In Progress / Half-Finished**
*   **Spotify Playback Experience**:
    *   Current implementation uses "Hot Engine" strategies and "Auto-Refresh" hacks to handle Spotify Embed limitations.
    *   Seeking behavior is fragile ("Loading song at moment...").
*   **Authentication & User Profiles**:
    *   `NextAuth` is installed and `User` model exists.
    *   `SessionProvider` is in the tree.
    *   *Gap*: Login/Signup flows need full verification; "My Moments" page likely needs polish.
*   **Data Normalization**:
    *   `Moment` model still carries "Legacy Source tracking" fields (`service`, `sourceUrl`) alongside the new `TrackSource` relation. Migration logic is needed.
*   **Mobile Responsiveness**:
    *   Layouts have `lg:col-span` classes, suggesting desktop-first. Mobile player experience needs verification.

## **⏭️ Recommended Next Steps**
1.  **Stabilize Spotify**: Investigate official Web Playback SDK (premium only) vs. current Embed hacks to improve reliability.
2.  **Finish Identity Layer**: Ensure robust protected routes, a proper "Profile" page, and public vs. private moment visibility.
3.  **Refactor "God Component"**: `app/room/[id]/page.tsx` is very large. Break down playback logic into a custom hook (`usePlayback`) or Context.
4.  **Database Migration**: Write a script to backfill `TrackSource` for all existing `Moment` rows and remove legacy fields to clean up the schema.
5.  **Social Features**: Add "Share" button to Moment Cards (copy link with timestamp parameters).

## **🔬 Planned Optimizations**
*   **Comments Data Model**:
    *   *Finding*: "Comments" are currently implemented as `Moment` records that share the exact timestamp (`startSec`/`endSec`) and `sourceUrl` as the main moment.
    *   *Optimization*: Revisit this structure. While it cleverly avoids a new table, it might become inefficient or confusing as the social model grows. Consider a dedicated `Comments` table or a recursive `parent_id` on the `moments` table for more robust threading.
