import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const { friendId } = body || {}
  if (!friendId) return NextResponse.json({ error: 'friendId required' }, { status: 400 })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: { getAll() { return request.cookies.getAll() }, setAll() {} }
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Rate limit unfriend actions per user (e.g., 60 per hour)
  const { data: allowed, error: rlError } = await supabase.rpc('rate_limit_allow', {
    p_event_key: `unfriend:${user.id}`,
    p_max_allowed: 60,
    p_window_seconds: 3600,
  })
  if (rlError) {
    console.error('Rate limit RPC error:', rlError)
  }
  if (allowed === false) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  // Delete all accepted friendship rows between the two users (both directions)
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const admin = adminKey ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, adminKey) : null
  const client = admin ?? supabase
  const { error } = await client
    .from('friend_requests')
    .delete()
    .eq('status', 'accepted')
    .or(`and(requester.eq.${user.id},recipient.eq.${friendId}),and(requester.eq.${friendId},recipient.eq.${user.id})`)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}


