# YouTube API: Capabilities & Chapters

## 1. Current Implementation
Currently, the app primarily uses **Player Data** (via `react-youtube` and `iframe` API).
- **Source**: Directly from the embedded player when it loads.
- **Data Accessed**:
  - Title
  - Author (Channel Name)
  - Thumbnail
  - Duration
- **Limit**: This is "surface level" data availability to ensure fast playback.

## 2. YouTube Data API (What is available?)
By extending our backend `/api/` endpoints, we can access the full **YouTube Data API v3**, which exposes:

- **Snippet**:
  - **Description**: The most critical field for "Chapters".
  - **Tags**: Creator-defined keywords.
  - **CategoryId**: e.g., Music, Education.
  - **PublishedAt**: Upload date.
- **Statistics**: View count, Like count (Social proof).
- **ContentDetails**: Duration (ISO 8601 format), Dimension (2D/3D), Definition (HD/SD).

## 3. The "Chapters" Solution
YouTube **does not** have a specific API field called "Chapters".
Instead, chapters are simply **text timestamps** written in the video description.

**How to implement:**
1. **Fetch Description**: Call the API to get `snippet.description`.
2. **Parse Text**: Use a Regex pattern to find lines starting with timestamps.
   - Example Pattern: `/(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\s+(.+)/`
   - Detects: `0:00 Intro`, `2:43 Guitar Solo`.
3. **Generate Markers**: Convert these parsed timestamps into `seconds` and render them on your timeline.

## Summary
To get chapters, we don't need a "new" API, we just need to fetch the **Video Description** and parse it. This is a very common pattern in video apps.
