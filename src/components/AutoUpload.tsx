'use client'

import { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import { Upload, X, Image as ImageIcon, File, Video, Music, Archive, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

export type AutoUploadHandle = {
  openFileDialog: () => void
}

interface UploadFile {
  id: string
  file: File
  preview?: string
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

interface AutoUploadProps {
  onUploadComplete?: (files: UploadFile[]) => void
  folder?: string
  multiple?: boolean
  accept?: string
  maxSize?: number // in MB
  hiddenUI?: boolean // when true, render only the hidden input and no drag/drop UI
}

const AutoUpload = forwardRef<AutoUploadHandle, AutoUploadProps>(function AutoUpload({ 
  onUploadComplete, 
  folder = 'general', 
  multiple = true, 
  accept = '*/*',
  maxSize = 100,
  hiddenUI = false
}: AutoUploadProps, ref) {
  const { user } = useAuth()
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useImperativeHandle(ref, () => ({
    openFileDialog: () => fileInputRef.current?.click()
  }), [])

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <ImageIcon className="h-8 w-8 text-blue-500" />
    if (file.type.startsWith('video/')) return <Video className="h-8 w-8 text-purple-500" />
    if (file.type.startsWith('audio/')) return <Music className="h-8 w-8 text-green-500" />
    if (file.type.includes('pdf') || file.type.includes('document')) return <FileText className="h-8 w-8 text-red-500" />
    if (file.type.includes('archive')) return <Archive className="h-8 w-8 text-orange-500" />
    return <File className="h-8 w-8 text-gray-500" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const validateFile = useCallback((file: File): string | null => {
    if (file.size > maxSize * 1024 * 1024) {
      return `File size must be less than ${maxSize}MB`
    }
    return null
  }, [maxSize])

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles)
    const validFiles: UploadFile[] = []

    fileArray.forEach(file => {
      const error = validateFile(file)
      if (error) {
        toast.error(`${file.name}: ${error}`)
        return
      }

      const uploadFile: UploadFile = {
        id: Math.random().toString(36).substring(2),
        file,
        progress: 0,
        status: 'pending'
      }

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          setFiles(prev => prev.map(f => 
            f.id === uploadFile.id ? { ...f, preview: e.target?.result as string } : f
          ))
        }
        reader.readAsDataURL(file)
      }

      validFiles.push(uploadFile)
    })

    setFiles(prev => [...prev, ...validFiles])
  }, [validateFile])

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const uploadFiles = useCallback(async () => {
    if (!user || files.length === 0) return

    setIsUploading(true)
    const pendingFiles = files.filter(f => f.status === 'pending')
    
    if (pendingFiles.length === 0) {
      setIsUploading(false)
      return
    }

    const formData = new FormData()
    pendingFiles.forEach(file => {
      formData.append('files', file.file)
    })
    formData.append('userId', user.id)
    formData.append('folder', folder)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        // Update file statuses
        setFiles(prev => prev.map(f => {
          const uploaded = result.uploaded.find((u: { fileName: string }) => u.fileName === f.file.name)
          if (uploaded) {
            return { ...f, status: 'success', progress: 100 }
          }
          return f
        }))

        toast.success(`Successfully uploaded ${result.successfulUploads} files`)
        // Clear the list after successful upload to avoid duplicate clicks
        setFiles([])
        onUploadComplete?.(result.uploaded)
      } else {
        toast.error('Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Upload failed')
    } finally {
      setIsUploading(false)
    }
  }, [user, files, onUploadComplete, folder])

  // Auto-start upload when pending files are present
  useEffect(() => {
    if (user && !isUploading && files.some(f => f.status === 'pending')) {
      uploadFiles()
    }
  }, [files, isUploading, user, uploadFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const droppedFiles = e.dataTransfer.files
    if (droppedFiles.length > 0) {
      addFiles(droppedFiles)
    }
  }, [addFiles])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (selectedFiles) {
      addFiles(selectedFiles)
    }
  }

  if (hiddenUI) {
    return (
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />
    )
  }

  return (
    <div className="w-full space-y-4">
      {/* Drag & Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Drop files here or click to browse
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Supports images, videos, documents, and more. Max size: {maxSize}MB
        </p>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          Choose Files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Files to Upload ({files.length})
            </h3>
            <button
              onClick={uploadFiles}
              disabled={isUploading || files.every(f => f.status === 'success')}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              {isUploading ? 'Uploading...' : 'Upload All'}
            </button>
          </div>

          <div className="grid gap-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                {/* File Preview/Icon */}
                <div className="flex-shrink-0">
                  {file.preview ? (
                    <Image src={file.preview} alt="File preview" width={48} height={48} className="h-12 w-12 object-cover rounded" />
                  ) : (
                    getFileIcon(file.file)
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {file.file.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(file.file.size)}
                  </p>
                </div>

                {/* Status */}
                <div className="flex items-center space-x-2">
                  {file.status === 'pending' && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">Pending</span>
                  )}
                  {file.status === 'uploading' && (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                      <span className="text-xs text-blue-600">{file.progress}%</span>
                    </div>
                  )}
                  {file.status === 'success' && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                  {file.status === 'error' && (
                    <div className="flex items-center space-x-1">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <span className="text-xs text-red-500">{file.error}</span>
                    </div>
                  )}
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => removeFile(file.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
})

export default AutoUpload
