import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const { recipientId } = body || {}
  if (!recipientId) return NextResponse.json({ error: 'recipientId required' }, { status: 400 })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll() {}
      }
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.id === recipientId) return NextResponse.json({ error: 'Cannot friend yourself' }, { status: 400 })

  // Rate limit friend requests per user (e.g., 20 per hour)
  const { data: allowed, error: rlError } = await supabase.rpc('rate_limit_allow', {
    p_event_key: `friend_request:${user.id}`,
    p_max_allowed: 20,
    p_window_seconds: 3600,
  })
  if (rlError) {
    console.error('Rate limit RPC error:', rlError)
  }
  if (allowed === false) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  // Check existing
  const { data: existing } = await supabase
    .from('friend_requests')
    .select('id,status')
    .or(`and(requester.eq.${user.id},recipient.eq.${recipientId}),and(requester.eq.${recipientId},recipient.eq.${user.id})`)
    .limit(1)
    .single()
  if (existing) {
    return NextResponse.json({ error: `Already ${existing.status}` }, { status: 400 })
  }

  // Use service role to bypass RLS for server-side action
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const admin = adminKey ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, adminKey) : null

  const client = admin ?? supabase
  const { error } = await client
    .from('friend_requests')
    .insert({ requester: user.id, recipient: recipientId, status: 'pending' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}


