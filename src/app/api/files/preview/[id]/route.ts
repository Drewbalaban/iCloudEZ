import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '@/lib/env'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    // Create SSR client to authenticate via cookies (matching upload route pattern)
    const supabase = createServerClient(
      PUBLIC_SUPABASE_URL,
      PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll() {}
        }
      }
    )
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('Auth failed:', authError?.message)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get file info from database
    const { data: file, error: fileError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fileError || !file) {
      console.log('File not found:', fileError?.message)
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    console.log('Processing file:', file.name, file.file_category)

    // Check if file is a document type we can preview
    const documentExtensions = ['.md', '.txt', '.pdf', '.doc', '.docx', '.rtf', '.csv', '.json', '.xml', '.yaml', '.yml']
    const isPreviewableDocument = 
      file.file_category === 'document' ||
      documentExtensions.some(ext => file.name.toLowerCase().endsWith(ext))

    if (!isPreviewableDocument) {
      return NextResponse.json({ error: 'File type not supported for preview' }, { status: 400 })
    }

    // Create a short-lived signed URL for client-side viewers (e.g., PDF)
    const { data: signedUrlData } = await supabase.storage
      .from('documents')
      .createSignedUrl(file.file_path, 300)

    // Download file content from Supabase Storage (for server-side text extraction)
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(file.file_path)

    if (downloadError || !fileData) {
      return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
    }

    // Convert to text based on file type
    let content = ''
    const fileName = file.name.toLowerCase()
    
    if (fileName.endsWith('.pdf')) {
      // Extract text from the first page using pdfjs-dist (more reliable in edge/server envs)
      try {
        const pdfjsLib = await import('pdfjs-dist')
        const getDocument = pdfjsLib.getDocument || (pdfjsLib as { default: { getDocument: unknown } }).default.getDocument
        const buffer = await fileData.arrayBuffer()
        const loadingTask = getDocument({ data: buffer })
        const pdf = await loadingTask.promise
        const page = await pdf.getPage(1)
        const textContent = await page.getTextContent() as { items?: Array<{ str: string }> }
        const strings: string[] = textContent.items?.map((i) => i.str).filter(Boolean) || []
        content = strings.join(' ').trim() || 'No selectable text on first page.'
      } catch (pdfError) {
        console.error('PDF parsing error (pdfjs):', pdfError)
        content = '📄 PDF Document\n\nUnable to extract text from this PDF file. It may contain images, complex formatting, or be password protected.\n\nPlease download the file to view its complete contents.'
      }
    } else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
      // For Word documents
      content = '📘 Word Document\n\nThis is a Microsoft Word document that may contain formatted text, images, tables, and other rich content.\n\nTo view the complete document with all formatting preserved, please download the file.'
    } else {
      try {
        // For text-based files (MD, TXT, CSV, JSON, etc.)
        content = await fileData.text()
        
        // Add some formatting hints for different file types
        if (fileName.endsWith('.json')) {
          try {
            const jsonData = JSON.parse(content)
            content = JSON.stringify(jsonData, null, 2)
          } catch {
            // Keep original content if JSON parsing fails
          }
        } else if (fileName.endsWith('.md')) {
          // Clean up markdown for better preview display
          content = content
            // Remove excessive line breaks
            .replace(/\n{3,}/g, '\n\n')
            // Clean up headers for preview
            .replace(/^#{1,6}\s+/gm, '')
            // Remove markdown links but keep text
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            // Remove bold/italic markers for cleaner preview
            .replace(/\*\*([^*]+)\*\*/g, '$1')
            .replace(/\*([^*]+)\*/g, '$1')
            .replace(/__([^_]+)__/g, '$1')
            .replace(/_([^_]+)_/g, '$1')
        }
      } catch {
        content = `Unable to preview this ${fileName.split('.').pop()?.toUpperCase()} file.\n\nThe file may be binary or in a format that requires special handling.\n\nPlease download the file to view its contents.`
      }
    }

    // Limit content length for preview
    const maxLength = 1000
    if (content.length > maxLength) {
      content = content.substring(0, maxLength) + '...'
    }

    // Successfully processed document preview
    
    return NextResponse.json({ 
      content,
      fileName: file.name,
      fileSize: file.file_size,
      mimeType: file.mime_type,
      fileUrl: signedUrlData?.signedUrl || null
    })

  } catch (error) {
    console.error('Error fetching file preview:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
