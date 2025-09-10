'use client'

import { useState } from 'react'
import { Shield, ShieldCheck, ShieldX, AlertTriangle } from 'lucide-react'
import { useEncryption } from '@/hooks/useEncryption'

interface EncryptionStatusProps {
  conversationId: string
  isEncrypted?: boolean
  onEncryptionToggle?: (enabled: boolean) => void
}

export default function EncryptionStatus({ 
  conversationId, 
  isEncrypted = false, 
  onEncryptionToggle 
}: EncryptionStatusProps) {
  const encryptionHook = useEncryption()
  const [isLoading, setIsLoading] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  // Don't render if encryption is not available
  if (!encryptionHook) {
    return null
  }

  const { status, enableEncryption, disableEncryption } = encryptionHook

  const handleToggleEncryption = async () => {
    if (isLoading) return

    setIsLoading(true)
    try {
      if (isEncrypted) {
        const success = await disableEncryption(conversationId)
        if (success && onEncryptionToggle) {
          onEncryptionToggle(false)
        }
      } else {
        const success = await enableEncryption(conversationId)
        if (success && onEncryptionToggle) {
          onEncryptionToggle(true)
        } else {
          // Show error message if encryption failed
          console.error('Failed to enable encryption')
        }
      }
    } catch (error) {
      console.error('Error toggling encryption:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Simple encryption doesn't need key rotation or initialization
  // Keys are managed automatically by the service

  if (!status.isSupported) {
    return (
      <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm">Encryption not supported</span>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-2">
      {/* Encryption Status Icon */}
      <div className="flex items-center space-x-1">
        {isEncrypted ? (
          <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
        ) : (
          <Shield className="h-4 w-4 text-slate-400" />
        )}
        <span className={`text-sm font-medium ${
          isEncrypted 
            ? 'text-green-600 dark:text-green-400' 
            : 'text-slate-600 dark:text-slate-400'
        }`}>
          {isEncrypted ? 'End-to-End Encrypted' : 'Not Encrypted'}
        </span>
      </div>

      {/* Encryption Controls */}
      <div className="flex items-center space-x-1">
        <button
          onClick={handleToggleEncryption}
          disabled={isLoading}
          className={`p-1 rounded transition-colors ${
            isEncrypted
              ? 'text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20'
              : 'text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={isEncrypted ? 'Disable encryption' : 'Enable encryption'}
        >
          {isEncrypted ? (
            <ShieldX className="h-4 w-4" />
          ) : (
            <ShieldCheck className="h-4 w-4" />
          )}
        </button>

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded transition-colors"
          title="Show encryption details"
        >
          <span className="text-xs">ⓘ</span>
        </button>
      </div>

      {/* Error Message */}
      {status.error && (
        <div className="text-xs text-red-600 dark:text-red-400">
          {status.error}
        </div>
      )}

      {/* Encryption Details */}
      {showDetails && (
        <div className="absolute top-8 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3 z-50 min-w-64">
          <div className="space-y-2">
            <h4 className="font-medium text-slate-900 dark:text-white">Encryption Details</h4>
            
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Status:</span>
                <span className={isEncrypted ? 'text-green-600 dark:text-green-400' : 'text-slate-600 dark:text-slate-400'}>
                  {isEncrypted ? 'Encrypted' : 'Not Encrypted'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Encryption Type:</span>
                <span className="text-green-600 dark:text-green-400">
                  Full E2EE (AES-256-GCM + ECDH)
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Browser Support:</span>
                <span className={status.isSupported ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                  {status.isSupported ? 'Supported' : 'Not Supported'}
                </span>
              </div>
            </div>

            {isEncrypted && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Your messages are protected with enterprise-grade end-to-end encryption. 
                  Features: AES-256-GCM encryption, ECDH key exchange, forward secrecy, 
                  message authentication, and cross-device support.
                </p>
              </div>
            )}

            {!isEncrypted && status.isSupported && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Enable encryption to protect your messages with end-to-end encryption.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
