/**
 * Tests for the Encryption Service
 * 
 * These tests verify the core encryption functionality including:
 * - Key generation and management
 * - Message encryption and decryption
 * - Signature creation and verification
 * - Error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { encryptionService, EncryptionService } from '../encryption.service'

// Mock Web Crypto API
const mockCrypto = {
  subtle: {
    generateKey: vi.fn(),
    exportKey: vi.fn(),
    importKey: vi.fn(),
    deriveKey: vi.fn(),
    encrypt: vi.fn(),
    decrypt: vi.fn(),
    sign: vi.fn(),
    verify: vi.fn(),
    digest: vi.fn()
  },
  getRandomValues: vi.fn(),
  randomUUID: vi.fn()
}

// Mock global crypto
Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true
})

// Mock btoa and atob
global.btoa = vi.fn((str: string) => Buffer.from(str, 'binary').toString('base64'))
global.atob = vi.fn((str: string) => Buffer.from(str, 'base64').toString('binary'))

describe('EncryptionService', () => {
  let service: EncryptionService

  beforeEach(() => {
    service = EncryptionService.getInstance()
    vi.clearAllMocks()
    
    // Setup default mock implementations
    mockCrypto.randomUUID.mockReturnValue('test-uuid-123')
    mockCrypto.getRandomValues.mockImplementation((arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
      return arr
    })
  })

  describe('Browser Support', () => {
    it('should detect encryption support', () => {
      expect(EncryptionService.isEncryptionSupported()).toBe(true)
    })

    it('should generate secure IDs', () => {
      const id1 = EncryptionService.generateSecureId()
      const id2 = EncryptionService.generateSecureId()
      
      expect(id1).toBeDefined()
      expect(id2).toBeDefined()
      expect(id1).not.toBe(id2)
    })

    it('should hash strings correctly', async () => {
      const input = 'test message'
      const hash = await EncryptionService.hashString(input)
      
      expect(hash).toBeDefined()
      expect(typeof hash).toBe('string')
      expect(hash.length).toBe(64) // SHA-256 produces 64 hex characters
    })
  })

  describe('Key Generation', () => {
    it('should generate ECDH key pairs', async () => {
      const mockKeyPair = {
        publicKey: { type: 'public' },
        privateKey: { type: 'private' }
      }

      mockCrypto.subtle.generateKey.mockResolvedValue(mockKeyPair)

      const keyPair = await service.generateKeyPair()

      expect(keyPair).toBeDefined()
      expect(keyPair.keyId).toBe('test-uuid-123')
      expect(keyPair.publicKey).toBe(mockKeyPair.publicKey)
      expect(keyPair.privateKey).toBe(mockKeyPair.privateKey)
      expect(keyPair.createdAt).toBeDefined()

      expect(mockCrypto.subtle.generateKey).toHaveBeenCalledWith(
        {
          name: 'ECDH',
          namedCurve: 'P-256'
        },
        true,
        ['deriveKey']
      )
    })

    it('should handle key generation errors', async () => {
      mockCrypto.subtle.generateKey.mockRejectedValue(new Error('Key generation failed'))

      await expect(service.generateKeyPair()).rejects.toThrow('Failed to generate encryption keys')
    })

    it('should generate conversation keys', async () => {
      const mockKey = { type: 'secret' }
      mockCrypto.subtle.generateKey.mockResolvedValue(mockKey)

      const key = await service.generateConversationKey()

      expect(key).toBe(mockKey)
      expect(mockCrypto.subtle.generateKey).toHaveBeenCalledWith(
        {
          name: 'AES-GCM',
          length: 256
        },
        true,
        ['encrypt', 'decrypt']
      )
    })
  })

  describe('Key Export/Import', () => {
    it('should export public keys', async () => {
      const mockKey = { type: 'public' }
      const mockExported = new Uint8Array([1, 2, 3, 4])
      mockCrypto.subtle.exportKey.mockResolvedValue(mockExported)

      const exported = await service.exportPublicKey(mockKey)

      expect(exported).toBeDefined()
      expect(typeof exported).toBe('string')
      expect(mockCrypto.subtle.exportKey).toHaveBeenCalledWith('spki', mockKey)
    })

    it('should import public keys', async () => {
      const mockKey = { type: 'public' }
      const keyString = 'dGVzdA==' // base64 encoded "test"
      mockCrypto.subtle.importKey.mockResolvedValue(mockKey)

      const imported = await service.importPublicKey(keyString)

      expect(imported).toBe(mockKey)
      expect(mockCrypto.subtle.importKey).toHaveBeenCalledWith(
        'spki',
        expect.any(Uint8Array),
        {
          name: 'ECDH',
          namedCurve: 'P-256'
        },
        true,
        []
      )
    })
  })

  describe('Message Encryption/Decryption', () => {
    let mockKey: CryptoKey

    beforeEach(() => {
      mockKey = { type: 'secret' } as CryptoKey
    })

    it('should encrypt messages', async () => {
      const message = 'Hello, world!'
      const mockEncrypted = new Uint8Array([5, 6, 7, 8])
      const mockSignature = new Uint8Array([9, 10, 11, 12])

      mockCrypto.subtle.encrypt.mockResolvedValue(mockEncrypted)
      mockCrypto.subtle.exportKey.mockResolvedValue(new Uint8Array([1, 2, 3, 4]))
      mockCrypto.subtle.sign.mockResolvedValue(mockSignature)

      const encrypted = await service.encryptMessage(message, mockKey)

      expect(encrypted).toBeDefined()
      expect(encrypted.encryptedContent).toBeDefined()
      expect(encrypted.iv).toBeDefined()
      expect(encrypted.signature).toBeDefined()
      expect(encrypted.keyId).toBe('conversation-key')
      expect(encrypted.timestamp).toBeDefined()

      expect(mockCrypto.subtle.encrypt).toHaveBeenCalledWith(
        {
          name: 'AES-GCM',
          iv: expect.any(Uint8Array)
        },
        mockKey,
        expect.any(Uint8Array)
      )
    })

    it('should decrypt messages', async () => {
      const encryptedMessage = {
        encryptedContent: 'dGVzdA==', // base64 encoded "test"
        iv: 'dGVzdA==',
        keyId: 'conversation-key',
        signature: 'dGVzdA==',
        timestamp: new Date().toISOString()
      }

      const mockDecrypted = new Uint8Array([116, 101, 115, 116]) // "test" in bytes
      const mockSignature = new Uint8Array([9, 10, 11, 12])

      mockCrypto.subtle.decrypt.mockResolvedValue(mockDecrypted)
      mockCrypto.subtle.exportKey.mockResolvedValue(new Uint8Array([1, 2, 3, 4]))
      mockCrypto.subtle.verify.mockResolvedValue(true)

      const decrypted = await service.decryptMessage(encryptedMessage, mockKey)

      expect(decrypted).toBe('test')
      expect(mockCrypto.subtle.decrypt).toHaveBeenCalledWith(
        {
          name: 'AES-GCM',
          iv: expect.any(Uint8Array)
        },
        mockKey,
        expect.any(Uint8Array)
      )
    })

    it('should handle decryption errors', async () => {
      const encryptedMessage = {
        encryptedContent: 'invalid',
        iv: 'invalid',
        keyId: 'conversation-key',
        signature: 'invalid',
        timestamp: new Date().toISOString()
      }

      mockCrypto.subtle.decrypt.mockRejectedValue(new Error('Decryption failed'))

      await expect(service.decryptMessage(encryptedMessage, mockKey))
        .rejects.toThrow('Failed to decrypt message')
    })

    it('should verify message signatures', async () => {
      const encryptedMessage = {
        encryptedContent: 'dGVzdA==',
        iv: 'dGVzdA==',
        keyId: 'conversation-key',
        signature: 'dGVzdA==',
        timestamp: new Date().toISOString()
      }

      const mockDecrypted = new Uint8Array([116, 101, 115, 116])
      mockCrypto.subtle.decrypt.mockResolvedValue(mockDecrypted)
      mockCrypto.subtle.exportKey.mockResolvedValue(new Uint8Array([1, 2, 3, 4]))
      mockCrypto.subtle.verify.mockResolvedValue(false) // Invalid signature

      await expect(service.decryptMessage(encryptedMessage, mockKey))
        .rejects.toThrow('Message signature verification failed')
    })
  })

  describe('Key Management', () => {
    it('should store and retrieve conversation keys', () => {
      const conversationId = 'conv-123'
      const keyId = 'key-456'
      const mockKey = { type: 'secret' } as CryptoKey

      service.storeConversationKey(conversationId, keyId, mockKey)
      const retrieved = service.getConversationKey(conversationId, keyId)

      expect(retrieved).toBe(mockKey)
    })

    it('should remove conversation keys', () => {
      const conversationId = 'conv-123'
      const keyId = 'key-456'
      const mockKey = { type: 'secret' } as CryptoKey

      service.storeConversationKey(conversationId, keyId, mockKey)
      service.removeConversationKey(conversationId, keyId)
      const retrieved = service.getConversationKey(conversationId, keyId)

      expect(retrieved).toBeUndefined()
    })
  })

  describe('Shared Secret Derivation', () => {
    it('should derive shared secrets using ECDH', async () => {
      const privateKey = { type: 'private' } as CryptoKey
      const publicKey = { type: 'public' } as CryptoKey
      const mockDerivedKey = { type: 'derived' } as CryptoKey

      mockCrypto.subtle.deriveKey.mockResolvedValue(mockDerivedKey)

      const derived = await service.deriveSharedSecret(privateKey, publicKey)

      expect(derived).toBe(mockDerivedKey)
      expect(mockCrypto.subtle.deriveKey).toHaveBeenCalledWith(
        {
          name: 'ECDH',
          public: publicKey
        },
        privateKey,
        {
          name: 'AES-GCM',
          length: 256
        },
        false,
        ['encrypt', 'decrypt']
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle missing crypto support', () => {
      // Temporarily remove crypto
      const originalCrypto = global.crypto
      delete (global as any).crypto

      expect(EncryptionService.isEncryptionSupported()).toBe(false)

      // Restore crypto
      global.crypto = originalCrypto
    })

    it('should handle export key errors', async () => {
      const mockKey = { type: 'public' } as CryptoKey
      mockCrypto.subtle.exportKey.mockRejectedValue(new Error('Export failed'))

      await expect(service.exportPublicKey(mockKey))
        .rejects.toThrow('Failed to export public key')
    })

    it('should handle import key errors', async () => {
      const keyString = 'invalid-key'
      mockCrypto.subtle.importKey.mockRejectedValue(new Error('Import failed'))

      await expect(service.importPublicKey(keyString))
        .rejects.toThrow('Failed to import public key')
    })
  })
})
