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

    // Rate limit key setup (per-user if authenticated, else per-IP for public)
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || (request as any).ip || 'unknown'

    // Allow unauthenticated access if document is public
    if (document.visibility === 'public' || document.is_public === true) {
      // Public downloads: rate limit by IP
      const { data: allowedIp, error: rlIpError } = await ssr.rpc('rate_limit_allow', {
        p_event_key: `download_ip:${clientIp}`,
        p_max_allowed: 60,
        p_window_seconds: 60,
      })
      if (rlIpError) {
        console.error('Download API: IP rate limit error:', rlIpError)
      }
      if (allowedIp === false) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
      }
    } else {
      // Require authentication for private/shared documents
      const { data: { user }, error: authError } = await ssr.auth.getUser()
      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      if (document.user_id !== user.id) {
        const { data: share, error: shareError } = await ssr
          .from('file_shares')
          .select('id, expires_at')
          .eq('document_id', documentId)
          .eq('shared_with', user.id)
          .single()

        if (shareError || !share) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        // Enforce share expiry if set
        if (share.expires_at && new Date(share.expires_at).getTime() <= Date.now()) {
          return NextResponse.json({ error: 'Share expired' }, { status: 403 })
        }
      }

      // Authenticated downloads: per-user rate limit
      const { data: allowedUser, error: rlUserError } = await ssr.rpc('rate_limit_allow', {
        p_event_key: `download:${(await ssr.auth.getUser()).data.user?.id ?? 'unknown'}`,
        p_max_allowed: 120,
        p_window_seconds: 60,
      })
      if (rlUserError) {
        console.error('Download API: user rate limit error:', rlUserError)
      }
      if (allowedUser === false) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
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

    // Increment metrics (best-effort)
    try {
      await (admin ?? ssr)
        .from('documents')
        .update({
          download_count: (document.download_count || 0) + 1,
          last_downloaded: new Date().toISOString(),
        })
        .eq('id', document.id)
    } catch (e) {
      // ignore metrics errors
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
