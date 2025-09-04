// Service Worker for CloudEZ real-time sync
const CACHE_NAME = 'cloudez-sync-v1'

// Install event - cache necessary files
self.addEventListener('install', (event) => {
  console.log('🔄 CloudEZ Service Worker installing...')
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll([
          '/'
        ])
      })
      .then(() => {
        console.log('✅ CloudEZ Service Worker installed')
        return self.skipWaiting()
      })
  )
})

// Activate event - take control immediately
self.addEventListener('activate', (event) => {
  console.log('🔄 CloudEZ Service Worker activating...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => {
      console.log('✅ CloudEZ Service Worker activated')
      return self.clients.claim()
    })
  )
})

// Background sync for file uploads
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag)
  
  if (event.tag === 'file-upload') {
    event.waitUntil(handleBackgroundUpload())
  }
})

// Handle background file uploads
async function handleBackgroundUpload() {
  try {
    // Get pending uploads from IndexedDB
    const pendingUploads = await getPendingUploads()
    
    for (const upload of pendingUploads) {
      await uploadFile(upload)
      await removePendingUpload(upload.id)
    }
    
    console.log('✅ Background uploads completed')
  } catch (error) {
    console.error('❌ Background upload failed:', error)
  }
}

// Handle file uploads
async function uploadFile(upload) {
  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: upload.formData
    })
    
    if (response.ok) {
      console.log('✅ File uploaded in background:', upload.fileName)
      
      // Notify main app
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'UPLOAD_SUCCESS',
            fileName: upload.fileName
          })
        })
      })
    }
  } catch (error) {
    console.error('❌ Background upload failed:', error)
    throw error
  }
}

// Store pending upload in IndexedDB
async function storePendingUpload(upload) {
  const db = await openDB()
  const tx = db.transaction('pendingUploads', 'readwrite')
  const store = tx.objectStore('pendingUploads')
  await store.add(upload)
}

// Get pending uploads from IndexedDB
async function getPendingUploads() {
  const db = await openDB()
  const tx = db.transaction('pendingUploads', 'readonly')
  const store = tx.objectStore('pendingUploads')
  return await store.getAll()
}

// Remove pending upload from IndexedDB
async function removePendingUpload(id) {
  const db = await openDB()
  const tx = db.transaction('pendingUploads', 'readwrite')
  const store = tx.objectStore('pendingUploads')
  await store.delete(id)
}

// Open IndexedDB
async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CloudEZ', 1)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      
      // Create object store for pending uploads
      if (!db.objectStoreNames.contains('pendingUploads')) {
        const store = db.createObjectStore('pendingUploads', { keyPath: 'id' })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }
  })
}

// Handle messages from main app
self.addEventListener('message', (event) => {
  console.log('📨 Service Worker received message:', event.data)
  
  switch (event.data.type) {
    case 'STORE_UPLOAD':
      storePendingUpload(event.data.upload)
      break
      
    case 'TRIGGER_SYNC':
      self.registration.sync.register('file-upload')
      break
      
    case 'GET_STATUS':
      event.ports[0].postMessage({
        type: 'STATUS',
        status: 'active',
        version: '1.0.0'
      })
      break
  }
})

// Handle push notifications for sync updates
self.addEventListener('push', (event) => {
  console.log('📱 Push notification received:', event.data)
  
  const options = {
    body: 'New files synced to CloudEZ',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: 'cloudez-sync',
    data: {
      url: '/dashboard'
    }
  }
  
  event.waitUntil(
    self.registration.showNotification('CloudEZ Sync', options)
  )
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Notification clicked')
  
  event.notification.close()
  
  event.waitUntil(
    self.clients.matchAll().then((clients) => {
      if (clients.length > 0) {
        clients[0].focus()
        clients[0].navigate('/dashboard')
      } else {
        self.clients.openWindow('/dashboard')
      }
    })
  )
})

// Periodic sync for background updates
self.addEventListener('periodicsync', (event) => {
  console.log('🔄 Periodic sync triggered:', event.tag)
  
  if (event.tag === 'file-sync') {
    event.waitUntil(performPeriodicSync())
  }
})

// Perform periodic sync
async function performPeriodicSync() {
  try {
    // Check for new files or updates
    console.log('🔄 Performing periodic sync...')
    
    // This could check for new files in the device's file system
    // For now, we'll just log the sync attempt
    
  } catch (error) {
    console.error('❌ Periodic sync failed:', error)
  }
}

console.log('🚀 CloudEZ Service Worker loaded')
