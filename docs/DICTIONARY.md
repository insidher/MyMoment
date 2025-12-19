# MyMoment Architecture Dictionary

**Last Updated**: 2025-12-18  
**Purpose**: Reference document for codebase architecture, migration status, and component naming conventions.

---

## Part 1: Migration Audit (Prisma → Supabase)

### ⚠️ CRITICAL FINDING: Migration Incomplete

**Status**: The application has **dual database access** - Supabase for auth/client queries and Prisma for API writes.

### 🔴 Active Prisma Usage

The following files actively import and use `@prisma/client`:

#### Production Code (Active)
- **`src/lib/prisma.ts`** - Prisma client singleton
- **`app/api/moments/route.ts`** - Primary moments API (POST/GET)
- **`app/actions/moments.ts`** - Server actions for likes/comments

#### Legacy/Scripts (Inactive)
- `scripts/debug_tables.ts`
- `scripts/migrate-legacy-moments.js`
- `scripts/verify_db.js`
- `scripts/verify_db.ts`
- `scripts/check_artists.js`
- `scripts/check-duplicates.ts`
- `scripts/backfill_artists.js`

### ✅ Schema Definition

**Location**: `src/types/supabase.ts`

```typescript
// Generated TypeScript definition for Supabase
export interface Database {
  public: {
    Tables: {
      moments: {
        Row: {
          id: string
          user_id: string
          resource_id: string | null
          platform: string
          track_source_id: string | null
          start_time: number
          end_time: number
          note: string | null
          title: string | null
          artist: string | null
          artwork: string | null
          like_count: number | null
          saved_by_count: number | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          resource_id?: string | null
          platform: string
          track_source_id?: string | null
          start_time: number
          end_time: number
          note?: string | null
          title?: string | null
          artist?: string | null
          artwork?: string | null
          like_count?: number | null
          saved_by_count?: number | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          // Similar structure for partial updates
        }
      }
    }
  }
}
```

**Application Type**: `src/types/index.ts`

```typescript
export interface Moment {
  id: string
  userId?: string
  service: MusicService
  sourceUrl: string
  trackSourceId?: string
  trackSource?: TrackSource
  startSec: number
  endSec: number
  momentDurationSec?: number
  title?: string
  artist?: string
  artwork?: string
  note?: string
  likeCount?: number
  savedByCount?: number
  createdAt: Date
  updatedAt?: Date
  user?: {
    name?: string
    image?: string
  }
}
```

### ✅ Supabase Connection

**Location**: `src/lib/supabase/client.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'

export function createClient() {
    return createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
}
```

**Server Client**: `src/lib/supabase/server.ts` (uses cookies for SSR)

### 🔴 Save Logic (Using Prisma)

**Location**: `app/room/[id]/page.tsx` → calls → `app/api/moments/route.ts`

**Client-side function** (lines 516-594):
```typescript
const handleSave = async () => {
    const payload = {
        sourceUrl: url,
        startSec,
        endSec,
        note,
        title: metadata?.title || 'Unknown Title',
        artist: metadata?.artist || 'Unknown Artist',
        artwork: metadata?.artwork || null,
        service: isSpotify ? 'spotify' : 'youtube',
    };

    const res = await fetch('/api/moments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    // ... handle response
}
```

**API endpoint** (`app/api/moments/route.ts` lines 5-120):
```typescript
export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser(); // ✅ Supabase auth

    // ⚠️ PRISMA WRITE
    const newMoment = await prisma.moment.create({
        data: {
            ...momentData,
            userId: user.id,
        },
        include: {
            trackSource: true,
            user: { select: { full_name: true, avatar_url: true } }
        }
    });
    
    return NextResponse.json({ success: true, moment: newMoment });
}
```

### 📋 Migration Checklist

- [x] Schema defined in `types/supabase.ts`
- [x] Supabase client configured
- [x] Auth migrated to Supabase
- [ ] **Moment creation** - Still uses Prisma
- [ ] **Moment updates** - Uses Prisma (`app/api/moments/[id]/route.ts`)
- [ ] **Likes/Comments** - Uses Prisma (`app/actions/moments.ts`)
- [ ] **Track sources** - Uses Prisma (`lib/trackSource.ts`)
- [ ] Remove `src/lib/prisma.ts`
- [ ] Update CI/CD to remove Prisma dependencies

---

## Part 2: Component Dictionary

### 📄 Pages (Routes)

#### **Home** (`app/page.tsx`)
- **Route**: `/`
- **Purpose**: Landing page with URL input for Spotify/YouTube
- **Key Features**: URL validation, platform detection, Spotify helper widget

#### **Room** (`app/room/[id]/page.tsx`)
- **Route**: `/room/[id]?url=...`
- **Purpose**: Main listening room with moment capture
- **Key Features**: 
  - Dual player (Spotify SDK / YouTube iframe)
  - Timeline capture workflow
  - Moment editor
  - Related content strip
- **Recommended Name**: "The Room" or "Listening Room"

#### **Explore (Plaza)** (`app/explore/page.tsx`)
- **Route**: `/explore`
- **Purpose**: Public feed of moments and artist discovery
- **Key Features**: Moment cards, artist cards, filtering
- **Recommended Name**: "The Plaza"

#### **Profile** (`app/profile/page.tsx`)
- **Route**: `/profile`
- **Purpose**: User's saved moments
- **Key Features**: Personal moment library, stats

#### **Login** (`app/login/page.tsx`)
- **Route**: `/login`
- **Purpose**: Supabase auth redirect handler

---

### 🎯 Core Features

#### **The Player** (Embedded in `app/room/[id]/page.tsx`)
- **Component**: Inline Spotify/YouTube player logic
- **Purpose**: Playback control and state management
- **Key State**: `currentTime`, `duration`, `isPlaying`, `playbackState`

#### **The Timeline** (`src/components/PlayerTimeline.tsx`)
- **Purpose**: Visual timeline with moments, chapters, and capture UI
- **Key Features**:
  - Progress bar with scrubbing
  - Moment markers (pills)
  - Sticky bracket capture
  - Expanded note viewer
  - Edit mode for owners
- **Recommended Name**: "Timeline" or "The Capture Bar"
- **Related**: 943 lines - largest component

#### **Moment Capture System** (Integrated in Timeline + Room)
- **Files**: `PlayerTimeline.tsx` (UI), `app/room/[id]/page.tsx` (state)
- **Purpose**: Interactive moment creation workflow
- **Components**:
  - Start/End markers
  - Sticky bracket (follows mouse)
  - Note editor popover
  - "Set End" label

#### **Moment Card** (`src/components/MomentCard.tsx`)
- **Purpose**: Display individual moments in feeds
- **Features**: Mini-timeline, play button, like/delete, artwork
- **Used In**: Explore, Profile

#### **Moment Group** (`src/components/MomentGroup.tsx`)
- **Purpose**: Display moment with replies (comments)
- **Features**: Main moment + nested reply cards

#### **Related Strip** (`src/components/RelatedStrip.tsx`)
- **Purpose**: Horizontal carousel of related YouTube videos
- **Used In**: Room page

---

### 🎨 UI Elements

#### **Navbar** (`src/components/Navbar.tsx`)
- **Purpose**: Global navigation header
- **Features**: Logo, navigation links, user menu

#### **Settings Sidebar** (`src/components/SettingsSidebar.tsx`)
- **Purpose**: User preferences panel

#### **Artist Card** (`src/components/ArtistCard.tsx`)
- **Purpose**: Artist spotlight in Plaza
- **Features**: Gradient placeholder image, link to filtered view

#### **Track Card** (`src/components/TrackCard.tsx`)
- **Purpose**: Generic track display

#### **Song Card** (`src/components/SongCard.tsx`)
- **Purpose**: Song display variant

#### **MyMoment Icon** (`src/components/icons/MyMomentIcon.tsx`)
- **Purpose**: Brand logo SVG

---

### 🔧 Services & Utilities

#### **Database**
- **`src/lib/supabase/client.ts`** - Browser Supabase client
- **`src/lib/supabase/server.ts`** - Server Supabase client (SSR)
- **`src/lib/prisma.ts`** - ⚠️ Legacy Prisma client

#### **API Routes** (`app/api/`)
- **`moments/route.ts`** - Create/list moments (POST/GET)
- **`moments/[id]/route.ts`** - Update/delete moment (PATCH/DELETE)
- **`metadata/route.ts`** - Fetch track metadata
- **`related/route.ts`** - YouTube related videos
- **`tracks/route.ts`** - Track source operations

#### **Server Actions** (`app/actions/`)
- **`moments.ts`** - Like/unlike, create comments (uses Prisma)

#### **Utilities** (`src/lib/`)
- **`canonical.ts`** - Track ID normalization
- **`chapters.ts`** - YouTube chapter parsing
- **`metadata.ts`** - Track metadata extraction
- **`related.ts`** - YouTube API integration
- **`storage.ts`** - Local storage helpers
- **`trackSource.ts`** - Track source CRUD (uses Prisma)
- **`validation.ts`** - Input validation
- **`youtube.ts`** - YouTube iframe API helpers

---

## Quick Reference: Naming Conventions

When discussing with AI assistant, use these shorthand names:

| Full Name | Shorthand |
|-----------|-----------|
| `app/room/[id]/page.tsx` | "The Room" or "Room Page" |
| `src/components/PlayerTimeline.tsx` | "Timeline" or "The Timeline" |
| `app/explore/page.tsx` | "Plaza" or "Explore" |
| `src/components/MomentCard.tsx` | "Moment Card" |
| Sticky bracket capture UI | "Sticky Bracket" or "Capture Mode" |
| `app/api/moments/route.ts` | "Moments API" |
| `src/lib/supabase/client.ts` | "Supabase Client" |

---

## Next Steps (Post-Audit)

### High Priority
1. **Complete Prisma → Supabase Migration**
   - Migrate `app/api/moments/route.ts` to use Supabase client
   - Migrate `app/actions/moments.ts` (likes/comments)
   - Migrate `lib/trackSource.ts`
   - Remove `src/lib/prisma.ts` after verification

2. **Clean Up Legacy Code**
   - Archive or delete `scripts/` folder
   - Remove Prisma from `package.json` dependencies

### Medium Priority
3. **Component Refactoring**
   - Split `app/room/[id]/page.tsx` (1415 lines) into smaller modules
   - Extract player logic into `useSpotifyPlayer` and `useYouTubePlayer` hooks
   - Consider splitting `PlayerTimeline.tsx` (943 lines) into sub-components

4. **Type Safety**
   - Align `Moment` interface with Supabase schema
   - Generate Supabase types automatically
   - Remove Prisma types

---

**End of Dictionary**
