/**
 * Simplified Encryption Service
 * 
 * This service provides basic encryption without complex key exchange
 * for immediate use while the full system is being set up.
 */

export interface SimpleEncryptedMessage {
  encryptedContent: string
  iv: string
  timestamp: string
}

export class SimpleEncryptionService {
  private static instance: SimpleEncryptionService
  private conversationKeys: Map<string, CryptoKey> = new Map()

  private constructor() {}

  public static getInstance(): SimpleEncryptionService {
    if (!SimpleEncryptionService.instance) {
      SimpleEncryptionService.instance = new SimpleEncryptionService()
    }
    return SimpleEncryptionService.instance
  }

  /**
   * Check if encryption is supported
   */
  static isSupported(): boolean {
    try {
      return (
        typeof window !== 'undefined' &&
        'crypto' in window &&
        'subtle' in window.crypto &&
        typeof window.crypto.subtle.generateKey === 'function'
      )
    } catch (error) {
      return false
    }
  }

  /**
   * Generate a simple encryption key for a conversation
   */
  async generateConversationKey(conversationId: string): Promise<CryptoKey> {
    try {
      const key = await crypto.subtle.generateKey(
        {
          name: 'AES-GCM',
          length: 256
        },
        true,
        ['encrypt', 'decrypt']
      )

      this.conversationKeys.set(conversationId, key)
      return key
    } catch (error) {
      console.error('Error generating conversation key:', error)
      throw new Error('Failed to generate encryption key')
    }
  }

  /**
   * Get or create a key for a conversation
   */
  async getConversationKey(conversationId: string): Promise<CryptoKey> {
    let key = this.conversationKeys.get(conversationId)
    if (!key) {
      key = await this.generateConversationKey(conversationId)
    }
    return key
  }

  /**
   * Encrypt a message
   */
  async encryptMessage(message: string, conversationId: string): Promise<SimpleEncryptedMessage> {
    try {
      const key = await this.getConversationKey(conversationId)
      const iv = crypto.getRandomValues(new Uint8Array(12))
      const messageBuffer = new TextEncoder().encode(message)

      const encrypted = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        messageBuffer
      )

      return {
        encryptedContent: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
        iv: btoa(String.fromCharCode(...iv)),
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error encrypting message:', error)
      throw new Error('Failed to encrypt message')
    }
  }

  /**
   * Decrypt a message
   */
  async decryptMessage(encryptedMessage: SimpleEncryptedMessage, conversationId: string): Promise<string> {
    try {
      const key = this.conversationKeys.get(conversationId)
      if (!key) {
        return '[Encrypted message - key not available]'
      }

      const iv = Uint8Array.from(atob(encryptedMessage.iv), c => c.charCodeAt(0))
      const encryptedData = Uint8Array.from(
        atob(encryptedMessage.encryptedContent),
        c => c.charCodeAt(0)
      )

      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        encryptedData
      )

      return new TextDecoder().decode(decrypted)
    } catch (error) {
      console.error('Error decrypting message:', error)
      return '[Failed to decrypt message]'
    }
  }

  /**
   * Clear keys for a conversation (for forward secrecy)
   */
  clearConversationKey(conversationId: string): void {
    this.conversationKeys.delete(conversationId)
  }
}

// Export singleton instance
export const simpleEncryptionService = SimpleEncryptionService.getInstance()
