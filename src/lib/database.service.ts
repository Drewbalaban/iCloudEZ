import { supabase } from './supabase'
import { createClient } from '@supabase/supabase-js'
import type { 
  Profile, 
  Document, 
  FileShare, 
  UserSession,
  Conversation,
  ConversationParticipant,
  Message,
  MessageReaction,
  UserPresence,
  ChatSettings
} from './database.types'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './supabase'

// Resolve client at call-time to avoid capturing null during module init
const getSb = (): SupabaseClient<Database> | null => (supabase as unknown as SupabaseClient<Database>) || null

// Profile operations
export const profileService = {
  // Get current user's profile
  async getCurrentProfile(): Promise<Profile | null> {
    const sb = getSb()
    if (!sb) return null

    const { data: { user } } = await sb.auth.getUser()
    if (!user) return null

    const { data, error } = await sb
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
      return null
    }

    return data as unknown as Profile
  },

  // Update current user's profile
  async updateProfile(updates: Partial<Profile>): Promise<Profile | null> {
    const sb = getSb()
    if (!sb) return null

    const { data: { user } } = await sb.auth.getUser()
    if (!user) return null

    const { data, error } = await (sb as any)
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating profile:', error)
      return null
    }

    return data as unknown as Profile
  },

  // Get profile by username
  async getProfileByUsername(username: string): Promise<Profile | null> {
    const sb = getSb()
    if (!sb) return null

    const { data, error } = await sb
      .from('profiles')
      .select('*')
      .eq('username', username)
      .eq('status', 'active')
      .single()

    if (error) {
      console.error('Error fetching profile by username:', error)
      return null
    }

    return data as unknown as Profile
  }
}

// Document operations
export const documentService = {
  // Get user's documents
  async getUserDocuments(folder?: string): Promise<Document[]> {
    const sb = getSb()
    if (!sb) return []

    const { data: { user } } = await sb.auth.getUser()
    if (!user) return []

    let query = sb
      .from('documents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (folder) {
      query = query.eq('folder', folder)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching documents:', error)
      return []
    }

    return (data as unknown as Document[]) || []
  },

  // Get public documents
  async getPublicDocuments(limit = 20): Promise<Document[]> {
    const sb = getSb()
    if (!sb) return []

    const { data, error } = await sb
      .from('documents')
      .select('*')
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching public documents:', error)
      return []
    }

    return (data as unknown as Document[]) || []
  },

  // Create new document record
  async createDocument(documentData: Omit<Document, 'id' | 'created_at' | 'updated_at'>): Promise<Document | null> {
    const sb = getSb()
    if (!sb) return null

    const { data, error } = await (sb as any)
      .from('documents')
      .insert(documentData)
      .select()
      .single()

    if (error) {
      console.error('Error creating document:', error)
      return null
    }

    return data as unknown as Document
  },

  // Update document
  async updateDocument(id: string, updates: Partial<Document>): Promise<Document | null> {
    const sb = getSb()
    if (!sb) return null

    const { data, error } = await (sb as any)
      .from('documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating document:', error)
      return null
    }

    return data as unknown as Document
  },

  // Delete document
  async deleteDocument(id: string): Promise<boolean> {
    const sb = getSb()
    if (!sb) return false

    const { error } = await sb
      .from('documents')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting document:', error)
      return false
    }

    return true
  },

  // Get document by ID
  async getDocumentById(id: string): Promise<Document | null> {
    const sb = getSb()
    if (!sb) return null

    const { data, error } = await sb
      .from('documents')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching document:', error)
      return null
    }

    return data as unknown as Document
  }
}

// File sharing operations
export const fileShareService = {
  // Share a document with another user
  async shareDocument(documentId: string, sharedWithUsername: string, permissionLevel: 'read' | 'write' | 'admin' = 'read', expiresAt?: string): Promise<FileShare | null> {
    const sb = getSb()
    if (!sb) return null

    // First get the user ID for the username
    const profile = await profileService.getProfileByUsername(sharedWithUsername)
    if (!profile) {
      console.error('User not found:', sharedWithUsername)
      return null
    }

    const { data: { user } } = await sb.auth.getUser()
    if (!user) return null

    const shareData = {
      document_id: documentId,
      shared_by: user.id,
      shared_with: profile.id,
      permission_level: permissionLevel,
      expires_at: expiresAt || null
    }

    const { data, error } = await (sb as any)
      .from('file_shares')
      .insert(shareData)
      .select()
      .single()

    if (error) {
      console.error('Error sharing document:', error)
      return null
    }

    return data as unknown as FileShare
  },

  // Get documents shared with current user
  async getSharedDocuments(): Promise<Document[]> {
    const sb = getSb()
    if (!sb) {
      console.log('🔍 Database service: No supabase client')
      return []
    }

    const { data: { user } } = await sb.auth.getUser()
    if (!user) {
      console.log('🔍 Database service: No authenticated user')
      return []
    }

    try {
      console.log('🔍 Database service: Fetching shared documents for user:', user.id)
      
      // First, let's check if there are any file_shares at all
      const { data: allShares, error: allSharesError } = await sb
        .from('file_shares')
        .select('*')
        .limit(10)
      
      console.log('🔍 Database service: All file_shares (first 10):', allShares)
      console.log('🔍 Database service: All shares error:', allSharesError)
      
      // Test basic query without date filtering
      const { data: basicShares, error: basicError } = await sb
        .from('file_shares')
        .select('document_id, shared_by, shared_with, created_at, expires_at')
        .eq('shared_with', user.id)
      
      console.log('🔍 Database service: Basic shares query result:', basicShares)
      console.log('🔍 Database service: Basic shares error:', basicError)
      
      if (basicError) {
        console.error('Error in basic shares query:', basicError)
        return []
      }
      
      if (!basicShares || basicShares.length === 0) {
        console.log('🔍 Database service: No file shares found for user:', user.id)
        return []
      }

      // Extract document IDs and sharer IDs
      const documentIds = basicShares.map((share: { document_id: string }) => share.document_id)
      const sharedByIds = Array.from(new Set(basicShares.map((share: { shared_by: string }) => share.shared_by)))
      console.log('🔍 Database service: Document IDs to fetch:', documentIds)

      // Now fetch the actual documents using the IDs
      const { data: documentsData, error: documentsError } = await sb
        .from('documents')
        .select('*')
        .in('id', documentIds)
        .order('created_at', { ascending: false })

      if (documentsError) {
        console.error('Error fetching shared documents:', documentsError)
        return []
      }

      // Fetch profiles for sharers to get usernames/emails
      const profilesById: Record<string, { id: string; username: string | null; email: string | null }> = {}
      if (sharedByIds.length > 0) {
        const { data: profs, error: profsError } = await sb
          .from('profiles')
          .select('id,username,email')
          .in('id', sharedByIds)
        if (profsError) {
          console.error('Error fetching sharer profiles:', profsError)
        } else {
          ;(profs || []).forEach((p: { id: string; username: string; email: string }) => { profilesById[p.id] = { id: p.id, username: p.username, email: p.email } })
        }
      }

      // Map document to associated share (first matching if multiple)
      const docIdToShare = new Map<string, { document_id: string; shared_by: string }>()
      basicShares.forEach((s: { document_id: string; shared_by: string }) => { if (!docIdToShare.has(s.document_id)) docIdToShare.set(s.document_id, s) })

      // Attach sharer info to each document row for UI convenience
      const enriched = (documentsData || []).map((doc: { id: string; [key: string]: unknown }) => {
        const share = docIdToShare.get(doc.id)
        const sharer = share ? profilesById[share.shared_by] : undefined
        return {
          ...doc,
          shared_by: share?.shared_by || null,
          shared_by_username: sharer?.username || null,
          shared_by_email: sharer?.email || null,
        }
      })

      console.log('🔍 Database service: Fetched shared documents (enriched):', enriched)
      
      return (enriched as unknown as Document[]) || []
    } catch (error) {
      console.error('Exception in getSharedDocuments:', error)
      return []
    }
  },

  // Get documents shared by current user
  async getDocumentsSharedByMe(): Promise<FileShare[]> {
    const sb = getSb()
    if (!sb) return []

    const { data: { user } } = await sb.auth.getUser()
    if (!user) return []

    const { data, error } = await sb
      .from('file_shares')
      .select('*')
      .eq('shared_by', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching documents shared by me:', error)
      return []
    }

    return (data as unknown as FileShare[]) || []
  },

  // Remove a share
  async removeShare(shareId: string): Promise<boolean> {
    const sb = getSb()
    if (!sb) return false

    const { error } = await sb
      .from('file_shares')
      .delete()
      .eq('id', shareId)

    if (error) {
      console.error('Error removing share:', error)
      return false
    }

    return true
  },

  // Test function to manually create a share for debugging
  async testCreateShare(documentId: string, sharedWithUsername: string): Promise<FileShare | null> {
    const sb = getSb()
    if (!sb) return null

    const { data: { user } } = await sb.auth.getUser()
    if (!user) return null

    try {
      console.log('🔍 Database service: Testing share creation...')
      
      // Get the user ID for the username
      const profile = await profileService.getProfileByUsername(sharedWithUsername)
      if (!profile) {
        console.error('User not found:', sharedWithUsername)
        return null
      }

      const shareData = {
        document_id: documentId,
        shared_by: user.id,
        shared_with: profile.id,
        permission_level: 'read' as const,
        expires_at: null
      }

      console.log('🔍 Database service: Share data:', shareData)

      const { data, error } = await (sb as any)
        .from('file_shares')
        .insert(shareData)
        .select()
        .single()

      if (error) {
        console.error('Error creating test share:', error)
        return null
      }

      console.log('🔍 Database service: Test share created successfully:', data)
      return data as unknown as FileShare
    } catch (error) {
      console.error('Exception in testCreateShare:', error)
      return null
    }
  },

  // Test function to check storage bucket access
  async testStorageAccess(filePath: string): Promise<{ success: boolean; error?: string; signedUrl?: string }> {
    const sb = getSb()
    if (!sb) return { success: false, error: 'No supabase client' }

    try {
      console.log('🔍 Database service: Testing storage access for file:', filePath)
      
      // Try to create a signed URL
      const { data, error } = await sb
        .storage
        .from('documents')
        .createSignedUrl(filePath, 60)

      if (error) {
        console.error('🔍 Database service: Storage access error:', error)
        return { success: false, error: error.message }
      }

      if (!data?.signedUrl) {
        console.error('🔍 Database service: No signed URL returned')
        return { success: false, error: 'No signed URL returned' }
      }

      console.log('🔍 Database service: Storage access successful, signed URL created')
      return { success: true, signedUrl: data.signedUrl }
    } catch (error) {
      console.error('🔍 Database service: Storage access exception:', error)
      return { success: false, error: 'Exception occurred' }
    }
  }
}

// Session operations
export const sessionService = {
  // Create a new session
  async createSession(sessionData: Omit<UserSession, 'id' | 'created_at'>): Promise<UserSession | null> {
    const sb = getSb()
    if (!sb) return null

    const { data, error } = await (sb as any)
      .from('user_sessions')
      .insert(sessionData)
      .select()
      .single()

    if (error) {
      console.error('Error creating session:', error)
      return null
    }

    return data as unknown as UserSession
  },

  // Get user's active sessions
  async getUserSessions(): Promise<UserSession[]> {
    const sb = getSb()
    if (!sb) return []

    const { data: { user } } = await sb.auth.getUser()
    if (!user) return []

    const { data, error } = await sb
      .from('user_sessions')
      .select('*')
      .eq('user_id', user.id)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user sessions:', error)
      return []
    }

    return (data as unknown as UserSession[]) || []
  },

  // Delete a session
  async deleteSession(sessionId: string): Promise<boolean> {
    const sb = getSb()
    if (!sb) return false

    const { error } = await sb
      .from('user_sessions')
      .delete()
      .eq('id', sessionId)

    if (error) {
      console.error('Error deleting session:', error)
      return false
    }

    return true
  }
}

// Chat system operations
export const chatService = {
  // Conversation operations
  async getConversations(): Promise<Conversation[]> {
    const sb = getSb()
    if (!sb) return []

    const { data: { user } } = await sb.auth.getUser()
    if (!user) return []

    const { data, error } = await sb
      .from('conversations')
      .select(`
        *,
        conversation_participants!inner(user_id)
      `)
      .eq('conversation_participants.user_id', user.id)
      .eq('is_active', true)
      .order('last_message_at', { ascending: false, nullsFirst: false })

    if (error) {
      console.error('Error fetching conversations:', error)
      return []
    }

    return (data as unknown as Conversation[]) || []
  },

  async createDirectConversation(friendId: string): Promise<Conversation | null> {
    const sb = getSb()
    if (!sb) return null

    const { data: { user } } = await sb.auth.getUser()
    if (!user) return null

    const { data, error } = await (sb as any).rpc('create_direct_conversation', {
      user1_id: user.id,
      user2_id: friendId
    })

    if (error) {
      console.error('Error creating direct conversation:', error)
      return null
    }

    // Fetch the created conversation
    const { data: conversation, error: fetchError } = await sb
      .from('conversations')
      .select('*')
      .eq('id', data)
      .single()

    if (fetchError) {
      console.error('Error fetching created conversation:', fetchError)
      return null
    }

    return conversation as unknown as Conversation
  },

  async getConversationParticipants(conversationId: string): Promise<ConversationParticipant[]> {
    const sb = getSb()
    if (!sb) return []

    // Use service role to bypass RLS for getting all participants
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const admin = adminKey ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, adminKey) : null
    const client = admin ?? sb

    const { data: participants, error } = await client
      .from('conversation_participants')
      .select('*')
      .eq('conversation_id', conversationId)

    if (error) {
      console.error('Error fetching conversation participants:', error)
      return []
    }

    if (!participants || participants.length === 0) {
      return []
    }

    // Get profiles for all participants
    const participantIds = participants.map((p: any) => p.user_id)
    const { data: profiles } = await client
      .from('profiles')
      .select('id, username, email, full_name, avatar_url')
      .in('id', participantIds)

    // Combine participant data with profile data
    const participantsWithProfiles = participants.map((participant: any) => ({
      ...participant,
      profiles: profiles?.find((profile: any) => profile.id === participant.user_id) || null
    }))

    return (participantsWithProfiles as unknown as ConversationParticipant[]) || []
  },

  // Message operations
  async getMessages(conversationId: string, limit = 50, offset = 0): Promise<Message[]> {
    const sb = getSb()
    if (!sb) return []

    const { data, error } = await sb
      .from('messages')
      .select(`
        *,
        profiles!messages_sender_id_fkey(id, username, full_name, avatar_url)
      `)
      .eq('conversation_id', conversationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching messages:', error)
      return []
    }

    return (data as unknown as Message[]) || []
  },

  async sendMessage(conversationId: string, content: string, messageType: 'text' | 'image' | 'file' = 'text', attachmentUrl?: string, attachmentName?: string, attachmentSize?: number, attachmentMimeType?: string): Promise<Message | null> {
    const sb = getSb()
    if (!sb) return null

    const { data: { user } } = await sb.auth.getUser()
    if (!user) return null

    const messageData = {
      conversation_id: conversationId,
      sender_id: user.id,
      content,
      message_type: messageType,
      attachment_url: attachmentUrl || null,
      attachment_name: attachmentName || null,
      attachment_size: attachmentSize || null,
      attachment_mime_type: attachmentMimeType || null
    }

    const { data, error } = await (sb as any)
      .from('messages')
      .insert(messageData)
      .select(`
        *,
        profiles!messages_sender_id_fkey(id, username, full_name, avatar_url)
      `)
      .single()

    if (error) {
      console.error('Error sending message:', error)
      return null
    }

    return data as unknown as Message
  },

  async editMessage(messageId: string, newContent: string): Promise<Message | null> {
    const sb = getSb()
    if (!sb) return null

    const { data: { user } } = await sb.auth.getUser()
    if (!user) return null

    const { data, error } = await (sb as any)
      .from('messages')
      .update({
        content: newContent,
        edited_at: new Date().toISOString()
      })
      .eq('id', messageId)
      .eq('sender_id', user.id)
      .select(`
        *,
        profiles!messages_sender_id_fkey(id, username, full_name, avatar_url)
      `)
      .single()

    if (error) {
      console.error('Error editing message:', error)
      return null
    }

    return data as unknown as Message
  },

  async deleteMessage(messageId: string): Promise<boolean> {
    const sb = getSb()
    if (!sb) return false

    const { data: { user } } = await sb.auth.getUser()
    if (!user) return false

    const { error } = await (sb as any)
      .from('messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', messageId)
      .eq('sender_id', user.id)

    if (error) {
      console.error('Error deleting message:', error)
      return false
    }

    return true
  },

  // Message reactions
  async addReaction(messageId: string, emoji: string): Promise<MessageReaction | null> {
    const sb = getSb()
    if (!sb) return null

    const { data: { user } } = await sb.auth.getUser()
    if (!user) return null

    const { data, error } = await (sb as any)
      .from('message_reactions')
      .insert({
        message_id: messageId,
        user_id: user.id,
        emoji
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding reaction:', error)
      return null
    }

    return data as unknown as MessageReaction
  },

  async removeReaction(messageId: string, emoji: string): Promise<boolean> {
    const sb = getSb()
    if (!sb) return false

    const { data: { user } } = await sb.auth.getUser()
    if (!user) return false

    const { error } = await sb
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji)

    if (error) {
      console.error('Error removing reaction:', error)
      return false
    }

    return true
  },

  async getMessageReactions(messageId: string): Promise<MessageReaction[]> {
    const sb = getSb()
    if (!sb) return []

    const { data, error } = await sb
      .from('message_reactions')
      .select(`
        *,
        profiles!message_reactions_user_id_fkey(id, username, full_name, avatar_url)
      `)
      .eq('message_id', messageId)

    if (error) {
      console.error('Error fetching message reactions:', error)
      return []
    }

    return (data as unknown as MessageReaction[]) || []
  },

  // Read receipts
  async markMessagesAsRead(conversationId: string): Promise<boolean> {
    const sb = getSb()
    if (!sb) return false

    const { data: { user } } = await sb.auth.getUser()
    if (!user) return false

    const { error } = await (sb as any).rpc('mark_messages_as_read', {
      conversation_id: conversationId,
      user_id: user.id
    })

    if (error) {
      console.error('Error marking messages as read:', error)
      return false
    }

    return true
  },

  // User presence
  async updatePresence(status: 'online' | 'away' | 'busy' | 'offline', customStatus?: string): Promise<UserPresence | null> {
    const sb = getSb()
    if (!sb) return null

    const { data: { user } } = await sb.auth.getUser()
    if (!user) return null

    const { data, error } = await (sb as any)
      .from('user_presence')
      .upsert({
        user_id: user.id,
        status,
        custom_status: customStatus || null,
        last_seen: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating presence:', error)
      return null
    }

    return data as unknown as UserPresence
  },

  async setTypingStatus(conversationId: string | null): Promise<boolean> {
    const sb = getSb()
    if (!sb) return false

    const { data: { user } } = await sb.auth.getUser()
    if (!user) return false

    const { error } = await (sb as any)
      .from('user_presence')
      .upsert({
        user_id: user.id,
        is_typing: conversationId !== null,
        typing_in_conversation_id: conversationId,
        last_seen: new Date().toISOString()
      })

    if (error) {
      console.error('Error setting typing status:', error)
      return false
    }

    return true
  },

  async getFriendsPresence(): Promise<UserPresence[]> {
    const sb = getSb()
    if (!sb) return []

    const { data: { user } } = await sb.auth.getUser()
    if (!user) return []

    // First get friend IDs
    const { data: friendships } = await sb
      .from('friend_requests')
      .select('requester, recipient')
      .or(`requester.eq.${user.id},recipient.eq.${user.id}`)
      .eq('status', 'accepted')

    if (!friendships || friendships.length === 0) {
      return []
    }

    // Extract friend IDs
    const friendIds = ((friendships as Array<{ requester: string; recipient: string }>) || []).map((f) =>
      f.requester === user.id ? f.recipient : f.requester
    )

    const { data, error } = await sb
      .from('user_presence')
      .select(`
        *,
        profiles!user_presence_user_id_fkey(id, username, full_name, avatar_url)
      `)
      .in('user_id', friendIds)

    if (error) {
      console.error('Error fetching friends presence:', error)
      return []
    }

    return (data as unknown as UserPresence[]) || []
  },

  // Chat settings
  async getChatSettings(): Promise<ChatSettings | null> {
    const sb = getSb()
    if (!sb) return null

    const { data: { user } } = await sb.auth.getUser()
    if (!user) return null

    const { data, error } = await sb
      .from('chat_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Error fetching chat settings:', error)
      return null
    }

    return data as unknown as ChatSettings
  },

  async updateChatSettings(settings: Partial<ChatSettings>): Promise<ChatSettings | null> {
    const sb = getSb()
    if (!sb) return null

    const { data: { user } } = await sb.auth.getUser()
    if (!user) return null

    const { data, error } = await (sb as any)
      .from('chat_settings')
      .upsert({
        user_id: user.id,
        ...settings
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating chat settings:', error)
      return null
    }

    return data as unknown as ChatSettings
  },

  // Utility functions
  async getUnreadMessageCount(): Promise<number> {
    const sb = getSb()
    if (!sb) return 0

    const { data: { user } } = await sb.auth.getUser()
    if (!user) return 0

    const { data, error } = await (sb as any).rpc('get_unread_message_count', {
      user_id: user.id
    })

    if (error) {
      console.error('Error getting unread message count:', error)
      return 0
    }

    return data || 0
  }
}

// Database health check
export const databaseHealthCheck = {
  async checkTables(): Promise<{ [key: string]: boolean }> {
    const sb = getSb()
    if (!sb) return { connected: false }

    try {
      const tables = ['profiles', 'documents', 'file_shares', 'user_sessions', 'conversations', 'messages', 'user_presence', 'chat_settings']
      const results: { [key: string]: boolean } = { connected: true }

      for (const table of tables) {
        try {
          const { error } = await sb
            .from(table)
            .select('*')
            .limit(1)
          
          results[table] = !error
          
        } catch {
          results[table] = false
          
        }
      }

      return results
    } catch (error) {
      console.error('Database health check failed:', error)
      return { connected: false }
    }
  },

  async checkFileSharesStructure(): Promise<{ [key: string]: unknown }> {
    const sb = getSb()
    if (!sb) return { error: 'No database connection' }

    try {
      // Check if file_shares table exists and has the right structure
      const { data, error } = await sb
        .from('file_shares')
        .select('*')
        .limit(1)
      
      if (error) {
        return { error: error.message, code: error.code }
      }

      // Check the structure by looking at the first row
      if (data && data.length > 0) {
        const firstRow = data[0]
        return {
          success: true,
          columns: Object.keys(firstRow),
          sample: firstRow
        }
      }

      return { success: true, message: 'Table exists but is empty' }
    } catch (error) {
      return { error: 'Exception occurred', details: error }
    }
  }
}
