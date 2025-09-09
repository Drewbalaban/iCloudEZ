import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
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

  try {
    // First get friend IDs
    const { data: friendships } = await supabase
      .from('friend_requests')
      .select('requester, recipient')
      .or(`requester.eq.${user.id},recipient.eq.${user.id}`)
      .eq('status', 'accepted')

    if (!friendships || friendships.length === 0) {
      return NextResponse.json({ presence: [] })
    }

    // Extract friend IDs
    const friendIds = friendships.map(f => 
      f.requester === user.id ? f.recipient : f.requester
    )

    // Get friends' presence
    const { data: presence, error } = await supabase
      .from('user_presence')
      .select(`
        *,
        profiles!user_presence_user_id_fkey(id, username, full_name, avatar_url)
      `)
      .in('user_id', friendIds)

    if (error) {
      console.error('Error fetching presence:', error)
      return NextResponse.json({ error: 'Failed to fetch presence' }, { status: 500 })
    }

    return NextResponse.json({ presence: presence || [] })
  } catch (error) {
    console.error('Error in presence API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const { status, customStatus, isTyping, typingInConversationId } = body || {}

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

  try {
    const updateData: Record<string, unknown> = {
      user_id: user.id,
      last_seen: new Date().toISOString()
    }

    if (status !== undefined) {
      updateData.status = status
    }

    if (customStatus !== undefined) {
      updateData.custom_status = customStatus
    }

    if (isTyping !== undefined) {
      updateData.is_typing = isTyping
      updateData.typing_in_conversation_id = isTyping ? typingInConversationId : null
    }

    const { data: presence, error } = await supabase
      .from('user_presence')
      .upsert(updateData)
      .select(`
        *,
        profiles!user_presence_user_id_fkey(id, username, full_name, avatar_url)
      `)
      .single()

    if (error) {
      console.error('Error updating presence:', error)
      return NextResponse.json({ error: 'Failed to update presence' }, { status: 500 })
    }

    return NextResponse.json({ presence })
  } catch (error) {
    console.error('Error in update presence API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
