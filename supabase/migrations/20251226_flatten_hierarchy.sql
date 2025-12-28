-- Fix Level 1 Nesting (Grandchildren -> Children)
UPDATE public.moments
SET parent_id = parent_moment.parent_id
FROM public.moments AS parent_moment
WHERE public.moments.parent_id = parent_moment.id
AND parent_moment.parent_id IS NOT NULL;
