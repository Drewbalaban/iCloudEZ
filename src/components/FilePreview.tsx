'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  FileText, 
  Image, 
  Video, 
  Music, 
  FileCode, 
  Archive, 
  File,
  Download,
  Eye,
  X,
  Calendar,
  HardDrive,
  User
} from 'lucide-react'
import { formatFileSize } from '@/lib/utils'

interface FilePreviewProps {
  file: {
    id: string
    name: string
    file_size: number
    mime_type: string
    file_category: string
    created_at: string
    visibility: string
    user_id?: string
    shared_by_username?: string
    shared_by_email?: string
  }
  previewUrl?: string
  isVisible: boolean
  position: { x: number; y: number }
  onClose: () => void
  onDownload?: (file: any) => void
}

export default function FilePreview({ 
  file, 
  previewUrl, 
  isVisible, 
  position, 
  onClose, 
  onDownload 
}: FilePreviewProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)

  // Auto-close after 5 seconds
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [isVisible, onClose])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    
    if (isVisible) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isVisible, onClose])

  const getFileIcon = () => {
    const name = file.name.toLowerCase()
    const mime = (file.mime_type || '').toLowerCase()
    const baseClass = 'h-8 w-8'

    if (file.file_category === 'image') return <Image className={`${baseClass} text-blue-500`} />
    if (file.file_category === 'video' || mime.startsWith('video/')) return <Video className={`${baseClass} text-purple-500`} />
    if (file.file_category === 'audio' || mime.startsWith('audio/')) return <Music className={`${baseClass} text-green-500`} />
    if (mime.includes('pdf') || name.endsWith('.pdf')) return <FileText className={`${baseClass} text-red-500`} />
    if (name.endsWith('.doc') || name.endsWith('.docx')) return <FileText className={`${baseClass} text-blue-600`} />
    if (name.endsWith('.ppt') || name.endsWith('.pptx') || mime.includes('presentation')) return <FileText className={`${baseClass} text-purple-600`} />
    if (name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv') || mime.includes('spreadsheet') || mime.includes('excel')) return <FileText className={`${baseClass} text-green-600`} />
    if (name.endsWith('.zip') || name.endsWith('.rar') || name.endsWith('.7z') || name.endsWith('.tar') || name.endsWith('.gz') || mime.includes('zip') || mime.includes('rar') || mime.includes('tar')) return <Archive className={`${baseClass} text-orange-500`} />
    if (name.endsWith('.js') || name.endsWith('.ts') || name.endsWith('.jsx') || name.endsWith('.tsx') || name.endsWith('.json') || name.endsWith('.py') || name.endsWith('.java') || name.endsWith('.cs') || name.endsWith('.go') || name.endsWith('.rb') || name.endsWith('.php') || mime.startsWith('text/')) return <FileCode className={`${baseClass} text-yellow-600`} />
    if (file.file_category === 'document') return <FileText className={`${baseClass} text-red-500`} />
    if (file.file_category === 'archive') return <Archive className={`${baseClass} text-orange-500`} />
    return <File className={`${baseClass} text-gray-500`} />
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const canPreview = file.file_category === 'image' && previewUrl && !imageError

  if (!isVisible) return null

  return (
    <div
      ref={previewRef}
      className="fixed z-50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-xl shadow-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden max-w-sm w-80 animate-in fade-in-0 zoom-in-95 duration-200"
      style={{
        left: Math.min(position.x, window.innerWidth - 320),
        top: Math.min(position.y, window.innerHeight - 400),
        transform: 'translate(-50%, -100%)'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          {getFileIcon()}
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {file.name}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {formatFileSize(file.file_size)}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Preview Content */}
      <div className="p-4 animate-in slide-in-from-top-2 duration-300">
        {canPreview ? (
          <div className="space-y-3">
            <div className="relative bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden aspect-video">
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              )}
              <img
                src={previewUrl}
                alt={file.name}
                className={`w-full h-full object-cover transition-opacity duration-200 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-full">
              {getFileIcon()}
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {file.file_category === 'image' ? 'Preview not available' : 'No preview available'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                {file.mime_type}
              </p>
            </div>
          </div>
        )}

        {/* File Details */}
        <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-400">
            <Calendar className="h-3 w-3" />
            <span>Created {formatDate(file.created_at)}</span>
          </div>
          
          <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-400">
            <HardDrive className="h-3 w-3" />
            <span>{formatFileSize(file.file_size)}</span>
          </div>

          {file.shared_by_username || file.shared_by_email ? (
            <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-400">
              <User className="h-3 w-3" />
              <span>Shared by @{file.shared_by_username || file.shared_by_email}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-400">
              <div className={`h-2 w-2 rounded-full ${file.visibility === 'public' ? 'bg-green-500' : 'bg-slate-400'}`} />
              <span>{file.visibility === 'public' ? 'Public' : 'Private'}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex space-x-2 pt-3">
          {onDownload && (
            <button
              onClick={() => onDownload(file)}
              className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Download</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm rounded-lg transition-colors"
          >
            <Eye className="h-4 w-4" />
            <span>Close</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// Utility function for formatting file sizes
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
