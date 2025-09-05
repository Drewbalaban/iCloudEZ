import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '@/lib/env'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('Document preview API called for file ID:', params.id)
    
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
    console.log('Auth check:', { user: !!user, userId: user?.id, error: authError?.message })
    
    if (authError || !user) {
      console.log('Authentication failed:', { authError, hasUser: !!user })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get file info from database
    const { data: file, error: fileError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    console.log('File query result:', { file: !!file, error: fileError?.message })

    if (fileError || !file) {
      console.log('File not found or access denied')
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    console.log('File found:', { name: file.name, category: file.file_category })

    // Check if file is a document type we can preview
    const documentExtensions = ['.md', '.txt', '.pdf', '.doc', '.docx', '.rtf', '.csv', '.json', '.xml', '.yaml', '.yml']
    const isPreviewableDocument = 
      file.file_category === 'document' ||
      documentExtensions.some(ext => file.name.toLowerCase().endsWith(ext))

    if (!isPreviewableDocument) {
      return NextResponse.json({ error: 'File type not supported for preview' }, { status: 400 })
    }

    // Download file content from Supabase Storage
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
      // For PDFs, we'll need a PDF parsing library
      // For now, return a placeholder
      content = '📄 PDF Document\n\nThis is a PDF document that contains rich content including text, images, and formatting.\n\nFull PDF preview functionality will be available in a future update. You can download the file to view its complete contents.'
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
        }
      } catch (error) {
        content = `Unable to preview this ${fileName.split('.').pop()?.toUpperCase()} file.\n\nThe file may be binary or in a format that requires special handling.\n\nPlease download the file to view its contents.`
      }
    }

    // Limit content length for preview
    const maxLength = 1000
    if (content.length > maxLength) {
      content = content.substring(0, maxLength) + '...'
    }

    console.log('Successfully processed document preview, returning:', {
      contentLength: content.length,
      fileName: file.name
    })
    
    return NextResponse.json({ 
      content,
      fileName: file.name,
      fileSize: file.file_size,
      mimeType: file.mime_type
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
