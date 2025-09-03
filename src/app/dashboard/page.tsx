'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { initGlobalSync, getGlobalSync, stopGlobalSync } from '@/lib/realtimeSync'
import AutoUpload, { AutoUploadHandle } from '@/components/AutoUpload'
import FileManager from '@/components/FileManager'
import { supabase } from '@/lib/supabase'
import { 
  Cloud, 
  Upload, 
  Folder, 
  File, 
  Search, 
  Grid, 
  List, 
  MoreVertical,
  LogOut,
  Settings,
  User,
  Share2,
  Wifi,
  WifiOff,
  Smartphone,
  Monitor,
  Users
} from 'lucide-react'

interface Document {
  id: string
  name: string
  file_size: number
  mime_type: string
  created_at: string
  folder_id: string | null
}

interface Folder {
  id: string
  name: string
  created_at: string
}

export default function Dashboard() {
  const { user, signOut, loading } = useAuth()
  const router = useRouter()
  const [displayName, setDisplayName] = useState<string>('')
  
  const renderCount = useRef(0)
  renderCount.current += 1
  
  // Add error boundary
  try {
    const [documents, setDocuments] = useState<Document[]>([])
    const [folders, setFolders] = useState<Folder[]>([])
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [searchQuery, setSearchQuery] = useState('')
    const [currentFolder, setCurrentFolder] = useState<string | null>(null)
    const [syncStatus, setSyncStatus] = useState({
      isConnected: false,
      hasFileWatcher: false,
      deviceType: 'unknown'
    })
    const [showUpload, setShowUpload] = useState(false)
    
    // Trigger FileManager refresh after successful uploads
    const [filesRefreshKey, setFilesRefreshKey] = useState(0)
    const uploaderRef = useRef<AutoUploadHandle>(null)

    // Add stable loading state to prevent flashing
    const [stableLoading, setStableLoading] = useState(true)
    const [hasInitialized, setHasInitialized] = useState(false)

    useEffect(() => {}, [user, loading, stableLoading])

    // Stabilize loading state to prevent flashing
    useEffect(() => {
      if (!loading && !hasInitialized) {
        // Add a small delay to prevent rapid state changes
        const timer = setTimeout(() => {
          setStableLoading(false)
          setHasInitialized(true)
        }, 100)
        
        return () => clearTimeout(timer)
      }
    }, [loading, hasInitialized])

    useEffect(() => {
      if (!loading && !user) {
        router.push('/auth/signin')
      }
      // Load profile username for header
      (async () => {
        try {
          if (!user) return
          const res = await fetch(`/api/profile/${user.id}`)
          if (res.ok) {
            const json = await res.json()
            setDisplayName(json.username || user.email || '')
          } else {
            setDisplayName(user.email || '')
          }
        } catch {
          setDisplayName(user?.email || '')
        }
      })()
    }, [user, loading, router])

    // Initialize real-time sync when user logs in
    useEffect(() => {
      if (user && !syncStatus.isConnected) {
        initializeSync()
      }

      return () => {
        if (syncStatus.isConnected) {
          stopGlobalSync()
        }
      }
    }, [user])

    const initializeSync = async () => {
      try {
        const sync = initGlobalSync(user!.id)
        await sync.startSync()
        
        // Get sync status
        const status = sync.getStatus()
        setSyncStatus({
          isConnected: status.isConnected,
          hasFileWatcher: status.hasFileWatcher,
          deviceType: detectDeviceType()
        })

        // Optionally hook sync events

      } catch (error) {
        console.error('Failed to initialize sync:', error)
      }
    }

    const detectDeviceType = () => {
      if (typeof window === 'undefined') return 'unknown'
      
      const userAgent = navigator.userAgent
      if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
        return 'mobile'
      } else if (/Mac|Windows|Linux/i.test(userAgent)) {
        return 'desktop'
      }
      return 'unknown'
    }

    const handleSignOut = async () => {
      try {
        stopGlobalSync()
        await signOut()
        router.push('/auth/signin')
      } catch (error) {
        console.error('Error signing out:', error)
      }
    }

    const handleUploadComplete = (files: any[]) => {
      console.log('Upload completed:', files)
      setShowUpload(false)
      // Trigger a refetch of files without needing a full page refresh
      setFilesRefreshKey(prev => prev + 1)
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

    if (stableLoading) {
      console.log('🔍 Dashboard: Showing stable loading spinner')
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <div className="mt-4 text-slate-600">Loading...</div>
        </div>
      )
    }

    if (!user) {
      console.log('🔍 Dashboard: No user, returning null')
      return null
    }

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        {/* Header */}
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <Link href="/" className="flex items-center space-x-3 group">
                  <div className="h-8 w-8 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center group-hover:opacity-90">
                    <Cloud className="h-5 w-5 text-white" />
                  </div>
                  <h1 className="text-xl font-semibold text-slate-900 dark:text-white group-hover:opacity-90">iCloudEZ</h1>
                </Link>
                
                {/* Removed sync/device indicators for cleaner header */}
              </div>

              <div className="flex items-center space-x-4">
                <div className="relative group">
                  <button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                    <User className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{displayName}</span>
                    <MoreVertical className="h-4 w-4 text-slate-400" />
                  </button>
                  
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="py-1">
                      <Link
                        href={`/profile/${displayName || user.email?.split('@')[0]}`}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center space-x-2"
                      >
                        <User className="h-4 w-4" />
                        <span>My Profile</span>
                      </Link>
                      <Link
                        href="/sharing"
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center space-x-2"
                      >
                        <Share2 className="h-4 w-4" />
                        <span>Sharing Manager</span>
                      </Link>
                      <Link
                        href="/friends"
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center space-x-2"
                      >
                        <Users className="h-4 w-4" />
                        <span>Friends</span>
                      </Link>
                      <Link
                        href="/profile/settings"
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center space-x-2"
                      >
                        <Settings className="h-4 w-4" />
                        <span>Profile Settings</span>
                      </Link>
                      <button 
                        onClick={handleSignOut}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center space-x-2"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Debug section removed */}

          {/* Tabs */}
          <div className="mb-6 flex items-center gap-2">
            <button
              onClick={() => {
                setCurrentFolder(null)
                console.log('🔍 Dashboard: Switched to My Files tab')
              }}
              className={`px-3 py-1.5 rounded-lg text-sm ${!currentFolder ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'}`}
            >
              My Files
            </button>
            <button
              onClick={() => {
                setCurrentFolder('shared')
                console.log('🔍 Dashboard: Switched to Shared with me tab')
                // Force refresh of shared files
                setTimeout(() => {
                  setFilesRefreshKey(prev => prev + 1)
                }, 100)
              }}
              className={`px-3 py-1.5 rounded-lg text-sm ${currentFolder === 'shared' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'}`}
            >
              Shared with me
            </button>
          </div>

          {/* Upload Section */}
          {currentFolder !== 'shared' && (showUpload ? (
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                  Upload Files
                </h3>
                <button
                  onClick={() => setShowUpload(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  ✕
                </button>
              </div>
              <AutoUpload 
                ref={uploaderRef}
                onUploadComplete={handleUploadComplete}
                folder={currentFolder || 'general'}
                maxSize={100}
                hiddenUI
              />
              <div className="mt-4">
                <button 
                  onClick={() => uploaderRef.current?.openFileDialog()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Choose Files
                </button>
              </div>
            </div>
          ) : (
            currentFolder !== 'shared' && (
              <div className="bg-white dark:bg-slate-800 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 p-8 text-center mb-8">
                <Upload className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                  Upload your documents
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  Click to choose files. Files will automatically sync across devices.
                </p>
                <button 
                  onClick={() => {
                    setShowUpload(true)
                    setTimeout(() => uploaderRef.current?.openFileDialog(), 0)
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Choose Files
                </button>
                <AutoUpload 
                  ref={uploaderRef}
                  onUploadComplete={handleUploadComplete}
                  folder={currentFolder || 'general'}
                  maxSize={100}
                  hiddenUI
                />
              </div>
            )
          ))}

          {/* File Manager */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
            <FileManager key={currentFolder === 'shared' ? 'shared' : 'own'} onFileSelect={(file) => console.log('File selected:', file)} refreshKey={filesRefreshKey} shared={currentFolder === 'shared'} />
          </div>
        </main>
      </div>
    )
  } catch (error) {
    console.error('Error rendering Dashboard component:', error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-100 dark:bg-red-900">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-red-600 dark:text-red-400 mb-4">Error</h1>
          <p className="text-lg text-red-800 dark:text-red-200 mb-6">
            An unexpected error occurred while rendering the dashboard.
          </p>
          <p className="text-sm text-red-700 dark:text-red-300">
            Please try refreshing the page or contact support.
          </p>
        </div>
      </div>
    )
  }
}
