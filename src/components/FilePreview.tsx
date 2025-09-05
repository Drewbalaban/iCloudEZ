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
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

export default function FilePreview({ 
  file, 
  previewUrl, 
  isVisible, 
  position, 
  onClose,
  onMouseEnter,
  onMouseLeave
}: FilePreviewProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Reset image state when preview becomes visible or when previewUrl changes
  useEffect(() => {
    if (isVisible && previewUrl) {
      setImageLoaded(false)
      setImageError(false)
      
      // Preload the image to avoid loading state on first hover
      const img = new Image()
      img.onload = () => setImageLoaded(true)
      img.onerror = () => setImageError(true)
      img.src = previewUrl
    }
  }, [isVisible, previewUrl])

  const canPreview = file.file_category === 'image' && previewUrl


  if (!isVisible || !canPreview) return null

  return (
    <div
      className="fixed z-50 transition-all duration-300 ease-out"
      style={{
        left: position.x,
        top: position.y - 10,
        transform: 'translate(-50%, -100%)',
        width: '280px',
        height: '220px',
        filter: 'drop-shadow(0 25px 50px rgba(0, 0, 0, 0.15))'
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div 
        className="w-full h-full backdrop-blur-lg rounded-2xl overflow-hidden relative"
        style={{
          background: `
            radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.2) 0%, transparent 50%),
            linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 100%),
            rgba(255, 255, 255, 0.9)
          `,
          boxShadow: `
            inset 0 1px 0 0 rgba(255, 255, 255, 0.2),
            0 0 0 1px rgba(255, 255, 255, 0.1),
            0 0 60px rgba(0, 0, 0, 0.15),
            0 0 120px rgba(255, 255, 255, 0.2)
          `
        }}
      >
        {/* Feathered edge overlay for cloud effect */}
        <div 
          className="absolute inset-0 rounded-2xl"
          style={{
            background: `
              radial-gradient(ellipse at center, transparent 50%, rgba(255, 255, 255, 0.6) 100%),
              radial-gradient(ellipse at 20% 80%, transparent 60%, rgba(255, 255, 255, 0.4) 100%),
              radial-gradient(ellipse at 80% 20%, transparent 60%, rgba(255, 255, 255, 0.4) 100%),
              linear-gradient(45deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%)
            `,
            mixBlendMode: 'soft-light'
          }}
        />
        
        {/* Additional soft glow overlay */}
        <div 
          className="absolute inset-0 rounded-2xl"
          style={{
            background: `
              radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.3) 0%, transparent 60%)
            `,
            filter: 'blur(2px)',
            mixBlendMode: 'overlay'
          }}
        />
        <div className="relative w-full h-full z-10">
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl backdrop-blur-sm">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          )}
          {imageError && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl backdrop-blur-sm">
              <div className="text-slate-500 text-sm">Failed to load</div>
            </div>
          )}
          <img
            src={previewUrl}
            alt={file.name}
            className={`w-full h-full object-cover rounded-2xl transition-opacity duration-200 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            style={{ display: imageError ? 'none' : 'block' }}
          />
        </div>
      </div>
    </div>
  )
}
