-- =====================================================
-- CloudEZ Database Security Fixes
-- =====================================================
-- This script addresses critical security vulnerabilities identified by Supabase linter:
-- 1. Fixes SECURITY DEFINER view security issue
-- 2. Enables RLS on rate_limit_events table
-- 3. Implements proper security policies
-- =====================================================

-- =====================================================
-- CRITICAL SECURITY FIX 1: Remove SECURITY DEFINER from View
-- =====================================================

-- Drop the problematic SECURITY DEFINER view completely
DROP VIEW IF EXISTS public.accepted_friendships CASCADE;

-- Recreate the view with explicit SECURITY INVOKER (default, but explicit)
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

-- Grant appropriate permissions to the view
GRANT SELECT ON public.accepted_friendships TO authenticated;

-- =====================================================
-- CRITICAL SECURITY FIX 2: Enable RLS on rate_limit_events
-- =====================================================

-- Enable Row Level Security on the rate_limit_events table
ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for rate_limit_events table
-- Policy 1: Service role can manage all rate limit events (for system operations)
DROP POLICY IF EXISTS "Service role can manage rate limit events" ON public.rate_limit_events;
CREATE POLICY "Service role can manage rate limit events" ON public.rate_limit_events
    FOR ALL USING (auth.role() = 'service_role');

-- Policy 2: Authenticated users can only view their own rate limit events
-- (This is optional since rate limiting is typically internal, but good for transparency)
DROP POLICY IF EXISTS "Users can view own rate limit events" ON public.rate_limit_events;
CREATE POLICY "Users can view own rate limit events" ON public.rate_limit_events
    FOR SELECT USING (
        auth.role() = 'service_role' OR
        event_key LIKE auth.uid()::text || '%'
    );

-- Policy 3: Only service role can insert rate limit events
DROP POLICY IF EXISTS "Service role can insert rate limit events" ON public.rate_limit_events;
CREATE POLICY "Service role can insert rate limit events" ON public.rate_limit_events
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Policy 4: Only service role can delete rate limit events (for cleanup)
DROP POLICY IF EXISTS "Service role can delete rate limit events" ON public.rate_limit_events;
CREATE POLICY "Service role can delete rate limit events" ON public.rate_limit_events
    FOR DELETE USING (auth.role() = 'service_role');

-- =====================================================
-- ADDITIONAL SECURITY HARDENING
-- =====================================================

-- Ensure the rate_limit_allow function is properly secured
-- (This should already be in place, but let's verify)
REVOKE ALL ON FUNCTION public.rate_limit_allow(text, integer, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.rate_limit_allow(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_allow(text, integer, integer) TO service_role;

-- Ensure the rate_limit_cleanup function is properly secured
REVOKE ALL ON FUNCTION public.rate_limit_cleanup(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.rate_limit_cleanup(integer) TO service_role;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check that the view was recreated without SECURITY DEFINER
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname = 'accepted_friendships';

-- Check that RLS is enabled on rate_limit_events
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'rate_limit_events';

-- Check RLS policies on rate_limit_events
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'rate_limit_events'
ORDER BY policyname;

-- =====================================================
-- SECURITY TESTING QUERIES
-- =====================================================

-- Test 1: Verify view respects user permissions
-- (Run as different users to ensure they only see their own friendships)
-- SELECT * FROM public.accepted_friendships;

-- Test 2: Verify rate_limit_events RLS policies
-- (These should fail for regular users, succeed for service role)
-- SELECT COUNT(*) FROM public.rate_limit_events;
-- INSERT INTO public.rate_limit_events (event_key) VALUES ('test_key');

-- =====================================================
-- NOTES AND RECOMMENDATIONS
-- =====================================================

/*
SECURITY IMPROVEMENTS IMPLEMENTED:

1. SECURITY DEFINER View Fix:
   - Removed SECURITY DEFINER from accepted_friendships view
   - View now respects user permissions and RLS policies
   - Users can only see their own accepted friendships

2. Rate Limit Events RLS:
   - Enabled RLS on rate_limit_events table
   - Created comprehensive policies for different access levels
   - Service role has full access for system operations
   - Regular users have limited read access to their own events

3. Function Security:
   - Verified rate limiting functions have proper permissions
   - Only authenticated users and service role can execute functions

SECURITY BEST PRACTICES APPLIED:

1. Principle of Least Privilege:
   - Users only have access to data they need
   - Service role has elevated permissions only where necessary

2. Defense in Depth:
   - Multiple layers of security (RLS, function permissions, view permissions)
   - Proper separation of concerns

3. Audit Trail:
   - Rate limiting events are properly secured
   - Access patterns can be monitored

TESTING RECOMMENDATIONS:

1. Test the accepted_friendships view with different users
2. Verify rate limiting still works correctly
3. Test that unauthorized access is properly blocked
4. Monitor for any performance impact

MONITORING:

1. Watch for any authentication errors after applying these changes
2. Monitor rate limiting functionality
3. Check that friend list functionality still works
4. Verify no unauthorized data access

NEXT STEPS:

1. Apply this script to your database
2. Test all affected functionality
3. Monitor for any issues
4. Consider running security audits regularly
*/
