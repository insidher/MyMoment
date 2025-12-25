# Profile Username Display Issue

## Problem Statement

User profiles are not displaying usernames on moment cards in the application. The UI shows blank where usernames should appear, even though we have a fallback to "Music Lover".

## Current Architecture

### Database Schema
- **Table**: `profiles`
- **Columns**: `id`, `email`, `name`, `image`, `created_at`, `updated_at`
- **Foreign Key**: `id` references `auth.users(id)`

### Trigger (from schema.sql)
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**NOTE**: The trigger references `full_name` and `avatar_url`, but the actual database columns are `name` and `image`.

### Data Fetching Logic

**Example from `app/explore/actions.ts`:**
```typescript
const { data: moments, error } = await supabase
    .from('moments')
    .select(`
        *,
        profiles!user_id (
            name,
            image
        ),
        likes (
            user_id
        )
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

// Transform data
return moments.map((m: any) => ({
    // ... other fields
    user: {
        name: m.profiles?.name || 'Music Lover',
        image: m.profiles?.image || null
    },
    isLiked: user ? m.likes?.some((like: any) => like.user_id === user.id) : false
}));
```

## What We've Tried

1. ✅ **Fixed column names**: Changed from `full_name`/`avatar_url` to `name`/`image` to match database
2. ✅ **Added fallback**: Changed from 'Anonymous' to 'Music Lover' for visibility
3. ✅ **Verified join syntax**: Using `profiles!user_id` (with exclamation mark for FK join)
4. ❌ **Still not working**: Usernames still appear blank

## Potential Issues

### 1. Profiles Table is Empty
The `profiles` table may not have any records because:
- Users signed up before the trigger was created
- The trigger has a schema mismatch (`full_name` vs `name`)
- The trigger isn't firing at all

### 2. Join Not Working
The Supabase join might be failing silently:
- Foreign key relationship might not be set up correctly
- RLS (Row Level Security) policies might be blocking the join
- The `!` syntax might be incorrect

### 3. Data Not Propagating
The data might exist but not be returned:
- TypeScript types might be interfering
- The `m.profiles` object might be null/undefined
- The mapping logic might have an issue

## Questions for Gemini

1. **How can we debug if the profiles table is empty?**
   - What SQL query should we run to check?
   - How do we verify the trigger is working?

2. **Is the Supabase join syntax correct?**
   - Should we use `profiles!user_id` or `profiles:user_id`?
   - Do we need to specify the foreign key relationship differently?

3. **How do we backfill existing users?**
   - What's the safest way to populate profiles for existing auth.users?
   - Should we fix the trigger first or manually insert?

4. **What's the best debugging approach?**
   - How can we log what `m.profiles` actually contains?
   - Should we test the query directly in Supabase dashboard?

## Current Code Files

- **Data fetching**: `app/explore/actions.ts` (lines 179-230)
- **API endpoint**: `app/api/moments/route.ts` (lines 57-100, 129-176)
- **Database schema**: `supabase/schema.sql` (lines 7-48)
- **TypeScript types**: `src/types/supabase.ts` (profiles definition)

## Expected Behavior

When a moment card is displayed, it should show:
- User's name from `profiles.name` column
- Fallback to "Music Lover" if profile doesn't exist
- User's avatar from `profiles.image` column (if available)

## Actual Behavior

- Username appears completely blank (not even showing "Music Lover")
- Avatar is also missing
- No console errors visible

## Environment

- **Framework**: Next.js 15
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **ORM**: Direct Supabase client (migrated from Prisma)
