-- Enable read access for anon and authenticated users on track_sources
create policy "Enable read access for all users"
on "public"."track_sources"
as permissive
for select
to public
using (true);
