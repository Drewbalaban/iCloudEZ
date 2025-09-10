/**
 * Simplified Encryption Hook
 * 
 * This hook provides basic encryption functionality without complex key exchange
 */

import { useState, useCallback } from 'react'
import { simpleEncryptionService, SimpleEncryptedMessage } from '@/lib/simple-encryption.service'

interface SimpleEncryptionStatus {
  isSupported: boolean
  isEnabled: boolean
  isInitialized: boolean
  error: string | null
}

interface UseSimpleEncryptionReturn {
  status: SimpleEncryptionStatus
  encryptMessage: (message: string, conversationId: string) => Promise<SimpleEncryptedMessage | null>
  decryptMessage: (encryptedMessage: SimpleEncryptedMessage, conversationId: string) => Promise<string | null>
  enableEncryption: (conversationId: string) => Promise<boolean>
  disableEncryption: (conversationId: string) => Promise<boolean>
}

export function useSimpleEncryption(): UseSimpleEncryptionReturn | null {
  const [status, setStatus] = useState<SimpleEncryptionStatus>({
    isSupported: false,
    isEnabled: false,
    isInitialized: true, // Simple encryption is always initialized
    error: null
  })

  // Check if encryption is supported
  const isSupported = simpleEncryptionService.constructor.isSupported()
  
  if (!isSupported) {
    return null
  }

  // Update status
  if (!status.isSupported) {
    setStatus(prev => ({ ...prev, isSupported: true }))
  }

  // Enable encryption (always returns true for simple encryption)
  const enableEncryption = useCallback(async (conversationId: string): Promise<boolean> => {
    try {
      setStatus(prev => ({ ...prev, error: null, isEnabled: true }))
      return true
    } catch (error) {
      console.error('Error enabling encryption:', error)
      setStatus(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to enable encryption'
      }))
      return false
    }
  }, [])

  // Disable encryption
  const disableEncryption = useCallback(async (conversationId: string): Promise<boolean> => {
    try {
      setStatus(prev => ({ ...prev, error: null, isEnabled: false }))
      return true
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
  ): Promise<SimpleEncryptedMessage | null> => {
    if (!status.isEnabled) {
      return null
    }

    try {
      return await simpleEncryptionService.encryptMessage(message, conversationId)
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
    encryptedMessage: SimpleEncryptedMessage,
    conversationId: string
  ): Promise<string | null> => {
    try {
      return await simpleEncryptionService.decryptMessage(encryptedMessage, conversationId)
    } catch (error) {
      console.error('Error decrypting message:', error)
      return '[Failed to decrypt message]'
    }
  }, [])

  return {
    status,
    encryptMessage,
    decryptMessage,
    enableEncryption,
    disableEncryption
  }
}
