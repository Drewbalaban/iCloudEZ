import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

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
      .select('*')
      .eq('conversation_id', conversationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching messages:', error)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json({ messages: [] })
    }

    // Get profiles for all message senders
    const senderIds = [...new Set(messages.map(m => m.sender_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', senderIds)

    // Get message reactions
    const messageIds = messages.map(m => m.id)
    const { data: reactions } = await supabase
      .from('message_reactions')
      .select('*')
      .in('message_id', messageIds)

    // Get profiles for reaction users
    const reactionUserIds = reactions ? [...new Set(reactions.map(r => r.user_id))] : []
    const { data: reactionProfiles } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', reactionUserIds)

    // Get read receipts for messages
    const { data: readReceipts } = await supabase
      .from('message_read_receipts')
      .select('message_id, user_id, read_at')
      .in('message_id', messageIds)

    // Combine all data
    const messagesWithData = messages.map(message => {
      const senderProfile = profiles?.find(p => p.id === message.sender_id)
      const messageReactions = reactions?.filter(r => r.message_id === message.id) || []
      const reactionsWithProfiles = messageReactions.map(reaction => ({
        ...reaction,
        profiles: reactionProfiles?.find(p => p.id === reaction.user_id) || null
      }))

      return {
        id: message.id,
        content: message.content,
        created_at: message.created_at,
        message_type: message.message_type,
        sender: {
          id: message.sender_id,
          username: senderProfile?.username || 'Unknown',
          avatar_url: senderProfile?.avatar_url || null
        },
        reply_to: message.reply_to_id ? {
          id: message.reply_to_id,
          content: '', // We'd need to fetch this separately if needed
          sender: {
            username: 'Unknown' // We'd need to fetch this separately if needed
          }
        } : undefined,
        message_reactions: reactionsWithProfiles,
        read_receipts: readReceipts?.filter(rr => rr.message_id === message.id) || []
      }
    })

    return NextResponse.json({ messages: messagesWithData })
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
      .select('*')
      .single()

    if (error) {
      console.error('Error creating message:', error)
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    // Get sender profile
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .eq('id', user.id)
      .single()

    const messageWithProfile = {
      id: message.id,
      content: message.content,
      created_at: message.created_at,
      message_type: message.message_type,
      sender: {
        id: message.sender_id,
        username: senderProfile?.username || 'Unknown',
        avatar_url: senderProfile?.avatar_url || null
      },
      reply_to: message.reply_to_id ? {
        id: message.reply_to_id,
        content: '', // We'd need to fetch this separately if needed
        sender: {
          username: 'Unknown' // We'd need to fetch this separately if needed
        }
      } : undefined
    }

    return NextResponse.json({ message: messageWithProfile })
  } catch (error) {
    console.error('Error in send message API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
