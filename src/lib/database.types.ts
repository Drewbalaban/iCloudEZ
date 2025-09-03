// Database types for CloudEZ application
// These types match the production database schema

export type FileCategory = 'image' | 'video' | 'audio' | 'document' | 'archive' | 'spreadsheet' | 'presentation' | 'code' | 'other'
export type FileVisibility = 'private' | 'public' | 'shared'
export type UserStatus = 'active' | 'suspended' | 'deleted'

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
