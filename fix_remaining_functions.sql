-- =====================================================
-- Fix Remaining Function Search Path Issues
-- =====================================================
-- This script specifically fixes the remaining 2 functions
-- that still have search_path mutable warnings
-- =====================================================

-- Fix 1: get_rate_limit_stats function
-- Force drop and recreate with explicit search_path
DROP FUNCTION IF EXISTS public.get_rate_limit_stats(UUID) CASCADE;
CREATE FUNCTION public.get_rate_limit_stats(p_user_id UUID)
RETURNS TABLE(
    operation_type TEXT,
    current_count INTEGER,
    max_requests INTEGER,
    remaining_requests INTEGER,
    reset_time TIMESTAMP WITH TIME ZONE,
    window_seconds INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rlc.operation_type,
        COALESCE(rll.current_count, 0) as current_count,
        rlc.max_requests,
        GREATEST(0, rlc.max_requests - COALESCE(rll.current_count, 0)) as remaining_requests,
        COALESCE(rll.window_end, date_trunc('hour', NOW()) + interval '1 hour') as reset_time,
        rlc.window_seconds
    FROM rate_limit_config rlc
    LEFT JOIN (
        SELECT 
            operation_type,
            SUM(request_count) as current_count,
            MAX(window_end) as window_end
        FROM rate_limit_logs
        WHERE user_id = p_user_id
            AND window_start >= date_trunc('hour', NOW())
        GROUP BY operation_type
    ) rll ON rlc.operation_type = rll.operation_type
    ORDER BY rlc.operation_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix 2: record_rate_limit_operation function
-- Force drop and recreate with explicit search_path
DROP FUNCTION IF EXISTS public.record_rate_limit_operation(UUID, TEXT) CASCADE;
CREATE FUNCTION public.record_rate_limit_operation(
    p_user_id UUID,
    p_operation_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_config record;
    v_window_start TIMESTAMP WITH TIME ZONE;
    v_window_end TIMESTAMP WITH TIME ZONE;
    v_current_count INTEGER;
BEGIN
    -- Get rate limit configuration
    SELECT * INTO v_config 
    FROM rate_limit_config 
    WHERE operation_type = p_operation_type;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Calculate current window
    v_window_start := date_trunc('hour', NOW());
    v_window_end := v_window_start + make_interval(secs => v_config.window_seconds);
    
    -- Get current count
    SELECT COALESCE(SUM(request_count), 0) INTO v_current_count
    FROM rate_limit_logs
    WHERE user_id = p_user_id
        AND operation_type = p_operation_type
        AND window_start >= v_window_start;
    
    -- Check if limit exceeded
    IF v_current_count >= v_config.max_requests THEN
        RETURN false;
    END IF;
    
    -- Record the operation
    INSERT INTO rate_limit_logs (user_id, operation_type, window_start, window_end)
    VALUES (p_user_id, p_operation_type, v_window_start, v_window_end)
    ON CONFLICT (user_id, operation_type, window_start) 
    DO UPDATE SET 
        request_count = rate_limit_logs.request_count + 1,
        last_request_at = NOW();
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check that the functions now have search_path set
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    p.prosecdef as security_definer,
    p.proconfig as function_config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN (
    'get_rate_limit_stats',
    'record_rate_limit_operation'
)
ORDER BY p.proname;

-- =====================================================
-- NOTES
-- =====================================================

/*
This script specifically targets the 2 remaining functions that still have
search_path mutable warnings:

1. get_rate_limit_stats - Fixed with explicit search_path
2. record_rate_limit_operation - Fixed with explicit search_path

The CASCADE option ensures any dependencies are also handled properly.

After running this script, the database linter should no longer report
search_path mutable warnings for these functions.
*/
