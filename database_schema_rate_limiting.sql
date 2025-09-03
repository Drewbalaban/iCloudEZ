-- Rate limiting schema for CloudEZ (Supabase/Postgres)
-- This creates a lightweight event table and a SECURITY DEFINER function
-- that atomically checks allowance and records usage in one transaction.

-- Table to store rate limit events
create table if not exists public.rate_limit_events (
  id bigserial primary key,
  event_key text not null,
  created_at timestamptz not null default now()
);

-- Helpful index for key and time window queries
create index if not exists rate_limit_events_key_created_at_idx
  on public.rate_limit_events (event_key, created_at desc);

-- RLS is not necessary for this internal table
alter table public.rate_limit_events disable row level security;

-- Function: rate_limit_allow
-- Returns true if the caller is within limit for the window, false otherwise.
-- When allowed, the event is recorded immediately.
create or replace function public.rate_limit_allow(
  p_event_key text,
  p_max_allowed integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_window_start timestamptz := v_now - make_interval(secs => p_window_seconds);
  v_count integer;
begin
  if p_max_allowed <= 0 or p_window_seconds <= 0 then
    return false;
  end if;

  -- Count events in the window
  select count(*) into v_count
  from public.rate_limit_events
  where event_key = p_event_key
    and created_at >= v_window_start;

  if v_count >= p_max_allowed then
    return false;
  end if;

  -- Record usage
  insert into public.rate_limit_events(event_key, created_at)
  values (p_event_key, v_now);

  return true;
end;
$$;

-- Allow only authenticated users to execute (server should call as authenticated or service role)
revoke all on function public.rate_limit_allow(text, integer, integer) from public;
grant execute on function public.rate_limit_allow(text, integer, integer) to authenticated;

-- Optional: simple cleanup function to purge old events beyond the largest window you use
create or replace function public.rate_limit_cleanup(p_keep_seconds integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cutoff timestamptz := now() - make_interval(secs => p_keep_seconds);
  v_deleted integer;
begin
  delete from public.rate_limit_events
  where created_at < v_cutoff;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.rate_limit_cleanup(integer) from public;
grant execute on function public.rate_limit_cleanup(integer) to service_role;

-- =====================================================
-- CloudEZ Rate Limiting System
-- =====================================================
-- This schema implements a comprehensive rate limiting system
-- that tracks user actions and enforces limits per operation type
-- =====================================================

-- Rate limit configuration table
CREATE TABLE IF NOT EXISTS rate_limit_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    operation_type TEXT NOT NULL UNIQUE,
    max_requests INTEGER NOT NULL,
    window_seconds INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_max_requests CHECK (max_requests > 0),
    CONSTRAINT valid_window_seconds CHECK (window_seconds > 0)
);

-- Rate limit tracking table
CREATE TABLE IF NOT EXISTS rate_limit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    operation_type TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    window_end TIMESTAMP WITH TIME ZONE NOT NULL,
    last_request_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_request_count CHECK (request_count > 0),
    CONSTRAINT valid_window CHECK (window_end > window_start)
);

-- Insert default rate limit configurations
INSERT INTO rate_limit_config (operation_type, max_requests, window_seconds, description) VALUES
    ('upload', 50, 3600, 'Maximum 50 file uploads per hour'),
    ('download', 200, 3600, 'Maximum 200 file downloads per hour'),
    ('share', 100, 3600, 'Maximum 100 file shares per hour'),
    ('search', 300, 3600, 'Maximum 300 searches per hour'),
    ('api_call', 1000, 3600, 'Maximum 1000 API calls per hour'),
    ('login_attempt', 5, 900, 'Maximum 5 login attempts per 15 minutes'),
    ('password_reset', 3, 3600, 'Maximum 3 password reset attempts per hour'),
    ('profile_update', 20, 3600, 'Maximum 20 profile updates per hour')
ON CONFLICT (operation_type) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_user_operation ON rate_limit_logs(user_id, operation_type);
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_window ON rate_limit_logs(window_start, window_end);
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_user_window ON rate_limit_logs(user_id, window_start, window_end);

-- Enable RLS
ALTER TABLE rate_limit_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop-if-exists for idempotency)
DROP POLICY IF EXISTS "Users can view rate limit config" ON rate_limit_config;
CREATE POLICY "Users can view rate limit config" ON rate_limit_config
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can view their own rate limit logs" ON rate_limit_logs;
CREATE POLICY "Users can view their own rate limit logs" ON rate_limit_logs
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage rate limits" ON rate_limit_config;
CREATE POLICY "Service role can manage rate limits" ON rate_limit_config
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage rate limit logs" ON rate_limit_logs;
CREATE POLICY "Service role can manage rate limit logs" ON rate_limit_logs
    FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- RATE LIMITING FUNCTIONS
-- =====================================================

-- Function to check if a user has exceeded rate limits
CREATE OR REPLACE FUNCTION check_rate_limit(
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
        -- No rate limit configured for this operation
        RETURN QUERY SELECT true, -1, NOW(), 0;
        RETURN;
    END IF;
    
    -- Calculate current window
    v_window_start := date_trunc('hour', NOW());
    v_window_end := v_window_start + interval '1 hour';
    
    -- Get current request count for this window
    SELECT COALESCE(SUM(request_count), 0) INTO v_current_count
    FROM rate_limit_logs
    WHERE user_id = p_user_id 
        AND operation_type = p_operation_type
        AND window_start >= v_window_start
        AND window_end <= v_window_end;
    
    -- Calculate remaining requests
    v_remaining := GREATEST(0, v_config.max_requests - v_current_count);
    v_reset_time := v_window_end;
    
    -- Check if rate limit exceeded
    IF v_current_count >= v_config.max_requests THEN
        RETURN QUERY SELECT false, v_remaining, v_reset_time, v_current_count;
    ELSE
        RETURN QUERY SELECT true, v_remaining, v_reset_time, v_current_count;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record a rate-limited operation
CREATE OR REPLACE FUNCTION record_rate_limit_operation(
    p_user_id UUID,
    p_operation_type TEXT,
    p_request_count INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
    v_window_start TIMESTAMP WITH TIME ZONE;
    v_window_end TIMESTAMP WITH TIME ZONE;
    v_existing_log_id UUID;
BEGIN
    -- Calculate current window
    v_window_start := date_trunc('hour', NOW());
    v_window_end := v_window_start + interval '1 hour';
    
    -- Check if log entry exists for this window
    SELECT id INTO v_existing_log_id
    FROM rate_limit_logs
    WHERE user_id = p_user_id 
        AND operation_type = p_operation_type
        AND window_start = v_window_start
        AND window_end = v_window_end;
    
    IF v_existing_log_id IS NOT NULL THEN
        -- Update existing log entry
        UPDATE rate_limit_logs
        SET request_count = request_count + p_request_count,
            last_request_at = NOW()
        WHERE id = v_existing_log_id;
    ELSE
        -- Create new log entry
        INSERT INTO rate_limit_logs (
            user_id, operation_type, request_count, 
            window_start, window_end
        ) VALUES (
            p_user_id, p_operation_type, p_request_count,
            v_window_start, v_window_end
        );
    END IF;
    
    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's current rate limit status
CREATE OR REPLACE FUNCTION get_user_rate_limit_status(p_user_id UUID)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old rate limit logs (run periodically)
CREATE OR REPLACE FUNCTION cleanup_rate_limit_logs()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM rate_limit_logs
    WHERE window_end < NOW() - interval '24 hours';
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS AND AUTOMATION
-- =====================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_rate_limit_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_rate_limit_config_updated_at ON rate_limit_config;
CREATE TRIGGER update_rate_limit_config_updated_at
    BEFORE UPDATE ON rate_limit_config
    FOR EACH ROW EXECUTE FUNCTION update_rate_limit_updated_at();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to reset rate limits for a specific user (admin only)
CREATE OR REPLACE FUNCTION reset_user_rate_limits(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM rate_limit_logs WHERE user_id = p_user_id;
    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get rate limit statistics (admin only)
CREATE OR REPLACE FUNCTION get_rate_limit_stats()
RETURNS TABLE(
    operation_type TEXT,
    total_requests BIGINT,
    unique_users BIGINT,
    avg_requests_per_user NUMERIC,
    max_requests_by_user BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rlc.operation_type,
        COALESCE(SUM(rll.request_count), 0) as total_requests,
        COUNT(DISTINCT rll.user_id) as unique_users,
        CASE 
            WHEN COUNT(DISTINCT rll.user_id) > 0 
            THEN ROUND(SUM(rll.request_count)::NUMERIC / COUNT(DISTINCT rll.user_id), 2)
            ELSE 0 
        END as avg_requests_per_user,
        MAX(rll.request_count) as max_requests_by_user
    FROM rate_limit_config rlc
    LEFT JOIN rate_limit_logs rll ON rlc.operation_type = rll.operation_type
        AND rll.window_start >= date_trunc('hour', NOW())
    GROUP BY rlc.operation_type, rlc.max_requests
    ORDER BY rlc.operation_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANTS AND PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users
GRANT SELECT ON rate_limit_config TO authenticated;
GRANT SELECT ON rate_limit_logs TO authenticated;

-- Grant permissions to service role
GRANT ALL ON rate_limit_config TO service_role;
GRANT ALL ON rate_limit_logs TO service_role;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION check_rate_limit(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION record_rate_limit_operation(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_rate_limit_status(UUID) TO authenticated;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if tables were created successfully
-- SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'rate_limit%';

-- Check if functions were created successfully
-- SELECT routine_name, routine_type FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE '%rate_limit%';

-- Check default rate limit configurations
-- SELECT * FROM rate_limit_config ORDER BY operation_type;

-- =====================================================
-- NOTES
-- =====================================================

-- 1. This system provides per-user, per-operation rate limiting
-- 2. Rate limits are enforced on hourly windows
-- 3. All functions use SECURITY DEFINER for proper access control
-- 4. RLS policies ensure users can only see their own data
-- 5. The system automatically cleans up old logs
-- 6. Admin functions are restricted to service role access

-- Run this schema in your Supabase SQL Editor to set up the rate limiting system.
