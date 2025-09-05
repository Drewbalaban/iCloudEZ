-- =====================================================
-- CloudEZ Professional Chat System Database Schema
-- =====================================================
-- This schema creates a comprehensive, scalable chat system
-- with real-time messaging, emoji reactions, file sharing,
-- and professional features comparable to Discord/Slack
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- ENUM TYPES FOR CHAT SYSTEM
-- =====================================================

-- Message types for different content
CREATE TYPE message_type AS ENUM (
    'text',
    'image',
    'file',
    'system',
    'reply',
    'forward'
);

-- Message status for delivery tracking
CREATE TYPE message_status AS ENUM (
    'sending',
    'sent',
    'delivered',
    'read',
    'failed'
);

-- Conversation types
CREATE TYPE conversation_type AS ENUM (
    'direct',
    'group'
);

-- User presence status
CREATE TYPE presence_status AS ENUM (
    'online',
    'away',
    'busy',
    'offline'
);

-- Notification preferences
CREATE TYPE notification_type AS ENUM (
    'all',
    'mentions',
    'none'
);

-- =====================================================
-- CORE CHAT TABLES
-- =====================================================

-- Conversations table (both direct messages and group chats)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT, -- For group chats, NULL for direct messages
    description TEXT, -- For group chats
    type conversation_type NOT NULL DEFAULT 'direct',
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    avatar_url TEXT, -- For group chats
    is_active BOOLEAN DEFAULT TRUE,
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT conversation_name_length CHECK (
        (type = 'group' AND char_length(name) >= 1 AND char_length(name) <= 100) OR
        (type = 'direct' AND name IS NULL)
    ),
    CONSTRAINT conversation_description_length CHECK (char_length(description) <= 500)
);

-- Conversation participants (who can see and participate in conversations)
CREATE TABLE IF NOT EXISTS conversation_participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT DEFAULT 'member', -- 'admin', 'moderator', 'member'
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notification_preference notification_type DEFAULT 'all',
    is_muted BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    
    -- Constraints
    CONSTRAINT valid_role CHECK (role IN ('admin', 'moderator', 'member')),
    CONSTRAINT unique_participant UNIQUE (conversation_id, user_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    message_type message_type DEFAULT 'text',
    status message_status DEFAULT 'sent',
    
    -- For replies and forwards
    reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    forward_from_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    
    -- File attachments
    attachment_url TEXT,
    attachment_name TEXT,
    attachment_size BIGINT,
    attachment_mime_type TEXT,
    
    -- Message metadata
    metadata JSONB, -- For emoji reactions, mentions, etc.
    edited_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT content_not_empty CHECK (char_length(trim(content)) > 0 OR message_type != 'text'),
    CONSTRAINT attachment_size_positive CHECK (attachment_size IS NULL OR attachment_size > 0),
    CONSTRAINT attachment_size_limit CHECK (attachment_size IS NULL OR attachment_size <= 1073741824), -- 1GB limit
    CONSTRAINT no_self_reply CHECK (reply_to_id IS NULL OR reply_to_id != id),
    CONSTRAINT no_self_forward CHECK (forward_from_id IS NULL OR forward_from_id != id)
);

-- Message reactions (emoji reactions on messages)
CREATE TABLE IF NOT EXISTS message_reactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    emoji TEXT NOT NULL, -- Unicode emoji or custom emoji ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT emoji_not_empty CHECK (char_length(emoji) > 0),
    CONSTRAINT unique_user_reaction UNIQUE (message_id, user_id, emoji)
);

-- Message read receipts (who has read which messages)
CREATE TABLE IF NOT EXISTS message_read_receipts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_read_receipt UNIQUE (message_id, user_id)
);

-- User presence (online status, typing indicators)
CREATE TABLE IF NOT EXISTS user_presence (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status presence_status DEFAULT 'offline',
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_typing BOOLEAN DEFAULT FALSE,
    typing_in_conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    custom_status TEXT, -- Custom status message
    device_info JSONB, -- Device/browser info
    
    -- Constraints
    CONSTRAINT custom_status_length CHECK (char_length(custom_status) <= 100),
    CONSTRAINT unique_user_presence UNIQUE (user_id)
);

-- Chat settings per user
CREATE TABLE IF NOT EXISTS chat_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    theme TEXT DEFAULT 'auto', -- 'light', 'dark', 'auto'
    sound_enabled BOOLEAN DEFAULT TRUE,
    desktop_notifications BOOLEAN DEFAULT TRUE,
    show_online_status BOOLEAN DEFAULT TRUE,
    show_read_receipts BOOLEAN DEFAULT TRUE,
    auto_download_media BOOLEAN DEFAULT TRUE,
    message_preview BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_theme CHECK (theme IN ('light', 'dark', 'auto')),
    CONSTRAINT unique_user_settings UNIQUE (user_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Conversations indexes
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON conversations(created_by);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_is_active ON conversations(is_active);

-- Conversation participants indexes
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_last_read_at ON conversation_participants(last_read_at);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_notification_preference ON conversation_participants(notification_preference);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON messages(deleted_at);

-- Message reactions indexes
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON message_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_emoji ON message_reactions(emoji);

-- Message read receipts indexes
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_message_id ON message_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_user_id ON message_read_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_read_at ON message_read_receipts(read_at);

-- User presence indexes
CREATE INDEX IF NOT EXISTS idx_user_presence_user_id ON user_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(status);
CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen ON user_presence(last_seen);
CREATE INDEX IF NOT EXISTS idx_user_presence_is_typing ON user_presence(is_typing);

-- Chat settings indexes
CREATE INDEX IF NOT EXISTS idx_chat_settings_user_id ON chat_settings(user_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_active ON conversation_participants(user_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_sender ON messages(conversation_id, sender_id, created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Conversations policies
CREATE POLICY "Users can view conversations they participate in" ON conversations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversation_participants 
            WHERE conversation_id = conversations.id 
            AND user_id = auth.uid()
            AND is_archived = FALSE
        )
    );

CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update conversations" ON conversations
    FOR UPDATE USING (
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM conversation_participants 
            WHERE conversation_id = conversations.id 
            AND user_id = auth.uid() 
            AND role IN ('admin', 'moderator')
        )
    );

-- Conversation participants policies
CREATE POLICY "Users can view participants in their conversations" ON conversation_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversation_participants cp2
            WHERE cp2.conversation_id = conversation_participants.conversation_id 
            AND cp2.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can join conversations they're invited to" ON conversation_participants
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation" ON conversation_participants
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage participants" ON conversation_participants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM conversation_participants cp2
            WHERE cp2.conversation_id = conversation_participants.conversation_id 
            AND cp2.user_id = auth.uid() 
            AND cp2.role IN ('admin', 'moderator')
        )
    );

-- Messages policies
CREATE POLICY "Users can view messages in their conversations" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversation_participants 
            WHERE conversation_id = messages.conversation_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can send messages to conversations they're in" ON messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM conversation_participants 
            WHERE conversation_id = messages.conversation_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can edit their own messages" ON messages
    FOR UPDATE USING (
        auth.uid() = sender_id AND
        deleted_at IS NULL
    );

CREATE POLICY "Users can delete their own messages" ON messages
    FOR UPDATE USING (auth.uid() = sender_id);

-- Message reactions policies
CREATE POLICY "Users can view reactions on messages they can see" ON message_reactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM messages m
            JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
            WHERE m.id = message_reactions.message_id 
            AND cp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can add reactions to messages they can see" ON message_reactions
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM messages m
            JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
            WHERE m.id = message_reactions.message_id 
            AND cp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can remove their own reactions" ON message_reactions
    FOR DELETE USING (auth.uid() = user_id);

-- Message read receipts policies
CREATE POLICY "Users can view read receipts for messages they can see" ON message_read_receipts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM messages m
            JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
            WHERE m.id = message_read_receipts.message_id 
            AND cp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can mark messages as read" ON message_read_receipts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User presence policies
CREATE POLICY "Users can view presence of their friends" ON user_presence
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM friend_requests fr
            WHERE fr.status = 'accepted' 
            AND (
                (fr.requester = auth.uid() AND fr.recipient = user_presence.user_id) OR
                (fr.recipient = auth.uid() AND fr.requester = user_presence.user_id)
            )
        )
    );

CREATE POLICY "Users can manage their own presence" ON user_presence
    FOR ALL USING (auth.uid() = user_id);

-- Chat settings policies
CREATE POLICY "Users can manage their own chat settings" ON chat_settings
    FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to automatically create chat settings for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_chat_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.chat_settings (user_id)
    VALUES (NEW.id);
    
    INSERT INTO public.user_presence (user_id, status)
    VALUES (NEW.id, 'offline');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update conversation last_message_at
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET last_message_at = NEW.created_at,
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create direct message conversation between two users
CREATE OR REPLACE FUNCTION create_direct_conversation(user1_id UUID, user2_id UUID)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread message count for a user
CREATE OR REPLACE FUNCTION get_unread_message_count(user_id UUID)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(conversation_id UUID, user_id UUID)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to create chat settings for new users
DROP TRIGGER IF EXISTS on_auth_user_created_chat ON auth.users;
CREATE TRIGGER on_auth_user_created_chat
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_chat_settings();

-- Trigger to update conversation last_message_at when new message is inserted
CREATE TRIGGER update_conversation_last_message_trigger
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- Triggers for updated_at
CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_settings_updated_at
    BEFORE UPDATE ON chat_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STORAGE SETUP FOR CHAT FILES
-- =====================================================

-- Storage bucket for chat files (run in Supabase dashboard)
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
-- VALUES ('chat-files', 'chat-files', false, 1073741824, ARRAY['*/*']);

-- =====================================================
-- STORAGE POLICIES FOR CHAT FILES (run in Supabase dashboard)
-- =====================================================

-- Allow users to upload chat files
-- CREATE POLICY "Users can upload chat files" ON storage.objects
-- FOR INSERT WITH CHECK (
--     bucket_id = 'chat-files' AND 
--     auth.uid()::text = (storage.foldername(name))[1]
-- );

-- Allow users to download chat files they have access to
-- CREATE POLICY "Users can download accessible chat files" ON storage.objects
-- FOR SELECT USING (
--     bucket_id = 'chat-files' AND
--     EXISTS (
--         SELECT 1 FROM messages m
--         JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
--         WHERE m.attachment_url = name AND cp.user_id = auth.uid()
--     )
-- );

-- =====================================================
-- REALTIME SUBSCRIPTIONS SETUP
-- =====================================================

-- Enable realtime for chat tables (run in Supabase dashboard)
-- ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
-- ALTER PUBLICATION supabase_realtime ADD TABLE messages;
-- ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
-- ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;
-- ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if tables were created successfully
-- SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%conversation%' OR table_name LIKE '%message%' ORDER BY table_name;

-- Check if RLS is enabled
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%conversation%' OR tablename LIKE '%message%';

-- =====================================================
-- NOTES
-- =====================================================

-- 1. This schema supports both direct messages and group chats
-- 2. Includes comprehensive emoji reaction system
-- 3. Supports file sharing within conversations
-- 4. Includes read receipts and typing indicators
-- 5. Integrates with existing friends system
-- 6. Supports message editing, deletion, and forwarding
-- 7. Includes user presence and status management
-- 8. Comprehensive notification and privacy controls
-- 9. Optimized for real-time performance with proper indexing
-- 10. Follows PostgreSQL and Supabase best practices

-- Run this schema in your Supabase SQL Editor to set up the complete chat system.
