# Authentication Debugging Lessons Learned

## The Issue
Users were unable to sign up, receiving a generic "Database error saving new user".

## The Investigation
1.  **Frontend Audit**: Verified that the frontend was sending the correct data and not attempting "Double Writes" (race conditions). The frontend was clean.
2.  **Schema Check**: Confirmed that the `profiles` table expected `name` and `image` columns, not `username` or `full_name`.
3.  **Logs & Diagnostics**: The breakthrough came from checking the specific database error log.

## The Root Cause
The `public.profiles` table has a **NOT NULL constraint** on the `updated_at` column.
The `handle_new_user` trigger function was inserting `id`, `email`, `name`, and `image`, but **omitted** `updated_at`.
Consequently, the database rejected the insert with:
`null value in column "updated_at" of relation "profiles" violates not-null constraint`

## The Fix
Explicitly set `updated_at` and `created_at` to `NOW()` in the trigger function.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    name,
    image,
    updated_at,  -- <--- Vital
    created_at
  )
  VALUES (
    new.id::text,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', SPLIT_PART(new.email, '@', 1)),
    '',
    NOW(),       -- <--- The Fix
    NOW()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Preventive Measures
- Always check table constraints (`\d table_name`) when writing raw SQL inserts.
- Ensure all NOT NULL columns (especially timestamps) are handled in `INSERT` statements.
