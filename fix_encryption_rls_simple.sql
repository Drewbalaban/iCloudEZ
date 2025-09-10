-- Simple fix for encryption RLS policies
-- This script fixes the most critical issues without conflicts

-- First, let's check what policies exist and drop them safely
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own encryption keys' AND tablename = 'user_encryption_keys') THEN
        DROP POLICY "Users can insert their own encryption keys" ON user_encryption_keys;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own encryption keys' AND tablename = 'user_encryption_keys') THEN
        DROP POLICY "Users can update their own encryption keys" ON user_encryption_keys;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create key exchange requests for their conversations' AND tablename = 'key_exchange_requests') THEN
        DROP POLICY "Users can create key exchange requests for their conversations" ON key_exchange_requests;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage encryption keys for their conversations' AND tablename = 'conversation_encryption_keys') THEN
        DROP POLICY "Users can manage encryption keys for their conversations" ON conversation_encryption_keys;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'System can create encryption notifications' AND tablename = 'encryption_notifications') THEN
        DROP POLICY "System can create encryption notifications" ON encryption_notifications;
    END IF;
END $$;

-- Create new, more permissive policies
CREATE POLICY "Users can insert their own encryption keys" ON user_encryption_keys
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own encryption keys" ON user_encryption_keys
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can create key exchange requests" ON key_exchange_requests
    FOR INSERT WITH CHECK (auth.uid() = initiator_id);

CREATE POLICY "Users can manage encryption keys for their conversations" ON conversation_encryption_keys
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM conversation_participants cp
            WHERE cp.conversation_id = conversation_encryption_keys.conversation_id
            AND cp.user_id = auth.uid()
        )
    );

CREATE POLICY "System can create encryption notifications" ON encryption_notifications
    FOR INSERT WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON user_encryption_keys TO authenticated;
GRANT ALL ON key_exchange_requests TO authenticated;
GRANT ALL ON conversation_encryption_keys TO authenticated;
GRANT ALL ON encryption_notifications TO authenticated;

-- Enable encryption for all existing conversations
UPDATE conversations 
SET is_encrypted = true, 
    encryption_enabled_at = NOW() 
WHERE is_encrypted = false OR is_encrypted IS NULL;

-- Create a simple function to enable encryption
CREATE OR REPLACE FUNCTION enable_encryption_simple(
    p_conversation_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE conversations
    SET is_encrypted = true,
        encryption_enabled_at = NOW()
    WHERE id = p_conversation_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION enable_encryption_simple(UUID) TO authenticated;
