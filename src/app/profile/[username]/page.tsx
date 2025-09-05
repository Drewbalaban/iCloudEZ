'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { 
  User, 
  Calendar, 
  FileText, 
  Download, 
  Globe,
  Cloud,
  ArrowLeft,
  Image as ImageIcon,
  Video as VideoIcon,
  Music as MusicIcon,
  Archive as ArchiveIcon,
  File as FileIcon,
  FileCode as FileCodeIcon,
} from 'lucide-react'
import Link from 'next/link'

interface PublicFile {
  id: string
  name: string
  file_size: number
  mime_type: string
  file_category: string
  file_path: string
  created_at: string
  description?: string
  visibility: 'private' | 'public' | 'shared'
}

interface UserProfile {
  id: string
  username: string
  email: string
  full_name?: string
  bio?: string
  avatar_url?: string
  created_at: string
  total_files: number
  public_files: number
}

export default function UserProfilePage() {
  const params = useParams()
  const { user: currentUser } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [publicFiles, setPublicFiles] = useState<PublicFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const usernameKey = (params.username as string) || 'profile'
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`profile:viewMode:${usernameKey}`) as 'grid' | 'list' | null
      if (stored === 'grid' || stored === 'list') return stored
    }
    return 'grid'
  })
  useEffect(() => {
    try { localStorage.setItem(`profile:viewMode:${usernameKey}`, viewMode) } catch {}
  }, [viewMode, usernameKey])
  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(`profile:viewMode:${usernameKey}`) as 'grid' | 'list' | null
    if (stored === 'grid' || stored === 'list') setViewMode(stored)
  }, [usernameKey])
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({})

  if (!supabase) {
    console.warn('Supabase client not initialized on profile page')
  }

  useEffect(() => {
    if (params.username) {
      fetchUserProfile(params.username as string)
      fetchPublicFiles(params.username as string)
    }
  }, [params.username])

  const fetchUserProfile = async (username: string) => {
    try {
      setLoading(true)
      
      // Get user profile
      const { data: profileData, error: profileError } = await supabase!
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single()

      if (profileError) throw profileError

      // Get file counts
      const { count: totalFiles } = await supabase!
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', (profileData as any).id)

      const { count: publicFiles } = await supabase!
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', (profileData as any).id)
        .eq('visibility', 'public')

      setProfile({
        ...(profileData as any),
        total_files: totalFiles || 0,
        public_files: publicFiles || 0
      })

    } catch (error: any) {
      console.error('Error fetching profile:', error)
      
      // Check if it's a database table error
      if (error?.code === '42P01') {
        setError('Database not set up. Please run the database schema first.')
      } else if (error?.code === 'PGRST116') {
        setError('User not found')
      } else {
        setError('Failed to load profile')
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchPublicFiles = async (username: string) => {
    try {
      // Get user ID first
      const { data: profileData } = await supabase!
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single()

      if (!profileData) return

      // Get public files
      const { data: files, error } = await supabase!
        .from('documents')
        .select('*')
        .eq('user_id', (profileData as any).id)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPublicFiles(files || [])

    } catch (error: any) {
      console.error('Error fetching public files:', error)
      
      // If it's a table not found error, set empty files array
      if (error?.code === '42P01') {
        console.log('Documents table not found. Setting empty files array.')
        setPublicFiles([])
      }
    }
  }

  // Build icon by mime/extension with sensible colors
  const getAccurateFileIcon = (file: PublicFile) => {
    const name = file.name.toLowerCase()
    const mime = (file.mime_type || '').toLowerCase()
    const category = (file.file_category || '').toLowerCase()
    const baseClass = 'h-8 w-8'

    if (category === 'image' || mime.startsWith('image/')) return <ImageIcon className={`${baseClass} text-blue-500`} />
    if (category === 'video' || mime.startsWith('video/')) return <VideoIcon className={`${baseClass} text-purple-500`} />
    if (category === 'audio' || mime.startsWith('audio/')) return <MusicIcon className={`${baseClass} text-green-500`} />

    if (mime.includes('pdf') || name.endsWith('.pdf')) return <FileText className={`${baseClass} text-red-500`} />
    if (name.endsWith('.doc') || name.endsWith('.docx')) return <FileText className={`${baseClass} text-blue-600`} />
    if (name.endsWith('.ppt') || name.endsWith('.pptx') || mime.includes('presentation')) return <FileText className={`${baseClass} text-purple-600`} />
    if (name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv') || mime.includes('spreadsheet') || mime.includes('excel')) return <FileText className={`${baseClass} text-green-600`} />

    if (
      name.endsWith('.zip') || name.endsWith('.rar') || name.endsWith('.7z') ||
      name.endsWith('.tar') || name.endsWith('.gz') || mime.includes('zip') || mime.includes('rar') || mime.includes('tar')
    ) return <ArchiveIcon className={`${baseClass} text-orange-500`} />

    if (
      name.endsWith('.js') || name.endsWith('.ts') || name.endsWith('.jsx') || name.endsWith('.tsx') ||
      name.endsWith('.json') || name.endsWith('.py') || name.endsWith('.java') || name.endsWith('.cs') ||
      name.endsWith('.go') || name.endsWith('.rb') || name.endsWith('.php') || mime.startsWith('text/')
    ) return <FileCodeIcon className={`${baseClass} text-yellow-600`} />

    return <FileIcon className={`${baseClass} text-gray-500`} />
  }

  const renderFileVisual = (file: PublicFile, size: 'small' | 'large' = 'large') => {
    const previewUrl = previewUrls[file.id]
    const imgClass = size === 'large' ? 'h-20 w-20 object-cover rounded' : 'h-10 w-10 object-cover rounded'
    const category = (file.file_category || '').toLowerCase()
    const isImage = (category === 'image' || (file.mime_type || '').toLowerCase().startsWith('image/'))
    if (isImage && previewUrl) {
      return <img src={previewUrl} alt="" className={imgClass} />
    }
    return getAccurateFileIcon(file)
  }

  // Attempt to create signed preview URLs for images; silently fall back on failure
  useEffect(() => {
    if (!supabase) return
    const images = publicFiles.filter(f => (f.mime_type?.toLowerCase().startsWith('image/') || (f.file_category || '').toLowerCase() === 'image'))
    images.forEach(async (file) => {
      if (previewUrls[file.id]) return
      try {
        const { data, error } = await supabase!
          .storage
          .from('documents')
          .createSignedUrl(file.file_path, 300)
        if (!error && data?.signedUrl) {
          setPreviewUrls(prev => ({ ...prev, [file.id]: data.signedUrl }))
        }
      } catch {}
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicFiles.map(f => f.id).join(',')])

  const downloadFile = async (file: PublicFile) => {
    try {
      // Request a signed URL from our API (handles public/private/shared logic)
      const res = await fetch(`/api/download/${file.id}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || `Download failed (${res.status})`)
      }
      const { signedUrl } = await res.json()

      const response = await fetch(signedUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

    } catch (error: any) {
      console.error('Error downloading file:', error)
      alert(error?.message || 'Failed to download file')
    }
  }

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'images': return <FileText className="h-8 w-8 text-blue-500" />
      case 'videos': return <FileText className="h-8 w-8 text-purple-500" />
      case 'audio': return <FileText className="h-8 w-8 text-green-500" />
      case 'documents': return <FileText className="h-8 w-8 text-red-500" />
      case 'archives': return <FileText className="h-8 w-8 text-orange-500" />
      default: return <FileText className="h-8 w-8 text-gray-500" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {error || 'User not found'}
          </h1>
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-700 underline"
          >
            Go back home
          </Link>
        </div>
      </div>
    )
  }

  const isOwnProfile = currentUser?.id === profile.id

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to CloudEZ</span>
              </Link>
            </div>
            
            {isOwnProfile && (
              <Link
                href="/dashboard"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                My Dashboard
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Profile Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-8 mb-8">
          <div className="flex items-start space-x-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="h-24 w-24 rounded-full object-cover"
                />
              ) : (
                <div className="h-24 w-24 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full flex items-center justify-center">
                  <User className="h-12 w-12 text-white" />
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {profile.full_name || profile.username}
                </h1>
                {isOwnProfile && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 text-xs rounded-full">
                    You
                  </span>
                )}
              </div>
              
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                @{profile.username}
              </p>
              
              {profile.bio && (
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  {profile.bio}
                </p>
              )}

              <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {formatDate(profile.created_at)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Cloud className="h-4 w-4" />
                  <span>{profile.total_files} total files</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Globe className="h-4 w-4" />
                  <span>{profile.public_files} public files</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Public Files Section */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Public Files
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ({publicFiles.length} files)
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
              >
                List
              </button>
            </div>
          </div>

          {publicFiles.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {isOwnProfile 
                  ? "You haven't made any files public yet. Go to your dashboard to make files public."
                  : "This user hasn't made any files public yet."
                }
              </p>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-2'}>
              {publicFiles.map((file) => (
                <div
                  key={file.id}
                  className={`bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow ${
                    viewMode === 'list' ? 'flex items-center space-x-3 p-3' : 'p-4'
                  }`}
                >
                  {viewMode === 'grid' ? (
                    // Grid view
                    <div className="space-y-3">
                      <div className="flex justify-center">
                        {renderFileVisual(file, 'large')}
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatFileSize(file.file_size)}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {formatDate(file.created_at)}
                        </p>
                      </div>
                      <div className="flex justify-center">
                        <button
                          onClick={() => downloadFile(file)}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    // List view
                    <>
                      <div className="flex-shrink-0">
                        {renderFileVisual(file, 'small')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatFileSize(file.file_size)} • {formatDate(file.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => downloadFile(file)}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
