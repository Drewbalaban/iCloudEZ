'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface FilePreviewProps {
  file: {
    id: string
    name: string
    file_category: string
  }
  previewUrl?: string
  isVisible: boolean
  position: { x: number; y: number }
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

export default function FilePreview({ 
  file, 
  previewUrl, 
  isVisible, 
  position, 
  onMouseEnter,
  onMouseLeave
}: FilePreviewProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [documentContent, setDocumentContent] = useState<string>('')
  const [documentLoading, setDocumentLoading] = useState(false)
  const [documentError, setDocumentError] = useState(false)

  // Fetch document content for text-based files (client-side PDF handled separately)
  useEffect(() => {
    if (isVisible && isDocumentFile(file) && !file.name.toLowerCase().endsWith('.pdf')) {
      setDocumentLoading(true)
      setDocumentError(false)
      setDocumentContent('')
      
      fetchDocumentPreview(file.id)
        .then(content => {
          setDocumentContent(content)
          setDocumentLoading(false)
        })
        .catch(error => {
          console.error('Failed to fetch document preview:', error)
          setDocumentError(true)
          setDocumentLoading(false)
        })
    }
  }, [isVisible, file])

  // Client-side PDF first-page text extraction using pdfjs-dist (avoids server issues)
  useEffect(() => {
    const isPdf = file.name.toLowerCase().endsWith('.pdf')
    if (!isVisible || !isPdf) return

    let cancelled = false
    async function loadPdf() {
      try {
        setDocumentLoading(true)
        setDocumentError(false)
        setDocumentContent('')

        // Dynamically load the UMD build of pdf.js from CDN to avoid bundling issues
        const ensurePdfJs = () => new Promise<unknown>((resolve, reject) => {
          // If already loaded, resolve immediately
          const existing = (window as { pdfjsLib?: unknown }).pdfjsLib
          if (existing) return resolve(existing)

          const script = document.createElement('script')
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
          script.async = true
          script.onload = () => resolve((window as unknown as { pdfjsLib: unknown }).pdfjsLib)
          script.onerror = reject
          document.head.appendChild(script)
        })

        const pdfjs = await ensurePdfJs() as { GlobalWorkerOptions: { workerSrc: string }; getDocument: (options: { url: string; withCredentials: boolean }) => { promise: Promise<{ getPage: (pageNum: number) => Promise<{ getTextContent: () => Promise<{ items: Array<{ str: string }> }> }> }> } }
        pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

        // Prefer direct file URL if available on the file object
        // Prefer a signed URL from the API response if available on previewUrl-like field
        const sourceUrl = (file as { url?: string }).url || (previewUrl as string | undefined)
        if (!sourceUrl) throw new Error('No PDF URL available')

        const loadingTask = pdfjs.getDocument({ url: sourceUrl, withCredentials: false })
        const pdf = await loadingTask.promise
        const page = await pdf.getPage(1)
        const text = await page.getTextContent()
        const strings = text.items.map((i: { str: string }) => i.str).filter(Boolean)
        const snippet = strings.join(' ').trim()

        if (!cancelled) {
          setDocumentContent(snippet || 'No selectable text on first page.')
          setDocumentLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('PDF preview (client) error:', err)
          setDocumentError(true)
          setDocumentLoading(false)
        }
      }
    }

    loadPdf()
    return () => { cancelled = true }
  }, [isVisible, file, previewUrl])

  // Reset image state when preview becomes visible or when previewUrl changes
  useEffect(() => {
    if (isVisible && previewUrl && file.file_category === 'image') {
      setImageLoaded(false)
      setImageError(false)
      
      // Preload the image to avoid loading state on first hover
      const img = new window.Image()
      img.onload = () => setImageLoaded(true)
      img.onerror = () => setImageError(true)
      img.src = previewUrl
    }
  }, [isVisible, previewUrl, file.file_category])

  // Helper functions
  const isDocumentFile = (file: { file_category: string; name: string }) => {
    const documentExtensions = ['.md', '.txt', '.pdf', '.doc', '.docx', '.rtf', '.csv', '.json', '.xml', '.yaml', '.yml']
    const fileName = file.name.toLowerCase()
    return file.file_category === 'document' || 
           documentExtensions.some(ext => fileName.endsWith(ext))
  }

  const getFileTypeIcon = (fileName: string) => {
    const name = fileName.toLowerCase()
    if (name.endsWith('.pdf')) return '📄'
    if (name.endsWith('.md')) return '📝'
    if (name.endsWith('.txt')) return '📃'
    if (name.endsWith('.doc') || name.endsWith('.docx')) return '📘'
    if (name.endsWith('.csv')) return '📊'
    if (name.endsWith('.json') || name.endsWith('.xml')) return '🔧'
    return '📄'
  }

  const fetchDocumentPreview = async (fileId: string): Promise<string> => {
    try {
      const response = await fetch(`/api/files/preview/${fileId}`)
      
      if (!response.ok) {
        const responseText = await response.text()
        let errorData = { error: 'Unknown error' }
        try {
          errorData = JSON.parse(responseText)
        } catch {
          errorData = { error: responseText || 'Unknown error' }
        }
        throw new Error(`Failed to fetch document preview: ${response.status} - ${errorData.error || response.statusText}`)
      }
      
      const data = await response.json()
      return data.content || 'No content available'
    } catch (err) {
      if (err instanceof Error) {
        console.error('Document preview error:', err.message)
      } else {
        console.error('Document preview error:', err)
      }
      throw err
    }
  }

  const canPreview = (file.file_category === 'image' && previewUrl) || isDocumentFile(file)


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
          className="absolute inset-0 rounded-2xl z-0 pointer-events-none"
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
          className="absolute inset-0 rounded-2xl z-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.3) 0%, transparent 60%)
            `,
            filter: 'blur(2px)',
            mixBlendMode: 'overlay'
          }}
        />
        <div className="relative w-full h-full z-20">
          {/* Image Preview */}
          {file.file_category === 'image' && (
            <>
              {!imageLoaded && !imageError && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl backdrop-blur-sm">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              )}
              {imageError && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl backdrop-blur-sm">
                  <div className="text-slate-500 text-sm">Failed to load image</div>
                </div>
              )}
              {previewUrl && (
                <Image
                  src={previewUrl}
                  alt={file.name}
                  fill
                  className={`object-cover rounded-2xl transition-opacity duration-200 ${
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                  style={{ display: imageError ? 'none' : 'block' }}
                />
              )}
            </>
          )}

          {/* Document Preview */}
          {isDocumentFile(file) && (
            <div className="p-4 h-full overflow-hidden">
              {documentLoading && (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              )}
              {documentError && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-slate-500 text-sm text-center">
                    <div className="mb-2 text-2xl">{getFileTypeIcon(file.name)}</div>
                    <div>Preview unavailable</div>
                  </div>
                </div>
              )}
              {documentContent && !documentLoading && !documentError && (
                <div className="h-full">
                  <div className="flex items-center mb-2">
                    <span className="text-lg mr-2">{getFileTypeIcon(file.name)}</span>
                    <div className="text-xs font-medium text-slate-700 dark:text-slate-700 truncate">
                      {file.name}
                    </div>
                  </div>
                  <div className="text-xs text-slate-900 dark:text-slate-900 leading-relaxed overflow-hidden h-[calc(100%-2rem)]">
                    <div className="whitespace-pre-wrap break-words overflow-y-auto h-full pr-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
                      {documentContent.length > 400 
                        ? `${documentContent.substring(0, 400)}...` 
                        : documentContent
                      }
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
