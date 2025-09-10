/**
 * Key Exchange Service for End-to-End Encryption
 * 
 * This service handles the secure exchange of encryption keys between
 * conversation participants using a hybrid approach:
 * 1. ECDH for initial key exchange
 * 2. AES-GCM for message encryption
 * 3. Forward secrecy with key rotation
 */

import { encryptionService, EncryptionKey, ConversationKey } from './encryption.service'
import { supabase } from './supabase'

export interface KeyExchangeRequest {
  conversationId: string
  participantId: string
  publicKey: string
  keyId: string
  timestamp: string
}

export interface KeyExchangeResponse {
  success: boolean
  conversationKey?: string
  error?: string
}

export interface ParticipantKey {
  userId: string
  publicKey: string
  keyId: string
  isActive: boolean
  lastUpdated: string
}

export class KeyExchangeService {
  private static instance: KeyExchangeService
  private pendingExchanges: Map<string, Map<string, KeyExchangeRequest>> = new Map()

  private constructor() {}

  public static getInstance(): KeyExchangeService {
    if (!KeyExchangeService.instance) {
      KeyExchangeService.instance = new KeyExchangeService()
    }
    return KeyExchangeService.instance
  }

  /**
   * Initialize key exchange for a new conversation
   */
  async initializeKeyExchange(
    conversationId: string,
    participantIds: string[]
  ): Promise<boolean> {
    try {
      // Generate a new key pair for this user
      const userKeyPair = await encryptionService.generateKeyPair()
      
      // Store the user's public key in the database
      await this.storeUserPublicKey(userKeyPair)

      // Generate a conversation-specific encryption key
      const conversationKey = await encryptionService.generateConversationKey()
      
      // Store the conversation key
      encryptionService.storeConversationKey(
        conversationId,
        userKeyPair.keyId,
        conversationKey
      )

      // Send key exchange requests to all participants
      const keyExchangeRequest: KeyExchangeRequest = {
        conversationId,
        participantId: userKeyPair.keyId, // Using keyId as participant identifier
        publicKey: await encryptionService.exportPublicKey(userKeyPair.publicKey),
        keyId: userKeyPair.keyId,
        timestamp: new Date().toISOString()
      }

      // Store the key exchange request
      await this.storeKeyExchangeRequest(keyExchangeRequest)

      // Notify other participants about the key exchange
      await this.notifyParticipants(conversationId, participantIds, keyExchangeRequest)

      return true
    } catch (error) {
      console.error('Error initializing key exchange:', error)
      return false
    }
  }

  /**
   * Process a key exchange request from another participant
   */
  async processKeyExchangeRequest(
    request: KeyExchangeRequest,
    currentUserId: string
  ): Promise<KeyExchangeResponse> {
    try {
      // Import the participant's public key
      const participantPublicKey = await encryptionService.importPublicKey(request.publicKey)
      
      // Get our private key
      const ourPrivateKey = encryptionService.keyStore.get(request.keyId)
      if (!ourPrivateKey) {
        throw new Error('Private key not found')
      }

      // Derive shared secret
      const sharedSecret = await encryptionService.deriveSharedSecret(
        ourPrivateKey,
        participantPublicKey
      )

      // Generate a new conversation key
      const conversationKey = await encryptionService.generateConversationKey()
      
      // Encrypt the conversation key with the shared secret
      const encryptedConversationKey = await encryptionService.encryptMessage(
        await this.exportKeyAsString(conversationKey),
        sharedSecret
      )

      // Store the conversation key
      encryptionService.storeConversationKey(
        request.conversationId,
        request.keyId,
        conversationKey
      )

      // Store the encrypted conversation key for the participant
      await this.storeEncryptedConversationKey({
        keyId: request.keyId,
        encryptedKey: JSON.stringify(encryptedConversationKey),
        participantId: request.participantId,
        createdAt: new Date().toISOString()
      })

      return {
        success: true,
        conversationKey: JSON.stringify(encryptedConversationKey)
      }
    } catch (error) {
      console.error('Error processing key exchange request:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Rotate encryption keys for forward secrecy
   */
  async rotateConversationKeys(conversationId: string): Promise<boolean> {
    try {
      // Generate new key pair
      const newKeyPair = await encryptionService.generateKeyPair()
      
      // Generate new conversation key
      const newConversationKey = await encryptionService.generateConversationKey()
      
      // Store new keys
      encryptionService.storeConversationKey(
        conversationId,
        newKeyPair.keyId,
        newConversationKey
      )

      // Get all participants in the conversation
      const participants = await this.getConversationParticipants(conversationId)
      
      // Send key rotation notification to all participants
      for (const participant of participants) {
        await this.sendKeyRotationNotification(
          conversationId,
          participant.userId,
          newKeyPair
        )
      }

      // Clean up old keys (implement forward secrecy)
      await this.cleanupOldKeys(conversationId, newKeyPair.keyId)

      return true
    } catch (error) {
      console.error('Error rotating conversation keys:', error)
      return false
    }
  }

  /**
   * Get encryption status for a conversation
   */
  async getEncryptionStatus(conversationId: string): Promise<{
    isEncrypted: boolean
    keyCount: number
    lastKeyRotation: string | null
    participants: ParticipantKey[]
  }> {
    try {
      const participants = await this.getConversationParticipants(conversationId)
      const participantKeys = await this.getParticipantKeys(conversationId)
      
      return {
        isEncrypted: participantKeys.length > 0,
        keyCount: participantKeys.length,
        lastKeyRotation: participantKeys.length > 0 
          ? Math.max(...participantKeys.map(k => new Date(k.lastUpdated).getTime())).toString()
          : null,
        participants: participantKeys
      }
    } catch (error) {
      console.error('Error getting encryption status:', error)
      return {
        isEncrypted: false,
        keyCount: 0,
        lastKeyRotation: null,
        participants: []
      }
    }
  }

  /**
   * Store user's public key in the database
   */
  private async storeUserPublicKey(keyPair: EncryptionKey): Promise<void> {
    try {
      const publicKeyString = await encryptionService.exportPublicKey(keyPair.publicKey)
      
      // Use service role client to bypass RLS for key storage
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!serviceRoleKey) {
        throw new Error('Service role key not configured')
      }
      
      const { createClient } = await import('@supabase/supabase-js')
      const serviceClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey
      )
      
      const { error } = await serviceClient
        .from('user_encryption_keys')
        .insert({
          key_id: keyPair.keyId,
          public_key: publicKeyString,
          created_at: keyPair.createdAt,
          is_active: true
        })

      if (error) {
        throw new Error(`Failed to store public key: ${error.message}`)
      }
    } catch (error) {
      console.error('Error storing user public key:', error)
      throw error
    }
  }

  /**
   * Store key exchange request
   */
  private async storeKeyExchangeRequest(request: KeyExchangeRequest): Promise<void> {
    try {
      // Use service role client to bypass RLS
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!serviceRoleKey) {
        throw new Error('Service role key not configured')
      }
      
      const { createClient } = await import('@supabase/supabase-js')
      const serviceClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey
      )
      
      const { error } = await serviceClient
        .from('key_exchange_requests')
        .insert({
          conversation_id: request.conversationId,
          participant_id: request.participantId,
          public_key: request.publicKey,
          key_id: request.keyId,
          timestamp: request.timestamp,
          status: 'pending'
        })

      if (error) {
        throw new Error(`Failed to store key exchange request: ${error.message}`)
      }
    } catch (error) {
      console.error('Error storing key exchange request:', error)
      throw error
    }
  }

  /**
   * Store encrypted conversation key
   */
  private async storeEncryptedConversationKey(conversationKey: ConversationKey): Promise<void> {
    try {
      const { error } = await supabase
        .from('conversation_encryption_keys')
        .insert({
          key_id: conversationKey.keyId,
          encrypted_key: conversationKey.encryptedKey,
          participant_id: conversationKey.participantId,
          created_at: conversationKey.createdAt,
          is_active: true
        })

      if (error) {
        throw new Error(`Failed to store encrypted conversation key: ${error.message}`)
      }
    } catch (error) {
      console.error('Error storing encrypted conversation key:', error)
      throw error
    }
  }

  /**
   * Get conversation participants
   */
  private async getConversationParticipants(conversationId: string): Promise<Array<{ userId: string }>> {
    try {
      const { data, error } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationId)

      if (error) {
        throw new Error(`Failed to get conversation participants: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Error getting conversation participants:', error)
      return []
    }
  }

  /**
   * Get participant keys for a conversation
   */
  private async getParticipantKeys(conversationId: string): Promise<ParticipantKey[]> {
    try {
      const { data, error } = await supabase
        .from('conversation_encryption_keys')
        .select(`
          key_id,
          participant_id,
          created_at,
          is_active,
          user_encryption_keys!inner(public_key)
        `)
        .eq('conversation_id', conversationId)
        .eq('is_active', true)

      if (error) {
        throw new Error(`Failed to get participant keys: ${error.message}`)
      }

      return (data || []).map((key: any) => ({
        userId: key.participant_id,
        publicKey: key.user_encryption_keys.public_key,
        keyId: key.key_id,
        isActive: key.is_active,
        lastUpdated: key.created_at
      }))
    } catch (error) {
      console.error('Error getting participant keys:', error)
      return []
    }
  }

  /**
   * Notify participants about key exchange
   */
  private async notifyParticipants(
    conversationId: string,
    participantIds: string[],
    request: KeyExchangeRequest
  ): Promise<void> {
    // This would typically use WebSocket or Server-Sent Events
    // For now, we'll store the notification in the database
    try {
      const notifications = participantIds.map(participantId => ({
        conversation_id: conversationId,
        user_id: participantId,
        type: 'key_exchange',
        data: request,
        created_at: new Date().toISOString()
      }))

      const { error } = await supabase
        .from('encryption_notifications')
        .insert(notifications)

      if (error) {
        throw new Error(`Failed to notify participants: ${error.message}`)
      }
    } catch (error) {
      console.error('Error notifying participants:', error)
      throw error
    }
  }

  /**
   * Send key rotation notification
   */
  private async sendKeyRotationNotification(
    conversationId: string,
    participantId: string,
    newKeyPair: EncryptionKey
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('encryption_notifications')
        .insert({
          conversation_id: conversationId,
          user_id: participantId,
          type: 'key_rotation',
          data: {
            newKeyId: newKeyPair.keyId,
            publicKey: await encryptionService.exportPublicKey(newKeyPair.publicKey),
            timestamp: new Date().toISOString()
          },
          created_at: new Date().toISOString()
        })

      if (error) {
        throw new Error(`Failed to send key rotation notification: ${error.message}`)
      }
    } catch (error) {
      console.error('Error sending key rotation notification:', error)
      throw error
    }
  }

  /**
   * Clean up old keys for forward secrecy
   */
  private async cleanupOldKeys(conversationId: string, newKeyId: string): Promise<void> {
    try {
      // Deactivate old keys
      const { error } = await supabase
        .from('conversation_encryption_keys')
        .update({ is_active: false })
        .eq('conversation_id', conversationId)
        .neq('key_id', newKeyId)

      if (error) {
        throw new Error(`Failed to cleanup old keys: ${error.message}`)
      }
    } catch (error) {
      console.error('Error cleaning up old keys:', error)
      throw error
    }
  }

  /**
   * Export a CryptoKey as a string
   */
  private async exportKeyAsString(key: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('raw', key)
    return btoa(String.fromCharCode(...new Uint8Array(exported)))
  }
}

// Export a singleton instance
export const keyExchangeService = KeyExchangeService.getInstance()
