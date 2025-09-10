-- =====================================================
-- Check Real-time Status for Chat Tables
-- =====================================================
-- Run this script to see which tables already have
-- real-time replication enabled
-- =====================================================

-- Check which tables are in the supabase_realtime publication
SELECT 
    schemaname,
    tablename,
    'Already enabled' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename IN ('conversations', 'messages', 'message_reactions', 'user_presence', 'conversation_participants')
ORDER BY tablename;

-- Check which tables exist but are NOT in the publication
SELECT 
    t.schemaname,
    t.tablename,
    'Needs to be enabled' as status
FROM pg_tables t
LEFT JOIN pg_publication_tables p ON t.tablename = p.tablename AND p.pubname = 'supabase_realtime'
WHERE t.schemaname = 'public'
AND t.tablename IN ('conversations', 'messages', 'message_reactions', 'user_presence', 'conversation_participants')
AND p.tablename IS NULL
ORDER BY t.tablename;
