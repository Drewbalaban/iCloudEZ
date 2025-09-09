-- =====================================================
-- Fix for accepted_friendships SECURITY DEFINER View
-- =====================================================
-- This script specifically addresses the SECURITY DEFINER view issue
-- by completely dropping and recreating the view with explicit security settings
-- =====================================================

-- Step 1: Completely drop the existing view
DROP VIEW IF EXISTS public.accepted_friendships CASCADE;

-- Step 2: Recreate the view with explicit SECURITY INVOKER (default, but explicit)
-- This ensures the view runs with the permissions of the calling user
CREATE VIEW public.accepted_friendships 
WITH (security_invoker = true) AS
  SELECT
    CASE 
      WHEN requester = auth.uid() THEN recipient 
      ELSE requester 
    END as friend_id,
    created_at
  FROM public.friend_requests
  WHERE status = 'accepted' 
    AND (requester = auth.uid() OR recipient = auth.uid());

-- Step 3: Grant appropriate permissions
GRANT SELECT ON public.accepted_friendships TO authenticated;

-- Step 4: Verify the view was created correctly
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname = 'accepted_friendships';

-- Step 5: Check view security settings
SELECT 
    n.nspname as schema_name,
    c.relname as view_name,
    c.relkind,
    CASE 
        WHEN c.reloptions IS NULL THEN 'No options'
        ELSE array_to_string(c.reloptions, ', ')
    END as view_options
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'v' 
AND n.nspname = 'public' 
AND c.relname = 'accepted_friendships';
