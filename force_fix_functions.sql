-- =====================================================
-- Force Fix Function Search Path Issues
-- =====================================================
-- This script aggressively fixes the remaining 2 functions
-- by completely removing and recreating them
-- =====================================================

-- Step 1: Check current function signatures
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    p.proconfig as function_config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN ('get_rate_limit_stats', 'record_rate_limit_operation')
ORDER BY p.proname;

-- Step 2: Drop ALL variations of these functions
-- This ensures we get rid of any function with different signatures
DO $$
DECLARE
    func_record RECORD;
BEGIN
    -- Drop get_rate_limit_stats with any signature
    FOR func_record IN 
        SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'get_rate_limit_stats'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS public.get_rate_limit_stats(' || func_record.args || ') CASCADE';
    END LOOP;
    
    -- Drop record_rate_limit_operation with any signature
    FOR func_record IN 
        SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'record_rate_limit_operation'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS public.record_rate_limit_operation(' || func_record.args || ') CASCADE';
    END LOOP;
END $$;

-- Step 3: Recreate get_rate_limit_stats with explicit search_path
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

-- Step 4: Recreate record_rate_limit_operation with explicit search_path
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

-- Step 5: Verify the functions were created correctly
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    p.prosecdef as security_definer,
    p.proconfig as function_config,
    pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN (
    'get_rate_limit_stats',
    'record_rate_limit_operation'
)
ORDER BY p.proname;

-- Step 6: Test the functions work correctly
-- (Uncomment to test)
-- SELECT * FROM public.get_rate_limit_stats('00000000-0000-0000-0000-000000000000'::UUID);
-- SELECT public.record_rate_limit_operation('00000000-0000-0000-0000-000000000000'::UUID, 'test');

-- =====================================================
-- NOTES
-- =====================================================

/*
This script uses a more aggressive approach:

1. First checks what function signatures exist
2. Uses dynamic SQL to drop ALL variations of the functions
3. Recreates them with explicit search_path settings
4. Verifies the functions were created correctly

The dynamic dropping ensures we catch any function variations that might exist
with different parameter types or signatures.

After running this script, wait a few minutes and run the database linter again
to see if the warnings are resolved.
*/
