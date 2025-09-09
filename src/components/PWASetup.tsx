'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'

export default function PWASetup() {
  const [deferredPrompt, setDeferredPrompt] = useState<{ prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> } | null>(null)
  const [, setIsInstalled] = useState(false)

  const showInstallPrompt = useCallback(async () => {
    if (!deferredPrompt) {
      toast.error('Install prompt not available')
      return
    }

    try {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        console.log('✅ User accepted install prompt')
      } else {
        console.log('❌ User dismissed install prompt')
      }
      
      setDeferredPrompt(null)
    } catch (error) {
      console.error('Install prompt failed:', error)
      toast.error('Installation failed')
    }
  }, [deferredPrompt])

  useEffect(() => {
    // Check if app is already installed
    // if (window.matchMedia('(display-mode: standalone)').matches) {
    //   setIsInstalled(true)
    // }

    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      setDeferredPrompt(e as unknown as { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> })
      
      // Show install prompt toast
      toast.info('📱 Install CloudEZ as an app for the best experience!', {
        action: {
          label: 'Install',
          onClick: () => showInstallPrompt()
        },
        duration: 10000
      })
    })

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
      toast.success('🎉 CloudEZ installed successfully!')
    })

    // Register service worker
    if ('serviceWorker' in navigator) {
      registerServiceWorker()
    }

    // Do not request notification permission on load; gate behind user gesture elsewhere

    // Request background sync permission
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      requestBackgroundSyncPermission()
    }
  }, [showInstallPrompt])

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      console.log('✅ Service Worker registered:', registration)
      
      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              toast.info('🔄 New version available! Refresh to update.')
            }
          })
        }
      })
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error)
    }
  }

  const requestBackgroundSyncPermission = async () => {
    try {
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({
          name: 'periodic-background-sync' as PermissionName
        })
        
        if (permission.state === 'granted') {
          console.log('✅ Background sync permission granted')
        } else if (permission.state === 'prompt') {
          console.log('📝 Background sync permission prompt needed')
        }
      }
    } catch (error) {
      console.log('Background sync permission not supported:', error)
    }
  }

  // This component doesn't render anything visible
  return null
}
