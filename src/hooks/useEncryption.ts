/**
 * Custom hook for managing end-to-end encryption in chat
 */

import { useState, useEffect, useCallback } from 'react'
import { encryptionService, EncryptedMessage } from '@/lib/encryption.service'
import { keyExchangeService } from '@/lib/key-exchange.service'

interface EncryptionStatus {
  isSupported: boolean
  isEnabled: boolean
  isInitialized: boolean
  hasKeys: boolean
  error: string | null
}

interface UseEncryptionReturn {
  status: EncryptionStatus
  enableEncryption: (conversationId: string) => Promise<boolean>
  disableEncryption: (conversationId: string) => Promise<boolean>
  encryptMessage: (message: string, conversationId: string) => Promise<EncryptedMessage | null>
  decryptMessage: (encryptedMessage: EncryptedMessage, conversationId: string) => Promise<string | null>
  rotateKeys: (conversationId: string) => Promise<boolean>
  initializeKeys: () => Promise<boolean>
}

export function useEncryption(): UseEncryptionReturn | null {
  const [status, setStatus] = useState<EncryptionStatus>({
    isSupported: false,
    isEnabled: false,
    isInitialized: false,
    hasKeys: false,
    error: null
  })

  // Return null if encryption is not supported to prevent errors
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    return null
  }

  // Check if encryption is supported
  useEffect(() => {
    const isSupported = encryptionService.constructor.isEncryptionSupported()
    setStatus(prev => ({ ...prev, isSupported }))
  }, [])

  // Initialize encryption keys
  const initializeKeys = useCallback(async (): Promise<boolean> => {
    if (!status.isSupported) {
      setStatus(prev => ({ ...prev, error: 'Encryption not supported in this browser' }))
      return false
    }

    try {
      setStatus(prev => ({ ...prev, error: null }))
      
      // Generate user key pair
      const keyPair = await encryptionService.generateKeyPair()
      
      setStatus(prev => ({
        ...prev,
        isInitialized: true,
        hasKeys: true
      }))

      return true
    } catch (error) {
      console.error('Error initializing encryption keys:', error)
      setStatus(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to initialize encryption'
      }))
      return false
    }
  }, [status.isSupported])

  // Enable encryption for a conversation
  const enableEncryption = useCallback(async (conversationId: string): Promise<boolean> => {
    if (!status.isInitialized) {
      const initialized = await initializeKeys()
      if (!initialized) return false
    }

    try {
      setStatus(prev => ({ ...prev, error: null }))

      // Get conversation participants
      const response = await fetch(`/api/chat/conversations`)
      if (!response.ok) {
        throw new Error('Failed to get conversation participants')
      }

      const { conversations } = await response.json()
      const conversation = conversations.find((c: any) => c.id === conversationId)
      
      if (!conversation) {
        throw new Error('Conversation not found')
      }
      
      const participantIds = conversation.participants?.map((p: any) => p.id) || []
      
      if (participantIds.length === 0) {
        throw new Error('No participants found in conversation')
      }

      // Initialize key exchange
      const success = await keyExchangeService.initializeKeyExchange(
        conversationId,
        participantIds
      )

      if (success) {
        // Enable encryption via API
        const enableResponse = await fetch('/api/chat/encryption', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId,
            action: 'enable'
          })
        })

        if (enableResponse.ok) {
          setStatus(prev => ({ ...prev, isEnabled: true }))
          return true
        } else {
          const errorData = await enableResponse.json()
          throw new Error(errorData.error || 'Failed to enable encryption via API')
        }
      }

      return false
    } catch (error) {
      console.error('Error enabling encryption:', error)
      setStatus(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to enable encryption'
      }))
      return false
    }
  }, [status.isInitialized, initializeKeys])

  // Disable encryption for a conversation
  const disableEncryption = useCallback(async (conversationId: string): Promise<boolean> => {
    try {
      setStatus(prev => ({ ...prev, error: null }))

      const response = await fetch('/api/chat/encryption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          action: 'disable'
        })
      })

      if (response.ok) {
        setStatus(prev => ({ ...prev, isEnabled: false }))
        return true
      }

      return false
    } catch (error) {
      console.error('Error disabling encryption:', error)
      setStatus(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to disable encryption'
      }))
      return false
    }
  }, [])

  // Encrypt a message
  const encryptMessage = useCallback(async (
    message: string,
    conversationId: string
  ): Promise<EncryptedMessage | null> => {
    if (!status.isEnabled) {
      return null
    }

    try {
      // Get conversation key
      const conversationKey = encryptionService.getConversationKey(conversationId, 'conversation-key')
      if (!conversationKey) {
        throw new Error('No encryption key found for conversation')
      }

      // Encrypt the message
      const encryptedMessage = await encryptionService.encryptMessage(message, conversationKey)
      return encryptedMessage
    } catch (error) {
      console.error('Error encrypting message:', error)
      setStatus(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to encrypt message'
      }))
      return null
    }
  }, [status.isEnabled])

  // Decrypt a message
  const decryptMessage = useCallback(async (
    encryptedMessage: EncryptedMessage,
    conversationId: string
  ): Promise<string | null> => {
    try {
      // Get conversation key
      const conversationKey = encryptionService.getConversationKey(conversationId, encryptedMessage.keyId)
      if (!conversationKey) {
        console.warn('No encryption key found for message, returning encrypted content')
        return `[Encrypted message - key not available]`
      }

      // Decrypt the message
      const decryptedMessage = await encryptionService.decryptMessage(encryptedMessage, conversationKey)
      return decryptedMessage
    } catch (error) {
      console.error('Error decrypting message:', error)
      return `[Failed to decrypt message]`
    }
  }, [])

  // Rotate encryption keys
  const rotateKeys = useCallback(async (conversationId: string): Promise<boolean> => {
    try {
      setStatus(prev => ({ ...prev, error: null }))

      const response = await fetch('/api/chat/encryption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          action: 'rotate_keys'
        })
      })

      if (response.ok) {
        // Also rotate keys locally
        await keyExchangeService.rotateConversationKeys(conversationId)
        return true
      }

      return false
    } catch (error) {
      console.error('Error rotating keys:', error)
      setStatus(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to rotate keys'
      }))
      return false
    }
  }, [])

  return {
    status,
    enableEncryption,
    disableEncryption,
    encryptMessage,
    decryptMessage,
    rotateKeys,
    initializeKeys
  }
}
