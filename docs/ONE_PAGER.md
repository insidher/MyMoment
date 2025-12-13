# One Pager: Moments

## **The Mission (Vision)**
**"Capture the feeling."**
To build a **Moment Capture System (MCS)** that establishes a standardized object model for "moments"—specific, user-identified segments of audio/video across *any* service.
*   **The Goal**: A legal, compliant layer over streaming services (YouTube, Spotify, etc.) that aggregates timestamp metadata, not the content itself.
*   **The Loop**: Users mark Start/End $\rightarrow$ System captures integer seconds + Metadata $\rightarrow$ Enriched with official Provider APIs $\rightarrow$ Shared via Deep Links.
*   **The Engine**: A powerful backend that aggregates "saves" to identify the *exact* best part of a song (e.g., "64 users saved 0:45–1:00"), monetizes this data for artists/labels, and uses **AI/LLMs** to analyze user notes ("That bass drop!") to power a recommendation engine ("If you like heavy drops, try this moment").

## **The Reality (Current State)**
We have a functional **Single-Player MVP**.
*   **Core Loop**: Works. You can paste a URL, define a start/end time, and save a "Moment" to a local SQLite database.
*   **Playback**:
    *   **YouTube**: Robust. Uses official IFrame API, supports Seeking, Volume Fading (custom logic), and metadata fetching via Data API.
    *   **Spotify**: Fragile. Uses "Hot Engine" hacks to force-seek the Embed player. Metadata fetching works but is separate logic.
*   **Data Model**:
    *   `Moment` and `TrackSource` tables exist in Prisma.
    *   Basic user auth (`NextAuth`) is installed but "My Moments" / Profile features are barebones.
*   **UI/Vibe**: Strong. "Midnight" glassmorphism aesthetic is implemented and polished.

## **The Gap (Missing Features)**
| Feature | Vision (North Star) | Current Reality (Code) |
| :--- | :--- | :--- |
| **Social/Community** | "Saved by X users", Public Profiles, Deep Links for sharing. | Moments are private/local to the user. No public "view" page for non-logged-in users. No social sharing logic. |
| **Data Intelligence** | Aggregated analytics (Heatmaps of popular segments), Monetizable data reports. | Zero aggregation. Moments are stored individually entirely. No logic to group "overlapping" moments. |
| **Discovery** | AI/LLM Recommendation Engine based on moment notes & sentiment. | Simple "Related Videos" list from YouTube API. No internal recommendation logic. |
| **Cross-Platform** | "Canonical Track ID" mapping identical songs across Spotify/YouTube. | Services are siloed. A YouTube moment doesn't know about its Spotify equivalent. |
| **Compliance** | Strict region locking, age-gating, DRM checks. | Basic IFrame availability checks only. |
| **Mobile** | Native-feeling PWA with deep-link handling. | Responsive web layout, but no deep-linking infrastructure handled. |

---
### **Immediate Recommendation**
Stop building UI polish. Focus on the **Data Intelligence** layer. The core value prop of the vision is *aggregation*—knowing that everyone loves *this specific part*.
1.  **Backfill Canonical IDs**: We need to link YouTube videos to Spotify tracks to aggregate data correctly.
2.  **Implement "SavedBy" Logic**: When a user saves a moment, check if others saved the same range (±2s) and increment a counter.
