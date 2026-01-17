# MyMoment Architecture Dictionary

**Last Updated**: 2025-12-29
**Purpose**: Reference document for codebase architecture, migration status, and component naming conventions.

---

## Part 1: Migration Audit (Prisma → Supabase)

### ✅ STATUS: Production Migration Complete

**Status**: The core application (`app/`) now exclusively uses **Supabase** for all read/write operations. Prisma remains only in legacy scripts and unused utility files.

### 🗑️ Legacy / Inactive Code (To Be Deleted)

The following files are **candidates for deletion** as they use the legacy Prisma client and are no longer referenced in production:

- **`src/lib/prisma.ts`** - Legacy Prisma client
- **`src/lib/trackSource.ts`** - Legacy track source creation logic (replaced by logic in `moments/route.ts`)
- **`scripts/`** - All scripts in this folder rely on Prisma

### ✅ Active Architecture (Supabase Only)

**Supabase Client**: `src/lib/supabase/client.ts` (Browser) & `src/lib/supabase/server.ts` (Server)

#### Checked & Migrated Files:
- **`app/api/moments/route.ts`**: Fully migrated. Handles moment creation, track source management, and heirarchy flattening directly via Supabase.
- **`app/actions/moments.ts`**: Fully migrated. Handles likes and threaded comments.

### 🗄️ Database Schema (Key Tables)

**`moments` Table**:
- `id`: UUID
- `parent_id`: UUID (Self-reference for Threading)
- `track_source_id`: UUID (Link to metadata)
- `resource_id`: String (URL)
- `platform`: 'spotify' | 'youtube' | 'apple-music'
- `start_time` / `end_time`: Integer (Seconds)
- `moment_duration_sec`: Integer (Cached duration)
- `track_duration_sec`: Integer (Full track length, denormalized)
- `note`: Text (Comment/Caption)

**`track_sources` Table**:
- `id`: UUID
- `source_url`: String (Unique)
- `duration_sec`: Integer (Track length)
- `title`, `artist`, `artwork`: Metadata

---

## Part 2: Component Dictionary

### 📄 Pages (Routes)

#### **Home** (`app/page.tsx`)
- **Route**: `/`
- **Purpose**: Landing page with URL input for Spotify/YouTube.
- **Key Features**: URL validation, platform detection, Spotify login helper.

#### **Room** (`app/room/[id]/page.tsx`)
- **Route**: `/room/[id]?url=...`
- **Purpose**: Main listening room with moment capture.
- **Key Features**:
  - Dual player (Spotify SDK / YouTube iframe)
  - **Timeline Clustering**: Visual grouping of overlapping moments.
  - **Threading**: Creating and viewing replies to moments.
  - Related content strip.
- **Recommended Name**: "The Room" or "Listening Room"

#### **Explore (Plaza)** (`app/explore/page.tsx`)
- **Route**: `/explore`
- **Purpose**: Public feed of moments ("The Plaza").
- **Key Features**: Moment cards, artist cards, filtering.

#### **Profile** (`app/profile/page.tsx`)
- **Route**: `/profile`
- **Purpose**: User's library.
- **Key Features**: Saved moments, likes.

---

### 🎯 Core Components

#### **The Timeline** (`src/components/PlayerTimeline.tsx`)
- **Purpose**: Visual timeline for playback, capture, and interaction.
- **Key Features**:
  - **Clustering**: Overlapping moments are grouped into "Timeline Clusters" to prevent UI overcrowding.
  - **Capture UI**: Sticky bracket, "Set Start/End" markers.
  - **Playback Control**: Scrubbing, active segment highlighting.
- **Status**: The most complex component (approx. 1000 lines).

#### **Moment Card** (`src/components/MomentCard.tsx`)
- **Purpose**: Display individual moments in feeds (Plaza, Profile, Lists).
- **Features**:
  - **Mini-Timeline**: Visual progress bar specific to the moment's segment.
  - **Playback**: Inline playback control.
  - **Social**: Like button, Reply button, Share.

#### **Thread Container** (`src/components/MomentGroup.tsx` & `ThreadComment.tsx`)
- **Purpose**: Visualization of conversation threads.
- **Features**:
  - **MomentGroup**: Displays the "Head" moment and its immediate children.
  - **ThreadComment**: Individual reply component.
  - **Logic**: Supports max depth of 3 levels (Head -> Reply -> Nested Reply). Deeper replies are flattened.

#### **Related Strip** (`src/components/RelatedStrip.tsx`)
- **Purpose**: Horizontal carousel of related YouTube videos in the Room.

---

### 🎨 Design & UI Elements

#### **Navbar** (`src/components/Navbar.tsx`)
- **Purpose**: Global header (Logo, Search, User Menu).

#### **Artist Card** (`src/components/ArtistCard.tsx`)
- **Purpose**: Artist spotlight in Plaza.

#### **Icons** (`src/components/icons/*`)
- **Includes**: `MyMomentIcon`, `SocialIcons`, etc.

---

## Part 3: Terminology & Concepts

### Threading Model
- **Head Moment**: The detailed, top-level captured moment.
- **Reply**: A moment created as a response to another moment (has `parent_id`).
- **Flattening**: The logic that forces replies deeper than level 3 to attach to the level 2 parent, keeping the hierarchy shallow.

### Timeline Clustering
- **Cluster**: A visual grouping of moments that overlap in time on the player timeline.
- **Representative**: The specific moment chosen to represent a cluster (usually the first created or highest ranked).
- **"Too Many Pills"**: The UI problem that clustering solves.

### Data Synchronization
- **Mini-Timeline**: The visual representation of a moment's duration relative to the full track.
- **Heal**: The process of fixing missing or incorrect `duration_sec` data in the `track_sources` table.

---

## Next Steps

1. **Legacy Cleanup**:
   - Delete `src/lib/prisma.ts` and `src/lib/trackSource.ts`.
   - Remove `prisma` from `package.json`.
   - Delete `scripts/` folder or migrate useful scripts to TypeScript/Supabase.

2. **Refactoring**:
   - `PlayerTimeline.tsx` is becoming monolithic; consider extracting `ClusterView` or `CaptureOverlay`.
   - `app/room/[id]/page.tsx` contains heavy state management; consider `useRoomState` hook.

3. **Testing**:
   - Verify threaded comments depth limit.
   - Verify cluster expansion/interaction.
