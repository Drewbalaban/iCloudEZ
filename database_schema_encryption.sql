-- =====================================================
-- CloudEZ End-to-End Encryption Database Schema
-- =====================================================
-- This schema extends the existing chat system to support
-- end-to-end encryption with secure key management
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- ENCRYPTION TABLES
-- =====================================================

-- User encryption keys table
-- Stores public keys for each user
CREATE TABLE IF NOT EXISTS user_encryption_keys (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    key_id VARCHAR(255) UNIQUE NOT NULL,
    public_key TEXT NOT NULL, -- Base64 encoded public key
    key_type VARCHAR(50) DEFAULT 'ECDH-P256',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_active_key_per_user UNIQUE (user_id, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- Key exchange requests table
-- Tracks pending key exchange requests between users
CREATE TABLE IF NOT EXISTS key_exchange_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
    initiator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    participant_id VARCHAR(255) NOT NULL, -- Key ID of the participant
    public_key TEXT NOT NULL, -- Base64 encoded public key
    key_id VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_status CHECK (status IN ('pending', 'completed', 'failed'))
);

-- Conversation encryption keys table
-- Stores encrypted conversation keys for each participant
CREATE TABLE IF NOT EXISTS conversation_encryption_keys (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
    key_id VARCHAR(255) NOT NULL,
    encrypted_key TEXT NOT NULL, -- JSON string containing encrypted key data
    participant_id VARCHAR(255) NOT NULL, -- Key ID of the participant
    key_version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- For forward secrecy
    
    -- Constraints
    CONSTRAINT unique_active_key_per_participant UNIQUE (conversation_id, participant_id, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- Encryption notifications table
-- Stores notifications about key exchanges and rotations
CREATE TABLE IF NOT EXISTS encryption_notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type VARCHAR(50) NOT NULL, -- key_exchange, key_rotation, encryption_enabled, etc.
    data JSONB, -- Additional data for the notification
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_notification_type CHECK (type IN ('key_exchange', 'key_rotation', 'encryption_enabled', 'encryption_disabled'))
);

-- =====================================================
-- MODIFY EXISTING TABLES FOR ENCRYPTION SUPPORT
-- =====================================================

-- Add encryption fields to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS encryption_key_id VARCHAR(255);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS encrypted_content TEXT; -- For encrypted messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS encryption_iv TEXT; -- Initialization vector
ALTER TABLE messages ADD COLUMN IF NOT EXISTS encryption_signature TEXT; -- Message signature

-- Add encryption status to conversations table
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS encryption_enabled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_key_rotation TIMESTAMP WITH TIME ZONE;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- User encryption keys indexes
CREATE INDEX IF NOT EXISTS idx_user_encryption_keys_user_id ON user_encryption_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_encryption_keys_key_id ON user_encryption_keys(key_id);
CREATE INDEX IF NOT EXISTS idx_user_encryption_keys_active ON user_encryption_keys(is_active);

-- Key exchange requests indexes
CREATE INDEX IF NOT EXISTS idx_key_exchange_requests_conversation ON key_exchange_requests(conversation_id);
CREATE INDEX IF NOT EXISTS idx_key_exchange_requests_initiator ON key_exchange_requests(initiator_id);
CREATE INDEX IF NOT EXISTS idx_key_exchange_requests_status ON key_exchange_requests(status);
CREATE INDEX IF NOT EXISTS idx_key_exchange_requests_timestamp ON key_exchange_requests(timestamp);

-- Conversation encryption keys indexes
CREATE INDEX IF NOT EXISTS idx_conversation_encryption_keys_conversation ON conversation_encryption_keys(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_encryption_keys_participant ON conversation_encryption_keys(participant_id);
CREATE INDEX IF NOT EXISTS idx_conversation_encryption_keys_active ON conversation_encryption_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_conversation_encryption_keys_expires ON conversation_encryption_keys(expires_at);

-- Encryption notifications indexes
CREATE INDEX IF NOT EXISTS idx_encryption_notifications_conversation ON encryption_notifications(conversation_id);
CREATE INDEX IF NOT EXISTS idx_encryption_notifications_user ON encryption_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_encryption_notifications_type ON encryption_notifications(type);
CREATE INDEX IF NOT EXISTS idx_encryption_notifications_read ON encryption_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_encryption_notifications_created ON encryption_notifications(created_at);

-- Messages encryption indexes
CREATE INDEX IF NOT EXISTS idx_messages_encrypted ON messages(is_encrypted);
CREATE INDEX IF NOT EXISTS idx_messages_encryption_key ON messages(encryption_key_id);

-- Conversations encryption indexes
CREATE INDEX IF NOT EXISTS idx_conversations_encrypted ON conversations(is_encrypted);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all encryption tables
ALTER TABLE user_encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_exchange_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption_notifications ENABLE ROW LEVEL SECURITY;

-- User encryption keys policies
CREATE POLICY "Users can view their own encryption keys" ON user_encryption_keys
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own encryption keys" ON user_encryption_keys
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own encryption keys" ON user_encryption_keys
    FOR UPDATE USING (auth.uid() = user_id);

-- Key exchange requests policies
CREATE POLICY "Users can view key exchange requests for their conversations" ON key_exchange_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversation_participants cp
            WHERE cp.conversation_id = key_exchange_requests.conversation_id
            AND cp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create key exchange requests for their conversations" ON key_exchange_requests
    FOR INSERT WITH CHECK (
        auth.uid() = initiator_id AND
        EXISTS (
            SELECT 1 FROM conversation_participants cp
            WHERE cp.conversation_id = key_exchange_requests.conversation_id
            AND cp.user_id = auth.uid()
        )
    );

-- Conversation encryption keys policies
CREATE POLICY "Users can view encryption keys for their conversations" ON conversation_encryption_keys
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversation_participants cp
            WHERE cp.conversation_id = conversation_encryption_keys.conversation_id
            AND cp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage encryption keys for their conversations" ON conversation_encryption_keys
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM conversation_participants cp
            WHERE cp.conversation_id = conversation_encryption_keys.conversation_id
            AND cp.user_id = auth.uid()
        )
    );

-- Encryption notifications policies
CREATE POLICY "Users can view their own encryption notifications" ON encryption_notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own encryption notifications" ON encryption_notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can create encryption notifications" ON encryption_notifications
    FOR INSERT WITH CHECK (true); -- Allow system to create notifications

-- =====================================================
-- FUNCTIONS FOR ENCRYPTION MANAGEMENT
-- =====================================================

-- Function to enable encryption for a conversation
CREATE OR REPLACE FUNCTION enable_conversation_encryption(
    p_conversation_id UUID,
    p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user is a participant in the conversation
    IF NOT EXISTS (
        SELECT 1 FROM conversation_participants
        WHERE conversation_id = p_conversation_id
        AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'User is not a participant in this conversation';
    END IF;

    -- Enable encryption for the conversation
    UPDATE conversations
    SET is_encrypted = true,
        encryption_enabled_at = NOW()
    WHERE id = p_conversation_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to disable encryption for a conversation
CREATE OR REPLACE FUNCTION disable_conversation_encryption(
    p_conversation_id UUID,
    p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user is a participant in the conversation
    IF NOT EXISTS (
        SELECT 1 FROM conversation_participants
        WHERE conversation_id = p_conversation_id
        AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'User is not a participant in this conversation';
    END IF;

    -- Disable encryption for the conversation
    UPDATE conversations
    SET is_encrypted = false,
        encryption_enabled_at = NULL
    WHERE id = p_conversation_id;

    -- Deactivate all encryption keys for this conversation
    UPDATE conversation_encryption_keys
    SET is_active = false
    WHERE conversation_id = p_conversation_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to rotate encryption keys
CREATE OR REPLACE FUNCTION rotate_conversation_keys(
    p_conversation_id UUID,
    p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user is a participant in the conversation
    IF NOT EXISTS (
        SELECT 1 FROM conversation_participants
        WHERE conversation_id = p_conversation_id
        AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'User is not a participant in this conversation';
    END IF;

    -- Update last key rotation timestamp
    UPDATE conversations
    SET last_key_rotation = NOW()
    WHERE id = p_conversation_id;

    -- Deactivate old keys (forward secrecy)
    UPDATE conversation_encryption_keys
    SET is_active = false,
        expires_at = NOW()
    WHERE conversation_id = p_conversation_id
    AND is_active = true;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get encryption status for a conversation
CREATE OR REPLACE FUNCTION get_conversation_encryption_status(
    p_conversation_id UUID,
    p_user_id UUID
) RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Check if user is a participant in the conversation
    IF NOT EXISTS (
        SELECT 1 FROM conversation_participants
        WHERE conversation_id = p_conversation_id
        AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'User is not a participant in this conversation';
    END IF;

    -- Get encryption status
    SELECT json_build_object(
        'is_encrypted', c.is_encrypted,
        'encryption_enabled_at', c.encryption_enabled_at,
        'last_key_rotation', c.last_key_rotation,
        'active_key_count', (
            SELECT COUNT(*)
            FROM conversation_encryption_keys cek
            WHERE cek.conversation_id = p_conversation_id
            AND cek.is_active = true
        ),
        'participant_count', (
            SELECT COUNT(*)
            FROM conversation_participants cp
            WHERE cp.conversation_id = p_conversation_id
        )
    ) INTO result
    FROM conversations c
    WHERE c.id = p_conversation_id;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Trigger to update updated_at timestamp on user_encryption_keys
CREATE OR REPLACE FUNCTION update_user_encryption_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_encryption_keys_updated_at
    BEFORE UPDATE ON user_encryption_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_user_encryption_keys_updated_at();

-- =====================================================
-- CLEANUP FUNCTIONS
-- =====================================================

-- Function to clean up expired encryption keys
CREATE OR REPLACE FUNCTION cleanup_expired_encryption_keys()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete expired encryption keys
    DELETE FROM conversation_encryption_keys
    WHERE expires_at IS NOT NULL
    AND expires_at < NOW()
    AND is_active = false;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete old key exchange requests (older than 7 days)
    DELETE FROM key_exchange_requests
    WHERE timestamp < NOW() - INTERVAL '7 days'
    AND status = 'completed';

    -- Delete old encryption notifications (older than 30 days)
    DELETE FROM encryption_notifications
    WHERE created_at < NOW() - INTERVAL '30 days'
    AND is_read = true;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE user_encryption_keys IS 'Stores public encryption keys for each user';
COMMENT ON TABLE key_exchange_requests IS 'Tracks pending key exchange requests between conversation participants';
COMMENT ON TABLE conversation_encryption_keys IS 'Stores encrypted conversation keys for each participant';
COMMENT ON TABLE encryption_notifications IS 'Stores notifications about encryption events';

COMMENT ON COLUMN user_encryption_keys.public_key IS 'Base64 encoded ECDH P-256 public key';
COMMENT ON COLUMN key_exchange_requests.public_key IS 'Base64 encoded public key for key exchange';
COMMENT ON COLUMN conversation_encryption_keys.encrypted_key IS 'JSON string containing encrypted conversation key data';
COMMENT ON COLUMN messages.encrypted_content IS 'Encrypted message content (when is_encrypted is true)';
COMMENT ON COLUMN messages.encryption_iv IS 'Initialization vector for AES-GCM encryption';
COMMENT ON COLUMN messages.encryption_signature IS 'HMAC signature for message integrity verification';

-- =====================================================
-- SAMPLE DATA (FOR TESTING)
-- =====================================================

-- Note: In production, these would be created through the application
-- This is just for reference and testing purposes

-- Example of how to insert a user encryption key (would be done by the application)
-- INSERT INTO user_encryption_keys (user_id, key_id, public_key) VALUES
-- ('user-uuid-here', 'key-id-here', 'base64-encoded-public-key-here');

-- =====================================================
-- GRANTS AND PERMISSIONS
-- =====================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON user_encryption_keys TO authenticated;
GRANT SELECT, INSERT ON key_exchange_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE ON conversation_encryption_keys TO authenticated;
GRANT SELECT, UPDATE ON encryption_notifications TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION enable_conversation_encryption(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION disable_conversation_encryption(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION rotate_conversation_keys(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversation_encryption_status(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_encryption_keys() TO authenticated;
