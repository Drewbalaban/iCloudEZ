import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const { messageId, emoji } = body || {}

  if (!messageId || !emoji) {
    return NextResponse.json({ error: 'messageId and emoji required' }, { status: 400 })
  }

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
    // Verify user has access to the message
    const { data: message } = await supabase
      .from('messages')
      .select(`
        id,
        conversation_id,
        conversation_participants!inner(user_id)
      `)
      .eq('id', messageId)
      .eq('conversation_participants.user_id', user.id)
      .single()

    if (!message) {
      return NextResponse.json({ error: 'Message not found or access denied' }, { status: 404 })
    }

    // Add reaction (upsert to handle duplicate reactions)
    const { data: reaction, error } = await supabase
      .from('message_reactions')
      .upsert({
        message_id: messageId,
        user_id: user.id,
        emoji
      })
      .select(`
        *,
        profiles!message_reactions_user_id_fkey(id, username, full_name, avatar_url)
      `)
      .single()

    if (error) {
      console.error('Error adding reaction:', error)
      return NextResponse.json({ error: 'Failed to add reaction' }, { status: 500 })
    }

    return NextResponse.json({ reaction })
  } catch (error) {
    console.error('Error in add reaction API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const messageId = searchParams.get('messageId')
  const emoji = searchParams.get('emoji')

  if (!messageId || !emoji) {
    return NextResponse.json({ error: 'messageId and emoji required' }, { status: 400 })
  }

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
    // Remove reaction
    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji)

    if (error) {
      console.error('Error removing reaction:', error)
      return NextResponse.json({ error: 'Failed to remove reaction' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in remove reaction API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
