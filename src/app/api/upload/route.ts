import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } from '@/lib/env'

const supabaseUrl = PUBLIC_SUPABASE_URL
const supabaseServiceKey = SUPABASE_SERVICE_ROLE_KEY

// Only create admin client if we have valid credentials
const adminClient = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null

export async function POST(request: NextRequest) {
  if (!supabaseUrl) {
    return NextResponse.json(
      { error: 'Supabase not configured. Please set up your environment variables.' },
      { status: 503 }
    )
  }

  try {
    // Create SSR client to authenticate via cookies
    const ssr = createServerClient(
      supabaseUrl,
      PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll() {}
        }
      }
    )

    const { data: { user } } = await ssr.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const folder = (formData.get('folder') as string) || 'general'

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'Files are required' },
        { status: 400 }
      )
    }

    // Rate limit: limit upload requests per user (e.g., 30 requests/min)
    const { data: allowed, error: rlError } = await ssr.rpc('rate_limit_allow', {
      p_event_key: `upload:${user.id}`,
      p_max_allowed: 30,
      p_window_seconds: 60,
    })
    if (rlError) {
      console.error('Rate limit RPC error:', rlError)
    }
    if (allowed === false) {
      return NextResponse.json(
        { error: 'Too many upload requests. Please try again later.' },
        { status: 429 }
      )
    }

    const uploadResults = []
    const errors = []

    for (const file of files) {
      try {
        // Determine file type and organize accordingly
        const fileType = getFileType(file.type, file.name)
        const folderPath = folder === 'general' ? fileType : `${fileType}/${folder}`
        
        // Generate unique filename
        const timestamp = Date.now()
        const fileExtension = file.name.split('.').pop()
        const fileName = `${user.id}/${folderPath}/${timestamp}-${Math.random().toString(36).substring(2)}.${fileExtension}`

        // Upload file to Supabase Storage
        const storageClient = (adminClient ?? ssr).storage
        const { data, error } = await storageClient
          .from('documents')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (error) {
          console.error('Storage upload error:', error)
          errors.push({ fileName: file.name, error: 'Failed to upload file' })
          continue
        }

        // Get file metadata
        const { data: fileData } = await storageClient
          .from('documents')
          .getPublicUrl(fileName)

        // Insert document record into database
        const dbClient = adminClient ?? ssr
        const { data: docData, error: dbError } = await dbClient
          .from('documents')
          .insert({
            user_id: user.id,
            name: file.name,
            file_path: fileName,
            file_size: file.size,
            mime_type: file.type,
            file_category: fileType,
            folder: folder,
            visibility: 'private', // Default to private
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (dbError) {
          console.error('Database insert error:', dbError)
          // Clean up uploaded file if database insert fails
          await storageClient.from('documents').remove([fileName])
          errors.push({ fileName: file.name, error: 'Failed to save file metadata' })
          continue
        }

        uploadResults.push({
          success: true,
          document: docData,
          url: fileData.publicUrl,
          fileName: file.name
        })

      } catch (error) {
        console.error('File upload error:', error)
        errors.push({ fileName: file.name, error: 'Internal error' })
      }
    }

    return NextResponse.json({
      success: uploadResults.length > 0,
      uploaded: uploadResults,
      errors: errors,
      totalFiles: files.length,
      successfulUploads: uploadResults.length,
      failedUploads: errors.length
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to categorize files
function getFileType(mimeType: string, fileName: string): string {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType.includes('pdf')) return 'document'
  if (mimeType.includes('word') || mimeType.includes('document')) return 'document'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'spreadsheet'
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation'
  if (mimeType.includes('text/')) return 'document'
  if (mimeType.includes('archive') || fileName.endsWith('.zip') || fileName.endsWith('.rar')) return 'archive'
  if (fileName.endsWith('.js') || fileName.endsWith('.ts') || fileName.endsWith('.py') || fileName.endsWith('.java')) return 'code'
  return 'other'
}

export async function GET() {
  return NextResponse.json({ message: 'Upload endpoint' })
}
