-- Fix Row Level Security policies for encryption tables
-- This script makes the encryption system work properly

-- Drop existing policies that are too restrictive
DROP POLICY IF EXISTS "Users can insert their own encryption keys" ON user_encryption_keys;
DROP POLICY IF EXISTS "Users can update their own encryption keys" ON user_encryption_keys;
DROP POLICY IF EXISTS "Users can create key exchange requests for their conversations" ON key_exchange_requests;
DROP POLICY IF EXISTS "Users can manage encryption keys for their conversations" ON conversation_encryption_keys;
DROP POLICY IF EXISTS "System can create encryption notifications" ON encryption_notifications;

-- Create more permissive policies for encryption to work
-- Allow users to insert their own encryption keys
CREATE POLICY "Users can insert their own encryption keys" ON user_encryption_keys
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own encryption keys
CREATE POLICY "Users can update their own encryption keys" ON user_encryption_keys
    FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to create key exchange requests
CREATE POLICY "Users can create key exchange requests" ON key_exchange_requests
    FOR INSERT WITH CHECK (auth.uid() = initiator_id);

-- Allow users to manage encryption keys for conversations they participate in
CREATE POLICY "Users can manage encryption keys for their conversations" ON conversation_encryption_keys
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM conversation_participants cp
            WHERE cp.conversation_id = conversation_encryption_keys.conversation_id
            AND cp.user_id = auth.uid()
        )
    );

-- Allow system to create encryption notifications (needed for key exchange)
CREATE POLICY "System can create encryption notifications" ON encryption_notifications
    FOR INSERT WITH CHECK (true);

-- Grant necessary permissions to authenticated users
GRANT ALL ON user_encryption_keys TO authenticated;
GRANT ALL ON key_exchange_requests TO authenticated;
GRANT ALL ON conversation_encryption_keys TO authenticated;
GRANT ALL ON encryption_notifications TO authenticated;

-- Enable automatic encryption for all new conversations
CREATE OR REPLACE FUNCTION auto_enable_encryption_for_new_conversations()
RETURNS TRIGGER AS $$
BEGIN
    -- Automatically enable encryption for new conversations
    NEW.is_encrypted = true;
    NEW.encryption_enabled_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically enable encryption for new conversations
DROP TRIGGER IF EXISTS trigger_auto_enable_encryption ON conversations;
CREATE TRIGGER trigger_auto_enable_encryption
    BEFORE INSERT ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION auto_enable_encryption_for_new_conversations();

-- Enable encryption for all existing conversations
UPDATE conversations 
SET is_encrypted = true, 
    encryption_enabled_at = NOW() 
WHERE is_encrypted = false OR is_encrypted IS NULL;

-- Create a function to automatically initialize encryption keys for new users
CREATE OR REPLACE FUNCTION auto_initialize_encryption_for_user()
RETURNS TRIGGER AS $$
BEGIN
    -- This will be called when a user signs up
    -- The frontend will handle key generation, but we can prepare the database
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new user registration (if you have a profiles table)
-- DROP TRIGGER IF EXISTS trigger_auto_initialize_encryption ON profiles;
-- CREATE TRIGGER trigger_auto_initialize_encryption
--     AFTER INSERT ON profiles
--     FOR EACH ROW
--     EXECUTE FUNCTION auto_initialize_encryption_for_user();

-- Add a function to get encryption status for a conversation
CREATE OR REPLACE FUNCTION get_conversation_encryption_status_simple(
    p_conversation_id UUID
) RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'is_encrypted', c.is_encrypted,
        'encryption_enabled_at', c.encryption_enabled_at,
        'last_key_rotation', c.last_key_rotation,
        'participant_count', (
            SELECT COUNT(*)
            FROM conversation_participants cp
            WHERE cp.conversation_id = p_conversation_id
        )
    ) INTO result
    FROM conversations c
    WHERE c.id = p_conversation_id;

    RETURN COALESCE(result, '{"is_encrypted": false}'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_conversation_encryption_status_simple(UUID) TO authenticated;

-- Create a simple function to enable encryption (bypasses RLS checks)
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
