-- =====================================================
-- Enable Real-time for Chat System Tables (Safe Version)
-- =====================================================
-- Run this script in your Supabase SQL Editor to enable
-- real-time subscriptions for the chat system
-- This version only adds tables that aren't already enabled
-- =====================================================

-- Enable realtime for chat tables (only if not already enabled)
DO $$
BEGIN
    -- Add conversations table if not already in publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'conversations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
        RAISE NOTICE 'Added conversations table to realtime publication';
    ELSE
        RAISE NOTICE 'conversations table already in realtime publication';
    END IF;

    -- Add messages table if not already in publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE messages;
        RAISE NOTICE 'Added messages table to realtime publication';
    ELSE
        RAISE NOTICE 'messages table already in realtime publication';
    END IF;

    -- Add message_reactions table if not already in publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'message_reactions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
        RAISE NOTICE 'Added message_reactions table to realtime publication';
    ELSE
        RAISE NOTICE 'message_reactions table already in realtime publication';
    END IF;

    -- Add user_presence table if not already in publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'user_presence'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;
        RAISE NOTICE 'Added user_presence table to realtime publication';
    ELSE
        RAISE NOTICE 'user_presence table already in realtime publication';
    END IF;

    -- Add conversation_participants table if not already in publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'conversation_participants'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;
        RAISE NOTICE 'Added conversation_participants table to realtime publication';
    ELSE
        RAISE NOTICE 'conversation_participants table already in realtime publication';
    END IF;
END $$;

-- Verify realtime is enabled for all chat tables
SELECT 
    tablename,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND pg_publication_tables.tablename = pg_tables.tablename
        ) THEN '✅ Enabled'
        ELSE '❌ Not Enabled'
    END as realtime_status
FROM pg_tables 
WHERE tablename IN ('conversations', 'messages', 'message_reactions', 'user_presence', 'conversation_participants')
AND schemaname = 'public'
ORDER BY tablename;
