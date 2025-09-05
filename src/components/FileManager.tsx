'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { 
  Folder, 
  Image, 
  Video, 
  Music, 
  Archive, 
  FileText, 
  File, 
  FileCode,
  Download, 
  Trash2, 
  Share2,
  Search,
  Grid,
  List,
  Eye,
  EyeOff,
  Globe,
  Lock
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase as supabaseClient } from '@/lib/supabase'
import { fileShareService, databaseHealthCheck } from '@/lib/database.service'
import type { Database } from '@/lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import FilePreview from './FilePreview'
import { formatFileSize, formatDate } from '@/lib/utils'

// Friend type for picker
type FriendResult = { id: string; username: string | null; email?: string | null; avatar_url?: string | null }

interface FileItem {
  id: string
  name: string
  file_path: string
  file_size: number
  mime_type: string
  file_category: string
  folder: string
  created_at: string
  url: string
  visibility: 'private' | 'public' | 'shared'
  shared_by?: string | null
  shared_by_username?: string | null
  shared_by_email?: string | null
}

interface FileManagerProps {
  onFileSelect?: (file: FileItem) => void
  refreshKey?: number
  shared?: boolean
  onRequestUpload?: () => void
}

export default function FileManager({ onFileSelect, refreshKey = 0, shared = false, onRequestUpload }: FileManagerProps) {
  const { user } = useAuth()
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [initialLoaded, setInitialLoaded] = useState(false)
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({})
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('fm:viewMode') as 'grid' | 'list' | null
      if (stored === 'grid' || stored === 'list') return stored
    }
    return 'grid'
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedFolder, setSelectedFolder] = useState<string>('all')
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'private' | 'public'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('fm:visibility') as 'all' | 'private' | 'public' | null
      if (stored === 'all' || stored === 'private' || stored === 'public') return stored
    }
    return 'all'
  })

  // Friend picker state
  const [shareTargetFile, setShareTargetFile] = useState<FileItem | null>(null)
  const [friendResults, setFriendResults] = useState<FriendResult[]>([])
  const [friendLoading, setFriendLoading] = useState(false)

  // File preview state
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null)
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 })
  const [previewVisible, setPreviewVisible] = useState(false)

  // Track last fetch key to refetch when mode changes
  const lastFetchKeyRef = useRef<string | null>(null)

  // Resolve client at call-time to avoid capturing null during module init
  const getSb = (): SupabaseClient<Database> | null => (supabaseClient as unknown as SupabaseClient<Database>) || null

  // Persist preferences when they change
  useEffect(() => {
    try { localStorage.setItem('fm:viewMode', viewMode) } catch {}
  }, [viewMode])

  useEffect(() => {
    try { localStorage.setItem('fm:visibility', visibilityFilter) } catch {}
  }, [visibilityFilter])

  useEffect(() => {
    const sb = getSb()
    if (!user || !sb) return

    const fetchKey = `${user.id}:${shared ? 'shared' : 'own'}`

    // If mode changed or first load, reset and fetch
    if (lastFetchKeyRef.current !== fetchKey) {
      setFiles([])
      setInitialLoaded(false)
      setLoading(true)
      lastFetchKeyRef.current = fetchKey
      fetchFiles()
      return
    }

    // Manual refresh
    if (refreshKey > 0) {
      fetchFiles()
    }
  }, [user?.id, refreshKey, shared])

  const fetchFiles = async () => {
    const sb = getSb()
    if (!user || !sb) {
      console.log('🔍 FileManager: No user or supabase client, cannot fetch files')
      return
    }

    try {
      console.log('🔍 FileManager: fetching files for user', user.id, 'shared mode:', shared)
      if (!initialLoaded) setLoading(true)

      let data: any[] | null = null
      let error: any = null

      if (shared) {
        // Use the proper database service for shared documents
        console.log('🔍 FileManager: Using database service to fetch shared documents')
        data = await fileShareService.getSharedDocuments()
        console.log('🔍 FileManager: fetched shared documents:', data)
      } else {
        console.log('🔍 FileManager: Fetching user documents')
        const res = await sb
          .from('documents')
          .select('id,name,file_path,file_size,mime_type,file_category,folder,created_at,visibility')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        error = (res as any).error
        data = (res as any).data
        if (error) {
          console.error('🔍 FileManager: Supabase error fetching documents:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          })
        } else {
          console.log('🔍 FileManager: User documents result:', { count: data?.length || 0 })
        }
      }

      if (error) throw error
      setFiles(data || [])
      setInitialLoaded(true)
    } catch (error: any) {
      console.error('Error fetching files:', error?.message || error)
      setFiles([])
      setInitialLoaded(true)
    } finally {
      setLoading(false)
    }
  }

  const deleteFile = async (fileId: string, filePath: string) => {
    const sb = getSb()
    if (!user || !sb) return

    try {
      // Delete from storage
      const { error: storageError } = await sb.storage
        .from('documents')
        .remove([filePath])

      if (storageError) throw storageError

      // Delete from database
      const { error: dbError } = await sb
        .from('documents')
        .delete()
        .eq('id', fileId)

      if (dbError) throw dbError

      // Update local state
      setFiles(prev => prev.filter(f => f.id !== fileId))
    } catch (error) {
      console.error('Error deleting file:', error)
    }
  }

  const toggleFileVisibility = async (fileId: string, currentVisibility: boolean) => {
    const sb = getSb()
    if (!user || !sb) return

    try {
      const nextVisibility: Database['public']['Enums']['file_visibility'] = currentVisibility ? 'private' : 'public'
      const updatePayload: Database['public']['Tables']['documents']['Update'] = {
        visibility: nextVisibility
      }

      const { error } = await (sb as any)
        .from('documents')
        .update(updatePayload as any)
        .eq('id', fileId)

      if (error) throw error

      // Update local state
      setFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { ...f, visibility: nextVisibility } 
          : f
      ))
    } catch (error) {
      console.error('Error updating file visibility:', error)
    }
  }

  const downloadFile = async (file: FileItem) => {
    const sb = getSb()
    if (!sb) return
    try {
      console.log('🔍 FileManager: Starting download for file:', file.name)
      
      // For shared files, use the API endpoint that handles permissions
      if (shared) {
        console.log('🔍 FileManager: Using API endpoint for shared file download')
        console.log('🔍 FileManager: File ID:', file.id)
        console.log('🔍 FileManager: File path:', file.file_path)
        
        try {
          const response = await fetch(`/api/download/${file.id}`, {
            credentials: 'include', // This ensures cookies are sent
            headers: {
              'Content-Type': 'application/json',
            },
          })
          console.log('🔍 FileManager: API response status:', response.status)
          console.log('🔍 FileManager: API response headers:', response.headers)
          
          if (!response.ok) {
            if (response.status === 403) {
              toast.error('Access denied to this file')
            } else if (response.status === 404) {
              toast.error('File not found')
            } else {
              toast.error(`Download failed: ${response.status} ${response.statusText}`)
            }
            return
          }
          
          // The API now returns a JSON response with the signed URL
          console.log('🔍 FileManager: API call successful, getting response...')
          const responseData = await response.json()
          console.log('🔍 FileManager: API response data:', responseData)
          
          if (!responseData.success || !responseData.signedUrl) {
            toast.error('Invalid response from download API')
            return
          }
          
          // Download using the signed URL
          console.log('🔍 FileManager: Downloading from signed URL...')
          const downloadResponse = await fetch(responseData.signedUrl)
          const blob = await downloadResponse.blob()
          console.log('🔍 FileManager: Blob size:', blob.size, 'bytes')
          
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = responseData.fileName || file.name
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
          
          toast.success(`Downloading ${responseData.fileName || file.name}`)
          return
        } catch (fetchError: any) {
          console.error('🔍 FileManager: Fetch error:', fetchError)
          toast.error(`Download failed: ${fetchError.message}`)
          return
        }
      }
      
      // For owned files, use direct Supabase storage access
      console.log('🔍 FileManager: Using direct storage access for owned file')
      const { data, error } = await sb
        .storage
        .from('documents')
        .createSignedUrl(file.file_path, 60) // 60 seconds

      if (error || !data?.signedUrl) {
        console.error('Error creating signed URL:', error)
        toast.error('Failed to create download link')
        return
      }

      const response = await fetch(data.signedUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success(`Downloading ${file.name}`)
    } catch (error) {
      console.error('Error downloading file:', error)
      toast.error('Download failed')
    }
  }

  const openSharePicker = (file: FileItem) => {
    setShareTargetFile(file)
    setFriendResults([])
    void loadFriends()
  }

  const loadFriends = async () => {
    const sb = getSb()
    if (!sb || !user) return
    try {
      setFriendLoading(true)
      // Fetch accepted friendships where current user is requester or recipient
      const { data: rows, error } = await sb
        .from('friend_requests')
        .select('requester,recipient,status')
        .eq('status', 'accepted')
        .or(`requester.eq.${user.id},recipient.eq.${user.id}`)
      if (error) {
        console.error('Friend list error:', error)
        setFriendResults([])
        return
      }
      const friendIds = Array.from(new Set((rows || []).map((r: any) => (r.requester === user.id ? r.recipient : r.requester))))
      if (friendIds.length === 0) { setFriendResults([]); return }
      const { data: profiles, error: pErr } = await sb
        .from('profiles')
        .select('id,username,email,avatar_url')
        .in('id', friendIds)
      if (pErr) {
        console.error('Friend profile error:', pErr)
        setFriendResults([])
        return
      }
      setFriendResults((profiles || []) as FriendResult[])
    } catch (e) {
      setFriendResults([])
    } finally {
      setFriendLoading(false)
    }
  }

  const shareWithFriend = async (friend: FriendResult) => {
    if (!shareTargetFile || !user) return
    try {
      // Prevent sharing with self
      if (friend.id === user.id) { toast.error('Cannot share with yourself'); return }
      const sb = getSb()
      if (!sb) return
      // Check if already shared
      const { data: existingShare, error: checkError } = await (sb as any)
        .from('file_shares')
        .select('id')
        .eq('document_id', shareTargetFile.id)
        .eq('shared_with', friend.id)
        .single()
      if (!checkError && existingShare) {
        toast.info(`Already shared with @${friend.username || friend.email}`)
        setShareTargetFile(null)
        return
      }
      // Create share
      const { error } = await (sb as any)
        .from('file_shares')
        .insert({
          document_id: shareTargetFile.id,
          shared_by: user.id,
          shared_with: friend.id,
          permission_level: 'read',
          expires_at: null
        })
      if (error) throw error
      toast.success(`Shared "${shareTargetFile.name}" with @${friend.username || friend.email}`)
      setShareTargetFile(null)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to share')
    }
  }

  const getAccurateFileIcon = (file: FileItem) => {
    const name = file.name.toLowerCase()
    const mime = (file.mime_type || '').toLowerCase()
    const baseClass = 'h-8 w-8'

    // Images get thumbnails elsewhere; this is the fallback icon
    if (file.file_category === 'image') return <Image className={`${baseClass} text-blue-500`} />

    if (file.file_category === 'video' || mime.startsWith('video/')) return <Video className={`${baseClass} text-purple-500`} />
    if (file.file_category === 'audio' || mime.startsWith('audio/')) return <Music className={`${baseClass} text-green-500`} />

    if (mime.includes('pdf') || name.endsWith('.pdf')) return <FileText className={`${baseClass} text-red-500`} />

    if (name.endsWith('.doc') || name.endsWith('.docx')) return <FileText className={`${baseClass} text-blue-600`} />
    if (name.endsWith('.ppt') || name.endsWith('.pptx') || mime.includes('presentation')) return <FileText className={`${baseClass} text-purple-600`} />
    if (name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv') || mime.includes('spreadsheet') || mime.includes('excel')) return <FileText className={`${baseClass} text-green-600`} />

    if (
      name.endsWith('.zip') || name.endsWith('.rar') || name.endsWith('.7z') ||
      name.endsWith('.tar') || name.endsWith('.gz') || mime.includes('zip') || mime.includes('rar') || mime.includes('tar')
    ) return <Archive className={`${baseClass} text-orange-500`} />

    if (
      name.endsWith('.js') || name.endsWith('.ts') || name.endsWith('.jsx') || name.endsWith('.tsx') ||
      name.endsWith('.json') || name.endsWith('.py') || name.endsWith('.java') || name.endsWith('.cs') ||
      name.endsWith('.go') || name.endsWith('.rb') || name.endsWith('.php') || mime.startsWith('text/')
    ) return <FileCode className={`${baseClass} text-yellow-600`} />

    if (file.file_category === 'document') return <FileText className={`${baseClass} text-red-500`} />
    if (file.file_category === 'archive') return <Archive className={`${baseClass} text-orange-500`} />

    return <File className={`${baseClass} text-gray-500`} />
  }

  const renderFileVisual = (file: FileItem, size: 'small' | 'large' = 'large') => {
    const previewUrl = previewUrls[file.id]
    const imgClass = size === 'large' ? 'h-20 w-20 object-cover rounded' : 'h-10 w-10 object-cover rounded'
    if (file.file_category === 'image' && previewUrl) {
      return <img src={previewUrl} alt="" className={imgClass} />
    }
    return getAccurateFileIcon(file)
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

  // File preview functions
  const handleFileHover = (file: FileItem, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setPreviewPosition({
      x: rect.left + rect.width / 2,
      y: rect.top
    })
    setPreviewFile(file)
    setPreviewVisible(true)
  }

  const handleFileLeave = () => {
    setPreviewVisible(false)
  }

  const closePreview = () => {
    setPreviewVisible(false)
    setPreviewFile(null)
  }

  // Filter files based on search and filters
  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedType === 'all' || file.file_category === selectedType
    const matchesFolder = selectedFolder === 'all' || file.folder === selectedFolder
    const matchesVisibility = visibilityFilter === 'all' || file.visibility === visibilityFilter
    return matchesSearch && matchesCategory && matchesFolder && matchesVisibility
  })
  // Generate signed preview URLs for image files in view
  useEffect(() => {
    const sb = getSb()
    if (!sb || !user) return
    const imageFiles = filteredFiles.filter(f => f.file_category === 'image')
    imageFiles.forEach(async (file) => {
      if (previewUrls[file.id]) return
      try {
        const { data, error } = await sb
          .storage
          .from('documents')
          .createSignedUrl(file.file_path, 300)
        if (!error && data?.signedUrl) {
          setPreviewUrls(prev => ({ ...prev, [file.id]: data.signedUrl }))
        }
      } catch {}
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredFiles.map(f => f.id).join(',')])


  // Visibility counts
  const totalAll = files.length
  const totalPrivate = files.filter(f => f.visibility === 'private').length
  const totalPublic = files.filter(f => f.visibility === 'public').length

  // Get unique file categories and folders for filters
  const fileCategories = ['all', ...Array.from(new Set(files.map(f => f.file_category)))]
  const folders = ['all', ...Array.from(new Set(files.map(f => f.folder)))]

  // Only show a full-height spinner before the first load to avoid flashing
  if (loading && !initialLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Shared files view shows a simple list
  if (shared) {
    return (
      <div className="space-y-4">
        {files.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <p>No shared files found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">
              Shared Files ({files.length})
            </h3>
            {files.map((file) => (
              <div 
                key={file.id} 
                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                onMouseEnter={(e) => handleFileHover(file, e)}
                onMouseLeave={handleFileLeave}
              >
                <div className="flex items-center space-x-3">
                  {renderFileVisual(file, 'small')}
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{file.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {formatFileSize(file.file_size)} • {formatDate(file.created_at)}
                      {file.shared_by_username || file.shared_by_email ? (
                        <> • shared by @{file.shared_by_username || file.shared_by_email}</>
                      ) : null}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => downloadFile(file)}
                    className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with search and filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            My Files ({files.length})
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Grid className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => onRequestUpload?.()}
            className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Upload Docs
          </button>
        </div>
      </div>

      {/* Visibility Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setVisibilityFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-sm ${visibilityFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'}`}
        >
          All ({totalAll})
        </button>
        <button
          onClick={() => setVisibilityFilter('private')}
          className={`px-3 py-1.5 rounded-lg text-sm ${visibilityFilter === 'private' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'}`}
        >
          Private ({totalPrivate})
        </button>
        <button
          onClick={() => setVisibilityFilter('public')}
          className={`px-3 py-1.5 rounded-lg text-sm ${visibilityFilter === 'public' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'}`}
        >
          Public ({totalPublic})
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mt-3">
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {fileCategories.map(category => (
            <option key={category} value={category}>
              {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
            </option>
          ))}
        </select>

        <select
          value={selectedFolder}
          onChange={(e) => setSelectedFolder(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {folders.map(folder => (
            <option key={folder} value={folder}>
              {folder === 'all' ? 'All Folders' : folder.charAt(0).toUpperCase() + folder.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* File Grid/List */}
      {filteredFiles.length === 0 ? (
        <div className="text-center py-12">
          <Folder className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            {searchQuery || selectedType !== 'all' || selectedFolder !== 'all' 
              ? 'No files match your filters' 
              : 'No files yet. Upload your first file to get started.'}
          </p>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-2'}>
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer ${
                viewMode === 'list' ? 'flex items-center space-x-3 p-3' : 'p-4'
              }`}
              onClick={() => onFileSelect?.(file)}
              onMouseEnter={(e) => handleFileHover(file, e)}
              onMouseLeave={handleFileLeave}
            >
              {viewMode === 'grid' ? (
                // Grid view
                <div className="space-y-3">
                  <div className="flex justify-center">
                    {renderFileVisual(file, 'large')}
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1 mb-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {file.name}
                      </p>
                      {file.visibility === 'public' && (
                        <Globe className="h-3 w-3 text-green-500" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(file.file_size)}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {formatDate(file.created_at)}
                    </p>
                  </div>
                  <div className="flex justify-center space-x-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); downloadFile(file) }}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); openSharePicker(file) }}
                      className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                      title="Share"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFileVisibility(file.id, file.visibility === 'public') }}
                      className={`p-2 transition-colors ${
                        file.visibility === 'public' 
                          ? 'text-green-400 hover:text-green-600' 
                          : 'text-gray-400 hover:text-blue-600'
                      }`}
                      title={file.visibility === 'public' ? 'Make Private' : 'Make Public'}
                    >
                      {file.visibility === 'public' ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteFile(file.id, file.file_path) }}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
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
                    <div className="flex items-center space-x-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {file.name}
                      </p>
                      {file.visibility === 'public' && (
                        <Globe className="h-3 w-3 text-green-500" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(file.file_size)} • {formatDate(file.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); downloadFile(file) }}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); openSharePicker(file) }}
                      className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                      title="Share"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFileVisibility(file.id, file.visibility === 'public') }}
                      className={`p-2 transition-colors ${
                        file.visibility === 'public' 
                          ? 'text-green-400 hover:text-green-600' 
                          : 'text-gray-400 hover:text-blue-600'
                      }`}
                      title={file.visibility === 'public' ? 'Make Private' : 'Make Public'}
                    >
                      {file.visibility === 'public' ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteFile(file.id, file.file_path) }}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Friend Picker Modal */}
      {shareTargetFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Share "{shareTargetFile.name}"</h4>
              <button onClick={() => setShareTargetFile(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="max-h-60 overflow-auto space-y-1">
              {friendLoading ? (
                <div className="text-sm text-slate-500">Loading…</div>
              ) : friendResults.length === 0 ? (
                <div className="text-sm text-slate-500">No friends yet</div>
              ) : (
                friendResults.map(fr => (
                  <button
                    key={fr.id}
                    onClick={() => shareWithFriend(fr)}
                    className="w-full text-left px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2"
                  >
                    {fr.avatar_url ? (
                      <img src={fr.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-600" />
                    )}
                    @{fr.username || fr.email}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* File Preview */}
      {previewFile && (
        <FilePreview
          file={previewFile}
          previewUrl={previewUrls[previewFile.id]}
          isVisible={previewVisible}
          position={previewPosition}
          onClose={closePreview}
          onDownload={downloadFile}
        />
      )}
    </div>
  )
}
