'use client'

import { useState, useEffect } from 'react'

interface FilePreviewProps {
  file: {
    id: string
    name: string
    file_category: string
  }
  previewUrl?: string
  isVisible: boolean
  position: { x: number; y: number }
  onClose: () => void
}

export default function FilePreview({ 
  file, 
  previewUrl, 
  isVisible, 
  position, 
  onClose 
}: FilePreviewProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Reset states when file changes
  useEffect(() => {
    setImageLoaded(false)
    setImageError(false)
    
    // Set a timeout to show error if image doesn't load within 5 seconds
    const timeout = setTimeout(() => {
      if (!imageLoaded && !imageError) {
        console.log('Image loading timeout')
        setImageError(true)
      }
    }, 5000)
    
    return () => clearTimeout(timeout)
  }, [file.id, previewUrl, imageLoaded, imageError])

  // Auto-close after 3 seconds
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isVisible, onClose])

  const canPreview = file.file_category === 'image' && previewUrl && !imageError

  console.log('FilePreview render:', { 
    isVisible, 
    canPreview, 
    fileCategory: file.file_category, 
    hasPreviewUrl: !!previewUrl, 
    imageError 
  })

  if (!isVisible || !canPreview) return null

  return (
    <div
      className="fixed z-50 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200"
      style={{
        left: position.x,
        top: position.y - 10,
        transform: 'translate(-50%, -100%)',
        width: '200px',
        height: '150px'
      }}
    >
      <div className="relative w-full h-full">
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-900">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        )}
        {imageError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-500">
            <div className="text-xs text-center">
              <div>Preview failed</div>
              <div className="text-xs opacity-75 mt-1">Click to close</div>
            </div>
          </div>
        )}
        {!imageError && (
          <img
            src={previewUrl}
            alt={file.name}
            className={`w-full h-full object-cover transition-opacity duration-200 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => {
              console.log('Image loaded successfully')
              setImageLoaded(true)
            }}
            onError={(e) => {
              console.error('Image failed to load:', previewUrl, e)
              setImageError(true)
            }}
          />
        )}
      </div>
    </div>
  )
}
