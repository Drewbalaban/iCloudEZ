import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Start download request
    const documentId = id

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    // Admin client for safe server-side checks and signing URLs
    const admin = serviceKey ? createClient(supabaseUrl, serviceKey) : null

    // SSR client (reads cookies) for authenticated access checks
    const ssr = createServerClient(
      supabaseUrl,
      anonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll() {
            // no-op for this read-only handler
          },
        },
      }
    )

    // Fetch document details first (prefer admin to bypass RLS for metadata)
    const { data: document, error: docError } = await (admin ?? ssr)
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Allow unauthenticated access if document is public
    if (document.visibility === 'public' || document.is_public === true) {
      // proceed without auth
    } else {
      // Require authentication for private/shared documents
      const { data: { user }, error: authError } = await ssr.auth.getUser()
      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      if (document.user_id !== user.id) {
        const { data: share, error: shareError } = await ssr
          .from('file_shares')
          .select('*')
          .eq('document_id', documentId)
          .eq('shared_with', user.id)
          .single()

        if (shareError || !share) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }
      }
    }

    // Use admin client if available to guarantee signing, otherwise fall back to ssr
    const storageClient = (admin ?? ssr).storage
    const { data: signedUrlData, error: signedUrlError } = await storageClient
      .from('documents')
      .createSignedUrl(document.file_path, 60)

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error('🔍 Download API: Error creating signed URL:', signedUrlError)
      return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      signedUrl: signedUrlData.signedUrl,
      fileName: document.name,
      fileSize: document.file_size,
    })

  } catch (error) {
    console.error('Download API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
