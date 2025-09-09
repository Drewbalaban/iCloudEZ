import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Minimal runtime; avoid noisy logs in production

// Only create client in the browser and if we have valid credentials
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

export const supabase = typeof window !== 'undefined' &&
  supabaseUrl && supabaseAnonKey &&
  supabaseUrl.length > 0 &&
  supabaseAnonKey.length > 0
  ? (browserClient ||= createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    }))
  : null

// no-op: avoid noisy logs

// Database types matching production schema
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          email: string
          full_name: string | null
          bio: string | null
          avatar_url: string | null
          status: 'active' | 'suspended' | 'deleted'
          email_verified: boolean
          last_login: string | null
          login_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          email: string
          full_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          status?: 'active' | 'suspended' | 'deleted'
          email_verified?: boolean
          last_login?: string | null
          login_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          email?: string
          full_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          status?: 'active' | 'suspended' | 'deleted'
          email_verified?: boolean
          last_login?: string | null
          login_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          user_id: string
          name: string
          file_path: string
          file_size: number
          mime_type: string
          file_category: 'image' | 'video' | 'audio' | 'document' | 'archive' | 'spreadsheet' | 'presentation' | 'code' | 'other'
          folder: string
          description: string | null
          visibility: 'private' | 'public' | 'shared'
          download_count: number
          last_downloaded: string | null
          checksum: string | null
          metadata: Record<string, unknown> | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          file_path: string
          file_size: number
          mime_type: string
          file_category: 'image' | 'video' | 'audio' | 'document' | 'archive' | 'spreadsheet' | 'presentation' | 'code' | 'other'
          folder?: string
          description?: string | null
          visibility?: 'private' | 'public' | 'shared'
          download_count?: number
          last_downloaded?: string | null
          checksum?: string | null
          metadata?: Record<string, unknown> | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          file_path?: string
          file_size?: number
          mime_type?: string
          file_category?: 'image' | 'video' | 'audio' | 'document' | 'archive' | 'spreadsheet' | 'presentation' | 'code' | 'other'
          folder?: string
          description?: string | null
          visibility?: 'private' | 'public' | 'shared'
          download_count?: number
          last_downloaded?: string | null
          checksum?: string | null
          metadata?: Record<string, unknown> | null
          created_at?: string
          updated_at?: string
        }
      }
      file_shares: {
        Row: {
          id: string
          document_id: string
          shared_by: string
          shared_with: string
          permission_level: string
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          shared_by: string
          shared_with: string
          permission_level?: string
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          shared_by?: string
          shared_with?: string
          permission_level?: string
          expires_at?: string | null
          created_at?: string
        }
      }
      user_sessions: {
        Row: {
          id: string
          user_id: string
          session_token: string
          device_info: Record<string, unknown> | null
          ip_address: string | null
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_token: string
          device_info?: Record<string, unknown> | null
          ip_address?: string | null
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          session_token?: string
          device_info?: Record<string, unknown> | null
          ip_address?: string | null
          expires_at?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      file_category: 'image' | 'video' | 'audio' | 'document' | 'archive' | 'spreadsheet' | 'presentation' | 'code' | 'other'
      file_visibility: 'private' | 'public' | 'shared'
      user_status: 'active' | 'suspended' | 'deleted'
    }
  }
}

