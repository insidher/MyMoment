-- Create a new private bucket 'avatars'
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Remove redundant "alter table storage.objects enable row level security;" 
-- as it requires owner permissions and is usually already enabled.

-- Drop existing policies to handle re-runs or updates cleanly
drop policy if exists "Avatar images are publicly accessible" on storage.objects;
drop policy if exists "Anyone can upload an avatar" on storage.objects;
drop policy if exists "Anyone can update their own avatar" on storage.objects;
drop policy if exists "Anyone can delete their own avatar" on storage.objects;

-- Policy: Allow public access to view avatars
create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

-- Policy: Allow authenticated users to upload an avatar
create policy "Anyone can upload an avatar"
  on storage.objects for insert
  with check ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

-- Policy: Allow users to update their own avatar
create policy "Anyone can update their own avatar"
  on storage.objects for update
  using ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

-- Policy: Allow users to delete their own avatar
create policy "Anyone can delete their own avatar"
  on storage.objects for delete
  using ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );
