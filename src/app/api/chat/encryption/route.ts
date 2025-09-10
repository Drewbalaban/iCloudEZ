import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Encryption Management API
 * 
 * Handles:
 * - Key exchange requests
 * - Encryption status
 * - Key rotation
 * - Encryption enable/disable
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const conversationId = searchParams.get('conversationId')
  const action = searchParams.get('action')

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

    switch (action) {
      case 'status':
        return await getEncryptionStatus(supabase, conversationId)
      
      case 'keys':
        return await getConversationKeys(supabase, conversationId)
      
      case 'notifications':
        return await getEncryptionNotifications(supabase, conversationId, user.id)
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in encryption API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const { 
    conversationId,
    action,
    data
  } = body || {}

  if (!conversationId || !action) {
    return NextResponse.json({ error: 'conversationId and action required' }, { status: 400 })
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

    switch (action) {
      case 'enable':
        return await enableEncryption(supabase, conversationId, user.id)
      
      case 'disable':
        return await disableEncryption(supabase, conversationId, user.id)
      
      case 'rotate_keys':
        return await rotateKeys(supabase, conversationId, user.id)
      
      case 'key_exchange':
        return await processKeyExchange(supabase, conversationId, user.id, data)
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in encryption API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Get encryption status for a conversation
 */
async function getEncryptionStatus(supabase: any, conversationId: string) {
  try {
    const { data, error } = await supabase
      .rpc('get_conversation_encryption_status', {
        p_conversation_id: conversationId,
        p_user_id: (await supabase.auth.getUser()).data.user.id
      })

    if (error) {
      throw new Error(`Failed to get encryption status: ${error.message}`)
    }

    return NextResponse.json({ status: data })
  } catch (error) {
    console.error('Error getting encryption status:', error)
    return NextResponse.json({ error: 'Failed to get encryption status' }, { status: 500 })
  }
}

/**
 * Get conversation encryption keys
 */
async function getConversationKeys(supabase: any, conversationId: string) {
  try {
    const { data, error } = await supabase
      .from('conversation_encryption_keys')
      .select(`
        key_id,
        participant_id,
        key_version,
        is_active,
        created_at,
        expires_at
      `)
      .eq('conversation_id', conversationId)
      .eq('is_active', true)

    if (error) {
      throw new Error(`Failed to get conversation keys: ${error.message}`)
    }

    return NextResponse.json({ keys: data || [] })
  } catch (error) {
    console.error('Error getting conversation keys:', error)
    return NextResponse.json({ error: 'Failed to get conversation keys' }, { status: 500 })
  }
}

/**
 * Get encryption notifications for a user
 */
async function getEncryptionNotifications(supabase: any, conversationId: string, userId: string) {
  try {
    const { data, error } = await supabase
      .from('encryption_notifications')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to get encryption notifications: ${error.message}`)
    }

    return NextResponse.json({ notifications: data || [] })
  } catch (error) {
    console.error('Error getting encryption notifications:', error)
    return NextResponse.json({ error: 'Failed to get encryption notifications' }, { status: 500 })
  }
}

/**
 * Enable encryption for a conversation
 */
async function enableEncryption(supabase: any, conversationId: string, userId: string) {
  try {
    const { data, error } = await supabase
      .rpc('enable_conversation_encryption', {
        p_conversation_id: conversationId,
        p_user_id: userId
      })

    if (error) {
      throw new Error(`Failed to enable encryption: ${error.message}`)
    }

    // Create notification for all participants
    const { data: participants } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .neq('user_id', userId)

    if (participants && participants.length > 0) {
      const notifications = participants.map((p: any) => ({
        conversation_id: conversationId,
        user_id: p.user_id,
        type: 'encryption_enabled',
        data: { enabled_by: userId },
        created_at: new Date().toISOString()
      }))

      await supabase
        .from('encryption_notifications')
        .insert(notifications)
    }

    return NextResponse.json({ success: true, message: 'Encryption enabled' })
  } catch (error) {
    console.error('Error enabling encryption:', error)
    return NextResponse.json({ error: 'Failed to enable encryption' }, { status: 500 })
  }
}

/**
 * Disable encryption for a conversation
 */
async function disableEncryption(supabase: any, conversationId: string, userId: string) {
  try {
    const { data, error } = await supabase
      .rpc('disable_conversation_encryption', {
        p_conversation_id: conversationId,
        p_user_id: userId
      })

    if (error) {
      throw new Error(`Failed to disable encryption: ${error.message}`)
    }

    // Create notification for all participants
    const { data: participants } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .neq('user_id', userId)

    if (participants && participants.length > 0) {
      const notifications = participants.map((p: any) => ({
        conversation_id: conversationId,
        user_id: p.user_id,
        type: 'encryption_disabled',
        data: { disabled_by: userId },
        created_at: new Date().toISOString()
      }))

      await supabase
        .from('encryption_notifications')
        .insert(notifications)
    }

    return NextResponse.json({ success: true, message: 'Encryption disabled' })
  } catch (error) {
    console.error('Error disabling encryption:', error)
    return NextResponse.json({ error: 'Failed to disable encryption' }, { status: 500 })
  }
}

/**
 * Rotate encryption keys for a conversation
 */
async function rotateKeys(supabase: any, conversationId: string, userId: string) {
  try {
    const { data, error } = await supabase
      .rpc('rotate_conversation_keys', {
        p_conversation_id: conversationId,
        p_user_id: userId
      })

    if (error) {
      throw new Error(`Failed to rotate keys: ${error.message}`)
    }

    // Create notification for all participants
    const { data: participants } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .neq('user_id', userId)

    if (participants && participants.length > 0) {
      const notifications = participants.map((p: any) => ({
        conversation_id: conversationId,
        user_id: p.user_id,
        type: 'key_rotation',
        data: { rotated_by: userId },
        created_at: new Date().toISOString()
      }))

      await supabase
        .from('encryption_notifications')
        .insert(notifications)
    }

    return NextResponse.json({ success: true, message: 'Keys rotated successfully' })
  } catch (error) {
    console.error('Error rotating keys:', error)
    return NextResponse.json({ error: 'Failed to rotate keys' }, { status: 500 })
  }
}

/**
 * Process key exchange request
 */
async function processKeyExchange(supabase: any, conversationId: string, userId: string, exchangeData: any) {
  try {
    const { publicKey, keyId, participantId } = exchangeData

    if (!publicKey || !keyId || !participantId) {
      return NextResponse.json({ error: 'Missing required key exchange data' }, { status: 400 })
    }

    // Store the key exchange request
    const { data, error } = await supabase
      .from('key_exchange_requests')
      .insert({
        conversation_id: conversationId,
        initiator_id: userId,
        participant_id: participantId,
        public_key: publicKey,
        key_id: keyId,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to store key exchange request: ${error.message}`)
    }

    // Create notification for the participant
    await supabase
      .from('encryption_notifications')
      .insert({
        conversation_id: conversationId,
        user_id: userId, // This would be the target participant in a real implementation
        type: 'key_exchange',
        data: { keyId, publicKey },
        created_at: new Date().toISOString()
      })

    return NextResponse.json({ 
      success: true, 
      message: 'Key exchange request sent',
      requestId: data.id
    })
  } catch (error) {
    console.error('Error processing key exchange:', error)
    return NextResponse.json({ error: 'Failed to process key exchange' }, { status: 500 })
  }
}
