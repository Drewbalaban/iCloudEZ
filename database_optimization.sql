-- =====================================================
-- CloudEZ Database Performance Optimization Script
-- =====================================================
-- This script addresses the Supabase database linter issues:
-- 1. Adds missing indexes for unindexed foreign keys
-- 2. Removes unused indexes to improve write performance
-- 3. Optimizes database performance based on actual usage patterns
-- =====================================================

-- =====================================================
-- CRITICAL FIXES: Add Missing Foreign Key Indexes
-- =====================================================

-- Fix 1: Add index for messages.forward_from_id foreign key
-- This is critical for performance when querying forwarded messages
CREATE INDEX IF NOT EXISTS idx_messages_forward_from_id 
ON messages(forward_from_id) 
WHERE forward_from_id IS NOT NULL;

-- Fix 2: Add index for user_presence.typing_in_conversation_id foreign key  
-- This is critical for performance when tracking typing indicators
CREATE INDEX IF NOT EXISTS idx_user_presence_typing_in_conversation_id 
ON user_presence(typing_in_conversation_id) 
WHERE typing_in_conversation_id IS NOT NULL;

-- =====================================================
-- PERFORMANCE OPTIMIZATION: Remove Unused Indexes
-- =====================================================

-- Remove unused indexes that are consuming storage and slowing writes
-- These indexes have never been used according to the linter

-- Message read receipts unused indexes
DROP INDEX IF EXISTS idx_message_read_receipts_read_at;

-- User presence unused indexes  
DROP INDEX IF EXISTS idx_user_presence_user_id;
DROP INDEX IF EXISTS idx_user_presence_last_seen;
DROP INDEX IF EXISTS idx_user_presence_is_typing;
DROP INDEX IF EXISTS idx_user_presence_status;

-- Chat settings unused indexes
DROP INDEX IF EXISTS idx_chat_settings_user_id;

-- Rate limiting unused indexes (if rate_limit_logs table exists)
DROP INDEX IF EXISTS idx_rate_limit_logs_user_operation;
DROP INDEX IF EXISTS idx_rate_limit_logs_window;
DROP INDEX IF EXISTS idx_rate_limit_logs_user_window;

-- Profiles unused indexes
DROP INDEX IF EXISTS idx_profiles_email;
DROP INDEX IF EXISTS idx_profiles_created_at;

-- Documents unused indexes
DROP INDEX IF EXISTS idx_documents_user_id;
DROP INDEX IF EXISTS idx_documents_visibility;
DROP INDEX IF EXISTS idx_documents_folder;
DROP INDEX IF EXISTS idx_documents_category;
DROP INDEX IF EXISTS idx_documents_file_size;
DROP INDEX IF EXISTS idx_documents_checksum;
DROP INDEX IF EXISTS idx_documents_user_visibility;

-- File shares unused indexes
DROP INDEX IF EXISTS idx_file_shares_shared_with;

-- User sessions unused indexes
DROP INDEX IF EXISTS idx_user_sessions_token;
DROP INDEX IF EXISTS idx_user_sessions_expires_at;

-- Message read receipts unused indexes
DROP INDEX IF EXISTS idx_message_read_receipts_user_id;

-- Conversations unused indexes
DROP INDEX IF EXISTS idx_conversations_created_by;
DROP INDEX IF EXISTS idx_conversations_last_message_at;
DROP INDEX IF EXISTS idx_conversations_is_active;

-- Conversation participants unused indexes
DROP INDEX IF EXISTS idx_conversation_participants_user_id;
DROP INDEX IF EXISTS idx_conversation_participants_last_read_at;
DROP INDEX IF EXISTS idx_conversation_participants_notification_preference;

-- Messages unused indexes
DROP INDEX IF EXISTS idx_messages_conversation_id;
DROP INDEX IF EXISTS idx_messages_sender_id;
DROP INDEX IF EXISTS idx_messages_created_at;
DROP INDEX IF EXISTS idx_messages_reply_to_id;
DROP INDEX IF EXISTS idx_messages_deleted_at;
DROP INDEX IF EXISTS idx_messages_type;
DROP INDEX IF EXISTS idx_messages_status;

-- Message reactions unused indexes
DROP INDEX IF EXISTS idx_message_reactions_message_id;
DROP INDEX IF EXISTS idx_message_reactions_user_id;
DROP INDEX IF EXISTS idx_message_reactions_emoji;

-- =====================================================
-- STRATEGIC INDEX ADDITIONS
-- =====================================================

-- Add composite indexes for common query patterns that are likely to be used
-- These are based on typical chat application usage patterns

-- Composite index for conversation messages (most common query)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at_composite 
ON messages(conversation_id, created_at DESC) 
WHERE deleted_at IS NULL;

-- Composite index for user's conversations
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_conversation 
ON conversation_participants(user_id, conversation_id, last_read_at);

-- Composite index for unread message tracking
CREATE INDEX IF NOT EXISTS idx_messages_unread_tracking 
ON messages(conversation_id, created_at DESC, sender_id) 
WHERE deleted_at IS NULL;

-- Composite index for user presence queries
CREATE INDEX IF NOT EXISTS idx_user_presence_status_last_seen 
ON user_presence(status, last_seen DESC);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check that foreign key indexes were created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE indexname IN (
    'idx_messages_forward_from_id',
    'idx_user_presence_typing_in_conversation_id'
)
ORDER BY tablename, indexname;

-- Check remaining indexes to ensure we kept the important ones
SELECT 
    schemaname,
    tablename,
    indexname
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('messages', 'user_presence', 'conversations', 'conversation_participants')
ORDER BY tablename, indexname;

-- =====================================================
-- PERFORMANCE MONITORING QUERIES
-- =====================================================

-- Query to monitor index usage after optimization
-- Run this periodically to ensure indexes are being used
SELECT 
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_tup_read DESC;

-- Query to check table sizes after index cleanup
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- =====================================================
-- NOTES AND RECOMMENDATIONS
-- =====================================================

/*
PERFORMANCE IMPROVEMENTS EXPECTED:

1. Foreign Key Indexes Added:
   - messages.forward_from_id: Faster queries for forwarded messages
   - user_presence.typing_in_conversation_id: Faster typing indicator queries

2. Unused Indexes Removed:
   - Reduced storage overhead by ~40+ indexes
   - Faster INSERT/UPDATE/DELETE operations
   - Reduced maintenance overhead

3. Strategic Composite Indexes Added:
   - Optimized for common chat application query patterns
   - Better performance for conversation loading
   - Improved unread message tracking

MONITORING RECOMMENDATIONS:

1. Run the verification queries after applying this script
2. Monitor index usage with pg_stat_user_indexes
3. Watch for any performance regressions in your application
4. Consider adding back specific indexes if you notice slow queries

SAFETY NOTES:

1. This script only removes indexes that were marked as "unused" by the linter
2. The foreign key indexes are critical and should definitely be added
3. Test in a development environment first
4. Consider running during low-traffic periods
5. Keep backups before applying in production

NEXT STEPS:

1. Apply this script to your Supabase database
2. Monitor application performance
3. Run the verification queries to confirm changes
4. Consider running ANALYZE on affected tables to update statistics
*/
