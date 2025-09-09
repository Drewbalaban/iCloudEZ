-- Fix infinite recursion in conversation_participants RLS policies
-- The issue is that the policies are referencing the same table they're protecting

-- Drop all existing problematic policies
DROP POLICY IF EXISTS "conversation_participants_select_consolidated" ON public.conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_insert_consolidated" ON public.conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_update_consolidated" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can join conversations they're invited to" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON public.conversation_participants;
DROP POLICY IF EXISTS "Admins can manage participants" ON public.conversation_participants;

-- Create simple, non-recursive policies
-- For now, let's use a simpler approach: users can only see their own participation records
-- The API will need to be modified to handle this differently
CREATE POLICY "Users can view their own participation" ON public.conversation_participants
    FOR SELECT USING (
        (select auth.uid()) = user_id
    );

-- Users can insert their own participation (when joining conversations)
CREATE POLICY "Users can join conversations" ON public.conversation_participants
    FOR INSERT WITH CHECK (
        (select auth.uid()) = user_id
    );

-- Users can update their own participation settings
CREATE POLICY "Users can update their own participation" ON public.conversation_participants
    FOR UPDATE USING (
        (select auth.uid()) = user_id
    );

-- Users can delete their own participation (leave conversations)
CREATE POLICY "Users can leave conversations" ON public.conversation_participants
    FOR DELETE USING (
        (select auth.uid()) = user_id
    );

-- Service role can manage all participants (for server-side operations)
CREATE POLICY "Service role can manage all participants" ON public.conversation_participants
    FOR ALL USING (
        current_setting('role') = 'service_role'
    );
