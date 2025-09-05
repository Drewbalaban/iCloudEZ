import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const conversationId = searchParams.get('conversationId')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId required' }, { status: 400 })
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
    // Verify user is participant in conversation
    const { data: participant } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single()

    if (!participant) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get messages
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        *,
        profiles!messages_sender_id_fkey(id, username, full_name, avatar_url),
        message_reactions(
          *,
          profiles!message_reactions_user_id_fkey(id, username, full_name, avatar_url)
        )
      `)
      .eq('conversation_id', conversationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching messages:', error)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    // Get read receipts for messages
    const messageIds = messages.map(m => m.id)
    const { data: readReceipts } = await supabase
      .from('message_read_receipts')
      .select('message_id, user_id, read_at')
      .in('message_id', messageIds)

    // Attach read receipts to messages
    const messagesWithReceipts = messages.map(message => ({
      ...message,
      read_receipts: readReceipts?.filter(rr => rr.message_id === message.id) || []
    }))

    return NextResponse.json({ messages: messagesWithReceipts })
  } catch (error) {
    console.error('Error in messages API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const { 
    conversationId, 
    content, 
    messageType = 'text',
    attachmentUrl,
    attachmentName,
    attachmentSize,
    attachmentMimeType,
    replyToId
  } = body || {}

  if (!conversationId || !content) {
    return NextResponse.json({ error: 'conversationId and content required' }, { status: 400 })
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
    // Verify user is participant in conversation
    const { data: participant } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single()

    if (!participant) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Create message
    const messageData = {
      conversation_id: conversationId,
      sender_id: user.id,
      content,
      message_type: messageType,
      attachment_url: attachmentUrl || null,
      attachment_name: attachmentName || null,
      attachment_size: attachmentSize || null,
      attachment_mime_type: attachmentMimeType || null,
      reply_to_id: replyToId || null
    }

    const { data: message, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select(`
        *,
        profiles!messages_sender_id_fkey(id, username, full_name, avatar_url)
      `)
      .single()

    if (error) {
      console.error('Error creating message:', error)
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    return NextResponse.json({ message })
  } catch (error) {
    console.error('Error in send message API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
