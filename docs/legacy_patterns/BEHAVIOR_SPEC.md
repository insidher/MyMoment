# Legacy Behavior & Interaction Spec

## 1. The Visuals (Overlay Logic)

### Main Player Container
- **YouTube**:
  - Uses `react-youtube` library.
  - `iframeClassName="w-full h-full rounded-xl"`
  - Container: `glass-panel p-1 overflow-hidden aspect-video relative bg-black`.
  - No explicit high `z-index`, sits in standard flow.

- **Spotify**:
  - Uses `div#spotify-embed` which gets populated by the IFrame API.
  - Container: `relative w-full h-full`.
  - **Overlays**:
    - **Reloading Banner**: `absolute top-0 left-0 right-0 z-[60]`. (Red banner "Refreshing...")
    - **"Hot Engine" Mask**: `absolute inset-0 z-50 bg-black/90`. (Black overlay with loading spinner). Used to hide user seek operations during "warm up".

### PlayerTimeline (The Tracker)
The visual timeline that shows progress and moments.
- **Container**: `space-y-2 relative`.
- **Track (Glass Panel)**: `glass-panel px-4 py-3 ... relative group/timeline`.
  - `relative` positioning establishes stacking context.
- **Progress Bar (Green)**:
  - `absolute inset-0 rounded-full overflow-hidden bg-white/10`.
  - Inner Bar: `relative z-0`.
- **Moment Segments (Orange Pills)**:
  - `absolute top-1/2 -translate-y-1/2 h-4 ... z-10`.
  - **Active Moment**: `z-30 overflow-hidden` (pops above others).
  - **Styles**: `bg-orange-500` (inactive) vs `bg-orange-500 border border-yellow-400` (active).
  - **Inner Progress**: White overlay `bg-white/30` showing progress relative to that specific moment.
- **Inline Capture Button**:
  - `absolute top-1/2 left-1/2 ... z-20`.
  - Appears on hover (after 500ms delay) OR if `captureState === 'start-captured'`.
  - Centered relative to the timeline track.

## 2. The Engine (Tracker & Playback)

### Synchronization (The "Tick")
- **YouTube**:
  - **Polling**: Uses `setInterval` running every **500ms** (Line 180).
  - **Logic**: calls `youtubePlayer.getCurrentTime()` and `getDuration()`.
  - **State Update**: Updates `playbackState { current, duration }` only if values change significantly (integer floor).

- **Spotify**:
  - **Event Driven**: Uses `EmbedController.addListener('playback_update', ...)` (Line 237).
  - **Logic**: update event provides `position` and `duration` in ms.
  - **State Update**: Updates `spotifyProgress` and `playbackState` (converting ms to seconds).
  - **Ref**: Updates `spotifyTimeRef.current` for synchronous access during capture.

### "Capture Moment" Logic
- **Trigger**: `handleSmartCapture()` function.
- **Time Source**:
  - **YouTube**: `youtubePlayer.getCurrentTime()`.
  - **Spotify**: `spotifyTimeRef.current` (The latest value from the event listener).
- **State Machine (`captureState`)**:
  1.  **Idle** -> Click "Mark Start" -> Set `startSec`, State -> `start-captured`.
  2.  **Start Captured** -> Click "Mark End" -> Check validity (> start, < 60s) -> Set `endSec`, State -> `end-captured`.
  3.  **End Captured** -> Click "Reset" -> Clear start/end, State -> `idle`.
- **Preview Mode**: When `end-captured`, shows a "Preview Chip" with time range and note input.

## 3. The "Glue" (Component Communication)

### Data Flow
- **Central State**: `app/room/[id]/page.tsx` holds ALL truth (`playbackState`, `moments`, `captureState`).
- **Props**: Passes everything down to `PlayerTimeline`.
  - `currentTime`, `duration`, `moments`
  - `onSeek`, `onMomentClick`
  - `captureState`, `onSmartCapture`

### Player Control Glue
- **Playing Moments**:
  - **YouTube**: `player.seekTo(start)` -> `player.playVideo()`.
  - **Spotify "Hot Engine" Hack**:
    1.  `setIsSeekingToStart(true)` (Show overlay).
    2.  `player.play()` (Warm up engine).
    3.  `setTimeout(1000)` -> `player.seek(start)`.
    4.  `setTimeout(500)` -> `setIsSeekingToStart(false)` (Hide overlay).
- **Moment Playback Supervisor**:
  - `useEffect` (Line 468) runs every **100ms** to check if `currentTime >= moment.endSec`.
  - **Auto-Stop**: Pauses player if end reached.
  - **Fades (YouTube only)**: Manually sets volume 0->100 and 100->0 based on time.

### Legacy Hacks to Preserve
1.  **"Hot Engine" Strategy**: The exact sequence of play -> wait -> seek -> wait is critical for Spotify Embed reliability.
2.  **Auto-Heal Duration**: If duration is 0 locally but player knows it, it POSTs to `/api/tracks/update-duration` (Line 532).
3.  **One-time Auto-Refresh**: Uses `sessionStorage` to force a reload once for Spotify (Line 199).
