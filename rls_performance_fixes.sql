-- =====================================================
-- CloudEZ RLS Performance Optimization Script
-- =====================================================
-- This script fixes RLS policy performance issues by replacing
-- auth.uid() calls with optimized (select auth.uid()) subqueries
-- to prevent re-evaluation for each row
-- =====================================================

-- =====================================================
-- CONVERSATIONS TABLE POLICIES
-- =====================================================

-- Fix: Users can view conversations they participate in
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;
CREATE POLICY "Users can view conversations they participate in" ON public.conversations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversation_participants 
            WHERE conversation_id = conversations.id 
            AND user_id = (select auth.uid())
            AND is_archived = FALSE
        )
    );

-- Fix: Users can create conversations
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can create conversations" ON public.conversations
    FOR INSERT WITH CHECK ((select auth.uid()) = created_by);

-- Fix: Admins can update conversations
DROP POLICY IF EXISTS "Admins can update conversations" ON public.conversations;
CREATE POLICY "Admins can update conversations" ON public.conversations
    FOR UPDATE USING (
        (select auth.uid()) = created_by OR
        EXISTS (
            SELECT 1 FROM conversation_participants 
            WHERE conversation_id = conversations.id 
            AND user_id = (select auth.uid()) 
            AND role IN ('admin', 'moderator')
        )
    );

-- =====================================================
-- PROFILES TABLE POLICIES
-- =====================================================

-- Fix: Users can view their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING ((select auth.uid()) = id);

-- Fix: Users can update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING ((select auth.uid()) = id);

-- Fix: Users can insert their own profile
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK ((select auth.uid()) = id);

-- =====================================================
-- DOCUMENTS TABLE POLICIES
-- =====================================================

-- Fix: Users can view their own documents
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
CREATE POLICY "Users can view their own documents" ON public.documents
    FOR SELECT USING ((select auth.uid()) = user_id);

-- Fix: Users can view shared documents
DROP POLICY IF EXISTS "Users can view shared documents" ON public.documents;
CREATE POLICY "Users can view shared documents" ON public.documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM file_shares 
            WHERE document_id = documents.id 
            AND shared_with = (select auth.uid())
            AND (expires_at IS NULL OR expires_at > NOW())
        )
    );

-- Fix: Users can insert their own documents
DROP POLICY IF EXISTS "Users can insert their own documents" ON public.documents;
CREATE POLICY "Users can insert their own documents" ON public.documents
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- Fix: Users can update their own documents
DROP POLICY IF EXISTS "Users can update their own documents" ON public.documents;
CREATE POLICY "Users can update their own documents" ON public.documents
    FOR UPDATE USING ((select auth.uid()) = user_id);

-- Fix: Users can delete their own documents
DROP POLICY IF EXISTS "Users can delete their own documents" ON public.documents;
CREATE POLICY "Users can delete their own documents" ON public.documents
    FOR DELETE USING ((select auth.uid()) = user_id);

-- =====================================================
-- FILE_SHARES TABLE POLICIES
-- =====================================================

-- Fix: Users can view shares they created
DROP POLICY IF EXISTS "Users can view shares they created" ON public.file_shares;
CREATE POLICY "Users can view shares they created" ON public.file_shares
    FOR SELECT USING ((select auth.uid()) = shared_by);

-- Fix: Users can view shares they received
DROP POLICY IF EXISTS "Users can view shares they received" ON public.file_shares;
CREATE POLICY "Users can view shares they received" ON public.file_shares
    FOR SELECT USING ((select auth.uid()) = shared_with);

-- Fix: Users can create shares for their documents
DROP POLICY IF EXISTS "Users can create shares for their documents" ON public.file_shares;
CREATE POLICY "Users can create shares for their documents" ON public.file_shares
    FOR INSERT WITH CHECK (
        (select auth.uid()) = shared_by AND
        EXISTS (
            SELECT 1 FROM documents 
            WHERE id = document_id AND user_id = (select auth.uid())
        )
    );

-- Fix: Users can update shares they created
DROP POLICY IF EXISTS "Users can update shares they created" ON public.file_shares;
CREATE POLICY "Users can update shares they created" ON public.file_shares
    FOR UPDATE USING ((select auth.uid()) = shared_by);

-- Fix: Users can delete shares they created
DROP POLICY IF EXISTS "Users can delete shares they created" ON public.file_shares;
CREATE POLICY "Users can delete shares they created" ON public.file_shares
    FOR DELETE USING ((select auth.uid()) = shared_by);

-- =====================================================
-- USER_SESSIONS TABLE POLICIES
-- =====================================================

-- Fix: Users can view their own sessions
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.user_sessions;
CREATE POLICY "Users can view their own sessions" ON public.user_sessions
    FOR SELECT USING ((select auth.uid()) = user_id);

-- Fix: Users can manage their own sessions
DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.user_sessions;
CREATE POLICY "Users can manage their own sessions" ON public.user_sessions
    FOR ALL USING ((select auth.uid()) = user_id);

-- =====================================================
-- CONVERSATION_PARTICIPANTS TABLE POLICIES
-- =====================================================

-- Fix: Users can view participants in their conversations
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;
CREATE POLICY "Users can view participants in their conversations" ON public.conversation_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversation_participants cp2
            WHERE cp2.conversation_id = conversation_participants.conversation_id 
            AND cp2.user_id = (select auth.uid())
        )
    );

-- Fix: Users can join conversations they're invited to
DROP POLICY IF EXISTS "Users can join conversations they're invited to" ON public.conversation_participants;
CREATE POLICY "Users can join conversations they're invited to" ON public.conversation_participants
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- Fix: Users can update their own participation
DROP POLICY IF EXISTS "Users can update their own participation" ON public.conversation_participants;
CREATE POLICY "Users can update their own participation" ON public.conversation_participants
    FOR UPDATE USING ((select auth.uid()) = user_id);

-- Fix: Admins can manage participants
DROP POLICY IF EXISTS "Admins can manage participants" ON public.conversation_participants;
CREATE POLICY "Admins can manage participants" ON public.conversation_participants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM conversation_participants cp2
            WHERE cp2.conversation_id = conversation_participants.conversation_id 
            AND cp2.user_id = (select auth.uid()) 
            AND cp2.role IN ('admin', 'moderator')
        )
    );

-- =====================================================
-- FRIEND_REQUESTS TABLE POLICIES
-- =====================================================

-- Fix: view own friend requests
DROP POLICY IF EXISTS "view own friend requests" ON public.friend_requests;
CREATE POLICY "view own friend requests" ON public.friend_requests
    FOR SELECT USING (
        (select auth.uid()) = requester OR (select auth.uid()) = recipient
    );

-- Fix: send friend request
DROP POLICY IF EXISTS "send friend request" ON public.friend_requests;
CREATE POLICY "send friend request" ON public.friend_requests
    FOR INSERT WITH CHECK (
        (select auth.uid()) = requester AND requester <> recipient
    );

-- Fix: respond to friend request
DROP POLICY IF EXISTS "respond to friend request" ON public.friend_requests;
CREATE POLICY "respond to friend request" ON public.friend_requests
    FOR UPDATE USING (
        (select auth.uid()) = recipient
    );

-- Fix: cancel pending request
DROP POLICY IF EXISTS "cancel pending request" ON public.friend_requests;
CREATE POLICY "cancel pending request" ON public.friend_requests
    FOR DELETE USING (
        (select auth.uid()) = requester AND status = 'pending'
    );

-- Fix: unfriend accepted
DROP POLICY IF EXISTS "unfriend accepted" ON public.friend_requests;
CREATE POLICY "unfriend accepted" ON public.friend_requests
    FOR DELETE USING (
        status = 'accepted' AND ((select auth.uid()) = requester OR (select auth.uid()) = recipient)
    );

-- =====================================================
-- MESSAGES TABLE POLICIES
-- =====================================================

-- Fix: Users can view messages in their conversations
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversation_participants 
            WHERE conversation_id = messages.conversation_id 
            AND user_id = (select auth.uid())
        )
    );

-- Fix: Users can send messages to conversations they're in
DROP POLICY IF EXISTS "Users can send messages to conversations they're in" ON public.messages;
CREATE POLICY "Users can send messages to conversations they're in" ON public.messages
    FOR INSERT WITH CHECK (
        (select auth.uid()) = sender_id AND
        EXISTS (
            SELECT 1 FROM conversation_participants 
            WHERE conversation_id = messages.conversation_id 
            AND user_id = (select auth.uid())
        )
    );

-- Fix: Users can edit their own messages
DROP POLICY IF EXISTS "Users can edit their own messages" ON public.messages;
CREATE POLICY "Users can edit their own messages" ON public.messages
    FOR UPDATE USING (
        (select auth.uid()) = sender_id AND
        deleted_at IS NULL
    );

-- Fix: Users can delete their own messages
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;
CREATE POLICY "Users can delete their own messages" ON public.messages
    FOR UPDATE USING ((select auth.uid()) = sender_id);

-- =====================================================
-- MESSAGE_REACTIONS TABLE POLICIES
-- =====================================================

-- Fix: Users can view reactions on messages they can see
DROP POLICY IF EXISTS "Users can view reactions on messages they can see" ON public.message_reactions;
CREATE POLICY "Users can view reactions on messages they can see" ON public.message_reactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM messages m
            JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
            WHERE m.id = message_reactions.message_id 
            AND cp.user_id = (select auth.uid())
        )
    );

-- Fix: Users can add reactions to messages they can see
DROP POLICY IF EXISTS "Users can add reactions to messages they can see" ON public.message_reactions;
CREATE POLICY "Users can add reactions to messages they can see" ON public.message_reactions
    FOR INSERT WITH CHECK (
        (select auth.uid()) = user_id AND
        EXISTS (
            SELECT 1 FROM messages m
            JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
            WHERE m.id = message_reactions.message_id 
            AND cp.user_id = (select auth.uid())
        )
    );

-- Fix: Users can remove their own reactions
DROP POLICY IF EXISTS "Users can remove their own reactions" ON public.message_reactions;
CREATE POLICY "Users can remove their own reactions" ON public.message_reactions
    FOR DELETE USING ((select auth.uid()) = user_id);

-- =====================================================
-- MESSAGE_READ_RECEIPTS TABLE POLICIES
-- =====================================================

-- Fix: Users can view read receipts for messages they can see
DROP POLICY IF EXISTS "Users can view read receipts for messages they can see" ON public.message_read_receipts;
CREATE POLICY "Users can view read receipts for messages they can see" ON public.message_read_receipts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM messages m
            JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
            WHERE m.id = message_read_receipts.message_id 
            AND cp.user_id = (select auth.uid())
        )
    );

-- Fix: Users can mark messages as read
DROP POLICY IF EXISTS "Users can mark messages as read" ON public.message_read_receipts;
CREATE POLICY "Users can mark messages as read" ON public.message_read_receipts
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- =====================================================
-- USER_PRESENCE TABLE POLICIES
-- =====================================================

-- Fix: Users can view presence of their friends
DROP POLICY IF EXISTS "Users can view presence of their friends" ON public.user_presence;
CREATE POLICY "Users can view presence of their friends" ON public.user_presence
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM friend_requests fr
            WHERE fr.status = 'accepted' 
            AND (
                (fr.requester = (select auth.uid()) AND fr.recipient = user_presence.user_id) OR
                (fr.recipient = (select auth.uid()) AND fr.requester = user_presence.user_id)
            )
        )
    );

-- Fix: Users can manage their own presence
DROP POLICY IF EXISTS "Users can manage their own presence" ON public.user_presence;
CREATE POLICY "Users can manage their own presence" ON public.user_presence
    FOR ALL USING ((select auth.uid()) = user_id);

-- =====================================================
-- CHAT_SETTINGS TABLE POLICIES
-- =====================================================

-- Fix: Users can manage their own chat settings
DROP POLICY IF EXISTS "Users can manage their own chat settings" ON public.chat_settings;
CREATE POLICY "Users can manage their own chat settings" ON public.chat_settings
    FOR ALL USING ((select auth.uid()) = user_id);

-- =====================================================
-- RATE_LIMIT_LOGS TABLE POLICIES
-- =====================================================

-- Fix: Users can view their own rate limit logs
DROP POLICY IF EXISTS "Users can view their own rate limit logs" ON public.rate_limit_logs;
CREATE POLICY "Users can view their own rate limit logs" ON public.rate_limit_logs
    FOR SELECT USING ((select auth.uid()) = user_id);

-- Fix: Service role can manage rate limit logs
DROP POLICY IF EXISTS "Service role can manage rate limit logs" ON public.rate_limit_logs;
CREATE POLICY "Service role can manage rate limit logs" ON public.rate_limit_logs
    FOR ALL USING ((select auth.role()) = 'service_role');

-- =====================================================
-- RATE_LIMIT_CONFIG TABLE POLICIES
-- =====================================================

-- Fix: Service role can manage rate limits
DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.rate_limit_config;
CREATE POLICY "Service role can manage rate limits" ON public.rate_limit_config
    FOR ALL USING ((select auth.role()) = 'service_role');

-- =====================================================
-- RATE_LIMIT_EVENTS TABLE POLICIES
-- =====================================================

-- Fix: Service role can manage rate limit events
DROP POLICY IF EXISTS "Service role can manage rate limit events" ON public.rate_limit_events;
CREATE POLICY "Service role can manage rate limit events" ON public.rate_limit_events
    FOR ALL USING ((select auth.role()) = 'service_role');

-- Fix: Users can view own rate limit events
DROP POLICY IF EXISTS "Users can view own rate limit events" ON public.rate_limit_events;
CREATE POLICY "Users can view own rate limit events" ON public.rate_limit_events
    FOR SELECT USING (
        (select auth.role()) = 'service_role' OR
        event_key LIKE (select auth.uid())::text || '%'
    );

-- Fix: Service role can insert rate limit events
DROP POLICY IF EXISTS "Service role can insert rate limit events" ON public.rate_limit_events;
CREATE POLICY "Service role can insert rate limit events" ON public.rate_limit_events
    FOR INSERT WITH CHECK ((select auth.role()) = 'service_role');

-- Fix: Service role can delete rate limit events
DROP POLICY IF EXISTS "Service role can delete rate limit events" ON public.rate_limit_events;
CREATE POLICY "Service role can delete rate limit events" ON public.rate_limit_events
    FOR DELETE USING ((select auth.role()) = 'service_role');

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check that policies were updated correctly
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN (
    'conversations', 'profiles', 'documents', 'file_shares', 
    'user_sessions', 'conversation_participants', 'friend_requests',
    'messages', 'message_reactions', 'message_read_receipts',
    'user_presence', 'chat_settings', 'rate_limit_logs',
    'rate_limit_config', 'rate_limit_events'
)
ORDER BY tablename, policyname;

-- =====================================================
-- NOTES AND RECOMMENDATIONS
-- =====================================================

/*
RLS PERFORMANCE OPTIMIZATIONS IMPLEMENTED:

1. Auth Function Optimization:
   - Replaced auth.uid() with (select auth.uid()) in all policies
   - Replaced auth.role() with (select auth.role()) in all policies
   - This prevents re-evaluation for each row

2. Performance Benefits:
   - Significantly faster query execution at scale
   - Reduced CPU usage for RLS policy evaluation
   - Better performance for large result sets
   - Optimized for high-traffic applications

3. Tables Optimized:
   - conversations (3 policies)
   - profiles (3 policies)
   - documents (5 policies)
   - file_shares (5 policies)
   - user_sessions (2 policies)
   - conversation_participants (4 policies)
   - friend_requests (5 policies)
   - messages (4 policies)
   - message_reactions (3 policies)
   - message_read_receipts (2 policies)
   - user_presence (2 policies)
   - chat_settings (1 policy)
   - rate_limit_logs (2 policies)
   - rate_limit_config (1 policy)
   - rate_limit_events (4 policies)

4. Security Maintained:
   - All security logic preserved
   - No functional changes to access control
   - Same permission model maintained

TESTING RECOMMENDATIONS:

1. Test all CRUD operations on each table
2. Verify user permissions still work correctly
3. Test with different user roles
4. Monitor query performance improvements
5. Check that RLS still blocks unauthorized access

MONITORING:

1. Watch for any authentication errors
2. Monitor query performance metrics
3. Check that all features still work
4. Verify RLS policies are effective

NEXT STEPS:

1. Apply this script to your database
2. Test all functionality thoroughly
3. Monitor performance improvements
4. Run database linter again to verify fixes
*/
