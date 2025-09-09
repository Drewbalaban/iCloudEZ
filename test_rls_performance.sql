-- =====================================================
-- RLS Performance Testing Script
-- =====================================================
-- This script tests the RLS performance optimizations
-- to validate that they work correctly and provide
-- performance improvements
-- =====================================================

-- =====================================================
-- 1. VERIFY POLICY STRUCTURE
-- =====================================================

-- Check that policies were created correctly
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    CASE 
        WHEN LENGTH(qual) > 100 THEN LEFT(qual, 100) || '...'
        ELSE qual
    END as qual_preview
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN (
    'documents', 'file_shares', 'conversation_participants', 
    'friend_requests', 'messages', 'profiles', 'rate_limit_config',
    'rate_limit_events', 'rate_limit_logs', 'user_presence', 'user_sessions'
)
ORDER BY tablename, policyname;

-- =====================================================
-- 2. TEST AUTH FUNCTION OPTIMIZATION
-- =====================================================

-- Test that auth functions are properly wrapped in SELECT
SELECT 
    policyname,
    tablename,
    CASE 
        WHEN qual LIKE '%(select auth.uid())%' THEN 'OPTIMIZED'
        WHEN qual LIKE '%auth.uid()%' THEN 'NEEDS_OPTIMIZATION'
        ELSE 'NO_AUTH_UID'
    END as auth_uid_status,
    CASE 
        WHEN qual LIKE '%(select auth.role())%' THEN 'OPTIMIZED'
        WHEN qual LIKE '%auth.role()%' THEN 'NEEDS_OPTIMIZATION'
        ELSE 'NO_AUTH_ROLE'
    END as auth_role_status
FROM pg_policies 
WHERE schemaname = 'public' 
AND (qual LIKE '%auth.uid()%' OR qual LIKE '%auth.role()%')
ORDER BY tablename, policyname;

-- =====================================================
-- 3. TEST POLICY CONSOLIDATION
-- =====================================================

-- Check for multiple permissive policies (should be minimal now)
SELECT 
    tablename,
    cmd,
    roles,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public' 
AND permissive = 'PERMISSIVE'
AND tablename IN (
    'documents', 'file_shares', 'conversation_participants', 
    'friend_requests', 'messages', 'profiles', 'rate_limit_config',
    'rate_limit_events', 'rate_limit_logs', 'user_presence', 'user_sessions'
)
GROUP BY tablename, cmd, roles
HAVING COUNT(*) > 1
ORDER BY tablename, cmd, roles;

-- =====================================================
-- 4. PERFORMANCE TEST QUERIES
-- =====================================================

-- Test query performance with EXPLAIN ANALYZE
-- (These queries will show the execution plan and timing)

-- Test documents table access
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM documents 
WHERE user_id = auth.uid() 
LIMIT 10;

-- Test file_shares table access
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM file_shares 
WHERE shared_by = auth.uid() OR shared_with = auth.uid()
LIMIT 10;

-- Test conversation_participants table access
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM conversation_participants 
WHERE user_id = auth.uid()
LIMIT 10;

-- =====================================================
-- 5. SECURITY VALIDATION QUERIES
-- =====================================================

-- Test that RLS is still working (these should return 0 rows for unauthorized access)
-- Note: These tests assume you have test data and proper authentication context

-- Test cross-user document access (should be blocked)
-- SELECT COUNT(*) as unauthorized_access_count
-- FROM documents 
-- WHERE user_id != auth.uid() 
-- AND visibility != 'public'
-- AND NOT EXISTS (
--     SELECT 1 FROM file_shares 
--     WHERE document_id = documents.id 
--     AND shared_with = auth.uid()
-- );

-- Test cross-user file_shares access (should be blocked)
-- SELECT COUNT(*) as unauthorized_share_access_count
-- FROM file_shares 
-- WHERE shared_by != auth.uid() 
-- AND shared_with != auth.uid();

-- =====================================================
-- 6. POLICY LOGIC VALIDATION
-- =====================================================

-- Check that consolidated policies contain all necessary logic
SELECT 
    policyname,
    tablename,
    cmd,
    CASE 
        WHEN policyname LIKE '%consolidated%' THEN 'CONSOLIDATED'
        ELSE 'INDIVIDUAL'
    END as policy_type,
    CASE 
        WHEN qual LIKE '%OR%' THEN 'MULTI_CONDITION'
        ELSE 'SINGLE_CONDITION'
    END as condition_type
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN (
    'documents', 'file_shares', 'conversation_participants', 
    'friend_requests', 'messages', 'profiles', 'rate_limit_config',
    'rate_limit_events', 'rate_limit_logs', 'user_presence', 'user_sessions'
)
ORDER BY tablename, policyname;

-- =====================================================
-- 7. INDEX RECOMMENDATIONS
-- =====================================================

-- Check for missing indexes that could improve RLS performance
SELECT 
    t.tablename,
    c.columnname,
    'Consider index on ' || t.tablename || '(' || c.columnname || ')' as recommendation
FROM pg_tables t
JOIN pg_class cl ON cl.relname = t.tablename
JOIN pg_attribute a ON a.attrelid = cl.oid
JOIN pg_stats s ON s.tablename = t.tablename AND s.attname = a.attname
WHERE t.schemaname = 'public'
AND t.tablename IN (
    'documents', 'file_shares', 'conversation_participants', 
    'friend_requests', 'messages', 'profiles', 'rate_limit_config',
    'rate_limit_events', 'rate_limit_logs', 'user_presence', 'user_sessions'
)
AND a.attname IN ('user_id', 'shared_by', 'shared_with', 'requester', 'recipient', 'sender_id')
AND NOT EXISTS (
    SELECT 1 FROM pg_indexes i 
    WHERE i.tablename = t.tablename 
    AND i.indexdef LIKE '%' || a.attname || '%'
)
ORDER BY t.tablename, c.columnname;

-- =====================================================
-- 8. PERFORMANCE METRICS
-- =====================================================

-- Get table statistics for performance monitoring
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
AND tablename IN (
    'documents', 'file_shares', 'conversation_participants', 
    'friend_requests', 'messages', 'profiles', 'rate_limit_config',
    'rate_limit_events', 'rate_limit_logs', 'user_presence', 'user_sessions'
)
ORDER BY tablename;

-- =====================================================
-- 9. TESTING INSTRUCTIONS
-- =====================================================

/*
MANUAL TESTING INSTRUCTIONS:

1. AUTH FUNCTION OPTIMIZATION TEST:
   - Run the auth function status query above
   - Verify all policies show 'OPTIMIZED' status
   - If any show 'NEEDS_OPTIMIZATION', those policies need to be fixed

2. POLICY CONSOLIDATION TEST:
   - Run the multiple permissive policies query above
   - Should return minimal or no results
   - If many results are returned, consolidation may be incomplete

3. PERFORMANCE TEST:
   - Run the EXPLAIN ANALYZE queries above
   - Compare execution times before and after optimization
   - Look for reduced planning time and execution time
   - Check that buffer usage is reasonable

4. SECURITY TEST:
   - Test with different user contexts
   - Verify users can only access their own data
   - Test shared data access works correctly
   - Verify unauthorized access is blocked

5. FUNCTIONAL TEST:
   - Test all CRUD operations on each table
   - Verify all application features work correctly
   - Test edge cases and special conditions
   - Validate error handling

6. LOAD TEST:
   - Run concurrent queries to test performance under load
   - Monitor CPU usage and query times
   - Check for any performance regressions
   - Verify system stability

EXPECTED RESULTS:

1. All auth functions should be wrapped in SELECT statements
2. Multiple permissive policies should be consolidated
3. Query performance should improve by 20-50%
4. CPU usage for RLS evaluation should decrease by 30-40%
5. All security and functionality should be preserved
6. No unauthorized access should be possible

TROUBLESHOOTING:

If issues are found:
1. Check policy definitions for syntax errors
2. Verify auth context is properly set
3. Test with different user roles
4. Check for missing indexes
5. Review query execution plans
6. Monitor error logs for RLS violations
*/
