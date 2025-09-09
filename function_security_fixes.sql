-- =====================================================
-- CloudEZ Function Security Fixes
-- =====================================================
-- This script fixes function search_path security vulnerabilities
-- by setting explicit search_path for all functions
-- =====================================================

-- =====================================================
-- CHAT SYSTEM FUNCTIONS
-- =====================================================

-- Fix 1: create_direct_conversation function
CREATE OR REPLACE FUNCTION public.create_direct_conversation(user1_id UUID, user2_id UUID)
RETURNS UUID AS $$
DECLARE
    conversation_id UUID;
    existing_conversation_id UUID;
BEGIN
    -- Check if direct conversation already exists
    SELECT c.id INTO existing_conversation_id
    FROM conversations c
    JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
    JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
    WHERE c.type = 'direct'
    AND cp1.user_id = user1_id
    AND cp2.user_id = user2_id
    AND cp1.user_id != cp2.user_id;
    
    IF existing_conversation_id IS NOT NULL THEN
        RETURN existing_conversation_id;
    END IF;
    
    -- Create new direct conversation
    INSERT INTO conversations (type, created_by)
    VALUES ('direct', user1_id)
    RETURNING id INTO conversation_id;
    
    -- Add both users as participants
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES 
        (conversation_id, user1_id),
        (conversation_id, user2_id);
    
    RETURN conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix 2: get_unread_message_count function
CREATE OR REPLACE FUNCTION public.get_unread_message_count(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO unread_count
    FROM messages m
    JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
    LEFT JOIN message_read_receipts mrr ON m.id = mrr.message_id AND mrr.user_id = user_id
    WHERE cp.user_id = user_id
    AND m.sender_id != user_id
    AND m.deleted_at IS NULL
    AND mrr.id IS NULL;
    
    RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix 3: mark_messages_as_read function
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(conversation_id UUID, user_id UUID)
RETURNS void AS $$
BEGIN
    -- Insert read receipts for all unread messages in the conversation
    INSERT INTO message_read_receipts (message_id, user_id)
    SELECT m.id, user_id
    FROM messages m
    LEFT JOIN message_read_receipts mrr ON m.id = mrr.message_id AND mrr.user_id = user_id
    WHERE m.conversation_id = mark_messages_as_read.conversation_id
    AND m.sender_id != user_id
    AND m.deleted_at IS NULL
    AND mrr.id IS NULL;
    
    -- Update participant's last_read_at
    UPDATE conversation_participants
    SET last_read_at = NOW()
    WHERE conversation_participants.conversation_id = mark_messages_as_read.conversation_id
    AND conversation_participants.user_id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix 4: update_conversation_last_message function
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET last_message_at = NEW.created_at,
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix 5: handle_new_user_chat_settings function
CREATE OR REPLACE FUNCTION public.handle_new_user_chat_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.chat_settings (user_id)
    VALUES (NEW.id);
    
    INSERT INTO public.user_presence (user_id, status)
    VALUES (NEW.id, 'offline');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- RATE LIMITING FUNCTIONS
-- =====================================================

-- Fix 6: update_rate_limit_updated_at function
CREATE OR REPLACE FUNCTION public.update_rate_limit_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix 7: reset_user_rate_limits function
DROP FUNCTION IF EXISTS public.reset_user_rate_limits(UUID);
CREATE FUNCTION public.reset_user_rate_limits(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM rate_limit_logs
    WHERE user_id = p_user_id;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix 8: get_rate_limit_stats function
DROP FUNCTION IF EXISTS public.get_rate_limit_stats(UUID);
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

-- Fix 9: handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, email, full_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix 10: cleanup_rate_limit_logs function
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_logs()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM rate_limit_logs
    WHERE window_end < NOW() - interval '24 hours';
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix 11: get_user_rate_limit_status function
DROP FUNCTION IF EXISTS public.get_user_rate_limit_status(UUID);
CREATE FUNCTION public.get_user_rate_limit_status(p_user_id UUID)
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

-- Fix 12: check_rate_limit function
DROP FUNCTION IF EXISTS public.check_rate_limit(UUID, TEXT);
CREATE FUNCTION public.check_rate_limit(
    p_user_id UUID,
    p_operation_type TEXT
)
RETURNS TABLE(
    is_allowed BOOLEAN,
    remaining_requests INTEGER,
    reset_time TIMESTAMP WITH TIME ZONE,
    current_count INTEGER
) AS $$
DECLARE
    v_config record;
    v_current_count INTEGER;
    v_window_start TIMESTAMP WITH TIME ZONE;
    v_window_end TIMESTAMP WITH TIME ZONE;
    v_remaining INTEGER;
    v_reset_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get rate limit configuration
    SELECT * INTO v_config 
    FROM rate_limit_config 
    WHERE operation_type = p_operation_type;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 0, NOW(), 0;
        RETURN;
    END IF;
    
    -- Calculate current window
    v_window_start := date_trunc('hour', NOW());
    v_window_end := v_window_start + make_interval(secs => v_config.window_seconds);
    
    -- Get current count for this user and operation
    SELECT COALESCE(SUM(request_count), 0) INTO v_current_count
    FROM rate_limit_logs
    WHERE user_id = p_user_id
        AND operation_type = p_operation_type
        AND window_start >= v_window_start;
    
    -- Calculate remaining requests
    v_remaining := GREATEST(0, v_config.max_requests - v_current_count);
    v_reset_time := v_window_end;
    
    -- Return result
    RETURN QUERY SELECT 
        v_current_count < v_config.max_requests,
        v_remaining,
        v_reset_time,
        v_current_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix 13: record_rate_limit_operation function
DROP FUNCTION IF EXISTS public.record_rate_limit_operation(UUID, TEXT);
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

-- Fix 14: update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =====================================================
-- PRIVATE SCHEMA FUNCTIONS
-- =====================================================

-- Fix 15: get_all_friendships_for_user function (private schema)
DROP FUNCTION IF EXISTS private.get_all_friendships_for_user(UUID);
CREATE FUNCTION private.get_all_friendships_for_user(p_user_id UUID)
RETURNS TABLE(
    friend_id UUID,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN fr.requester = p_user_id THEN fr.recipient
            ELSE fr.requester
        END as friend_id,
        fr.status,
        fr.created_at
    FROM public.friend_requests fr
    WHERE (fr.requester = p_user_id OR fr.recipient = p_user_id)
    ORDER BY fr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check that all functions now have search_path set
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    p.prosecdef as security_definer,
    p.proconfig as function_config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname IN ('public', 'private')
AND p.proname IN (
    'create_direct_conversation',
    'get_unread_message_count', 
    'mark_messages_as_read',
    'update_conversation_last_message',
    'handle_new_user_chat_settings',
    'update_rate_limit_updated_at',
    'reset_user_rate_limits',
    'get_rate_limit_stats',
    'handle_new_user',
    'cleanup_rate_limit_logs',
    'get_user_rate_limit_status',
    'check_rate_limit',
    'record_rate_limit_operation',
    'update_updated_at_column',
    'get_all_friendships_for_user'
)
ORDER BY n.nspname, p.proname;

-- =====================================================
-- NOTES AND RECOMMENDATIONS
-- =====================================================

/*
SECURITY IMPROVEMENTS IMPLEMENTED:

1. Function Search Path Security:
   - Added SET search_path = public to all functions
   - Prevents search path manipulation attacks
   - Ensures functions use expected schemas

2. Security Best Practices:
   - SECURITY DEFINER functions have explicit search_path
   - Trigger functions have explicit search_path
   - Private schema functions include both public and private schemas

3. Function Categories Fixed:
   - Chat system functions (5 functions)
   - Rate limiting functions (8 functions)
   - Utility functions (2 functions)
   - Private schema functions (1 function)

SECURITY BENEFITS:

1. Prevents Search Path Attacks:
   - Functions can't be tricked into using malicious schemas
   - Explicit schema resolution prevents privilege escalation
   - Consistent behavior across different environments

2. Improved Security Posture:
   - All functions now follow security best practices
   - Reduced attack surface
   - Better compliance with security standards

TESTING RECOMMENDATIONS:

1. Test all function functionality after applying changes
2. Verify chat system still works correctly
3. Check rate limiting functionality
4. Test user registration and profile creation
5. Verify trigger functions work properly

MONITORING:

1. Watch for any function execution errors
2. Monitor application performance
3. Check for any authentication issues
4. Verify all features work as expected

NEXT STEPS:

1. Apply this script to your database
2. Test all affected functionality
3. Monitor for any issues
4. Consider enabling leaked password protection
5. Plan PostgreSQL version upgrade
*/
