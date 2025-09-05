// Database types for CloudEZ application
// These types match the production database schema

export type FileCategory = 'image' | 'video' | 'audio' | 'document' | 'archive' | 'spreadsheet' | 'presentation' | 'code' | 'other'
export type FileVisibility = 'private' | 'public' | 'shared'
export type UserStatus = 'active' | 'suspended' | 'deleted'

// Chat system types
export type MessageType = 'text' | 'image' | 'file' | 'system' | 'reply' | 'forward'
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
export type ConversationType = 'direct' | 'group'
export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline'
export type NotificationType = 'all' | 'mentions' | 'none'

export interface Profile {
  id: string
  username: string
  email: string
  full_name: string | null
  bio: string | null
  avatar_url: string | null
  status: UserStatus
  email_verified: boolean
  last_login: string | null
  login_count: number
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  user_id: string
  name: string
  file_path: string
  file_size: number
  mime_type: string
  file_category: FileCategory
  folder: string
  description: string | null
  visibility: FileVisibility
  download_count: number
  last_downloaded: string | null
  checksum: string | null
  metadata: any | null
  created_at: string
  updated_at: string
}

export interface FileShare {
  id: string
  document_id: string
  shared_by: string
  shared_with: string
  permission_level: 'read' | 'write' | 'admin'
  expires_at: string | null
  created_at: string
}

export interface UserSession {
  id: string
  user_id: string
  session_token: string
  device_info: any | null
  ip_address: string | null
  expires_at: string
  created_at: string
}

// Chat system interfaces
export interface Conversation {
  id: string
  name: string | null
  description: string | null
  type: ConversationType
  created_by: string
  avatar_url: string | null
  is_active: boolean
  last_message_at: string | null
  created_at: string
  updated_at: string
}

export interface ConversationParticipant {
  id: string
  conversation_id: string
  user_id: string
  role: 'admin' | 'moderator' | 'member'
  joined_at: string
  last_read_at: string
  notification_preference: NotificationType
  is_muted: boolean
  is_archived: boolean
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  message_type: MessageType
  status: MessageStatus
  reply_to_id: string | null
  forward_from_id: string | null
  attachment_url: string | null
  attachment_name: string | null
  attachment_size: number | null
  attachment_mime_type: string | null
  metadata: any | null
  edited_at: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface MessageReaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
}

export interface MessageReadReceipt {
  id: string
  message_id: string
  user_id: string
  read_at: string
}

export interface UserPresence {
  id: string
  user_id: string
  status: PresenceStatus
  last_seen: string
  is_typing: boolean
  typing_in_conversation_id: string | null
  custom_status: string | null
  device_info: any | null
}

export interface ChatSettings {
  id: string
  user_id: string
  theme: 'light' | 'dark' | 'auto'
  sound_enabled: boolean
  desktop_notifications: boolean
  show_online_status: boolean
  show_read_receipts: boolean
  auto_download_media: boolean
  message_preview: boolean
  created_at: string
  updated_at: string
}

// Helper functions for working with file categories
export const getFileCategoryFromMimeType = (mimeType: string): FileCategory => {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType.includes('pdf') || mimeType.includes('document')) return 'document'
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return 'archive'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'spreadsheet'
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation'
  if (mimeType.includes('text/') || mimeType.includes('javascript') || mimeType.includes('python')) return 'code'
  return 'other'
}

export const getFileCategoryIcon = (category: FileCategory): string => {
  const icons = {
    image: '🖼️',
    video: '🎥',
    audio: '🎵',
    document: '📄',
    archive: '📦',
    spreadsheet: '📊',
    presentation: '📽️',
    code: '💻',
    other: '📁'
  }
  return icons[category]
}

export const getFileCategoryColor = (category: FileCategory): string => {
  const colors = {
    image: 'text-blue-500',
    video: 'text-purple-500',
    audio: 'text-green-500',
    document: 'text-red-500',
    archive: 'text-yellow-500',
    spreadsheet: 'text-green-600',
    presentation: 'text-orange-500',
    code: 'text-indigo-500',
    other: 'text-gray-500'
  }
  return colors[category]
}

// Helper functions for chat system
export const getMessageTypeIcon = (type: MessageType): string => {
  const icons = {
    text: '💬',
    image: '🖼️',
    file: '📎',
    system: '⚙️',
    reply: '↩️',
    forward: '↪️'
  }
  return icons[type]
}

export const getPresenceStatusColor = (status: PresenceStatus): string => {
  const colors = {
    online: 'text-green-500',
    away: 'text-yellow-500',
    busy: 'text-red-500',
    offline: 'text-gray-500'
  }
  return colors[status]
}

export const getPresenceStatusIcon = (status: PresenceStatus): string => {
  const icons = {
    online: '🟢',
    away: '🟡',
    busy: '🔴',
    offline: '⚫'
  }
  return icons[status]
}

export const formatMessageTime = (timestamp: string): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
  
  if (diffInHours < 1) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } else if (diffInHours < 24) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } else if (diffInHours < 168) { // 7 days
    return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }
}

export const getConversationDisplayName = (conversation: Conversation, participants: ConversationParticipant[], currentUserId: string): string => {
  if (conversation.type === 'group' && conversation.name) {
    return conversation.name
  }
  
  // For direct messages, show the other participant's name
  const otherParticipant = participants.find(p => p.user_id !== currentUserId)
  return otherParticipant ? `Direct Message` : 'Unknown'
}
