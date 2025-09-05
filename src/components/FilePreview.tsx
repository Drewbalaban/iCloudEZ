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

  // Auto-close after 3 seconds
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isVisible, onClose])

  const canPreview = file.file_category === 'image' && previewUrl

  if (!isVisible || !canPreview) return null

  return (
    <div
      className="fixed z-50 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
      style={{
        left: position.x,
        top: position.y - 10,
        transform: 'translate(-50%, -100%)',
        width: '200px',
        height: '150px'
      }}
    >
      <div className="relative w-full h-full">
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-900">
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
        />
      </div>
    </div>
  )
}
