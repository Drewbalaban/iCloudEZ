import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

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
    // Get conversations where user is a participant
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select(`
        *,
        conversation_participants!inner(
          user_id,
          last_read_at,
          is_muted,
          is_archived
        )
      `)
      .eq('conversation_participants.user_id', user.id)
      .eq('is_active', true)
      .order('last_message_at', { ascending: false, nullsFirst: false })

    if (error) {
      console.error('Error fetching conversations:', error)
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
    }

    // Get participants for each conversation
    const conversationsWithParticipants = await Promise.all(
      conversations.map(async (conversation) => {
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select(`
            *,
            profiles!inner(id, username, full_name, avatar_url)
          `)
          .eq('conversation_id', conversation.id)

        return {
          ...conversation,
          participants: participants || []
        }
      })
    )

    return NextResponse.json({ conversations: conversationsWithParticipants })
  } catch (error) {
    console.error('Error in conversations API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const { friendId, type = 'direct', name, description } = body || {}

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
    let conversationId: string

    if (type === 'direct') {
      if (!friendId) {
        return NextResponse.json({ error: 'friendId required for direct conversation' }, { status: 400 })
      }

      // Check if users are friends
      const { data: friendship } = await supabase
        .from('friend_requests')
        .select('id')
        .or(`and(requester.eq.${user.id},recipient.eq.${friendId}),and(requester.eq.${friendId},recipient.eq.${user.id})`)
        .eq('status', 'accepted')
        .single()

      if (!friendship) {
        return NextResponse.json({ error: 'Users must be friends to start a conversation' }, { status: 403 })
      }

      // Use service role to create direct conversation
      const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      const admin = adminKey ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, adminKey) : null
      const client = admin ?? supabase

      const { data, error: rpcError } = await client.rpc('create_direct_conversation', {
        user1_id: user.id,
        user2_id: friendId
      })

      if (rpcError) {
        console.error('Error creating direct conversation:', rpcError)
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
      }

      conversationId = data
    } else {
      // Create group conversation
      if (!name) {
        return NextResponse.json({ error: 'name required for group conversation' }, { status: 400 })
      }

      const { data: conversation, error: createError } = await supabase
        .from('conversations')
        .insert({
          type: 'group',
          name,
          description,
          created_by: user.id
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating group conversation:', createError)
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
      }

      conversationId = conversation.id

      // Add creator as admin participant
      const { error: participantError } = await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: conversationId,
          user_id: user.id,
          role: 'admin'
        })

      if (participantError) {
        console.error('Error adding creator as participant:', participantError)
        return NextResponse.json({ error: 'Failed to add participant' }, { status: 500 })
      }
    }

    // Fetch the created conversation with participants
    const { data: createdConversation, error: fetchError } = await supabase
      .from('conversations')
      .select(`
        *,
        conversation_participants(
          *,
          profiles!inner(id, username, full_name, avatar_url)
        )
      `)
      .eq('id', conversationId)
      .single()

    if (fetchError) {
      console.error('Error fetching created conversation:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch conversation' }, { status: 500 })
    }

    return NextResponse.json({ conversation: createdConversation })
  } catch (error) {
    console.error('Error in create conversation API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
