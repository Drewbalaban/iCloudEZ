import { createClient } from '@supabase/supabase-js'
import { toast } from 'sonner'

export class RealtimeSync {
  private supabase: any
  private userId: string
  private isConnected: boolean = false
  private syncCallbacks: Map<string, Function[]> = new Map()

  constructor(userId: string) {
    this.userId = userId
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  // Start real-time synchronization
  async startSync() {
    if (this.isConnected) return

    try {
      // Subscribe to real-time changes in documents table
      const subscription = this.supabase
        .channel('documents-sync')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'documents',
            filter: `user_id=eq.${this.userId}`
          },
          (payload: any) => {
            this.handleRealtimeChange(payload)
          }
        )
        .subscribe()

      // Subscribe to storage changes
      const storageSubscription = this.supabase
        .channel('storage-sync')
        .on(
          'storage',
          {
            event: '*',
            bucket: 'documents'
          },
          (payload: any) => {
            this.handleStorageChange(payload)
          }
        )
        .subscribe()

      this.isConnected = true
      console.log('🔄 Real-time sync started')

      // File watching not implemented in this version

      return { subscription, storageSubscription }
    } catch (error) {
      console.error('Failed to start real-time sync:', error)
      throw error
    }
  }

  // Stop synchronization
  stopSync() {
    this.isConnected = false
    console.log('🔄 Real-time sync stopped')
  }

  // Handle real-time database changes
  private handleRealtimeChange(payload: any) {
    const { eventType, new: newRecord, old: oldRecord } = payload

    switch (eventType) {
      case 'INSERT':
        this.notifyCallbacks('fileAdded', newRecord)
        toast.success(`📁 New file synced: ${newRecord.name}`)
        break
      
      case 'UPDATE':
        this.notifyCallbacks('fileUpdated', newRecord)
        toast.info(`📝 File updated: ${newRecord.name}`)
        break
      
      case 'DELETE':
        this.notifyCallbacks('fileDeleted', oldRecord)
        toast.info(`🗑️ File deleted: ${oldRecord.name}`)
        break
    }
  }

  // Handle storage changes
  private handleStorageChange(payload: any) {
    console.log('Storage change detected:', payload)
    // Handle file uploads, deletions, etc.
  }

  // File watching functionality removed for now - will be implemented in future versions

  // Register callback for sync events
  on(event: string, callback: Function) {
    if (!this.syncCallbacks.has(event)) {
      this.syncCallbacks.set(event, [])
    }
    this.syncCallbacks.get(event)!.push(callback)
  }

  // Remove callback
  off(event: string, callback: Function) {
    const callbacks = this.syncCallbacks.get(event)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  // Notify all callbacks for an event
  private notifyCallbacks(event: string, data: any) {
    const callbacks = this.syncCallbacks.get(event)
    if (callbacks) {
      callbacks.forEach(callback => callback(data))
    }
  }

  // Get sync status
  getStatus() {
    return {
      isConnected: this.isConnected,
      userId: this.userId,
      hasFileWatcher: false
    }
  }
}

// Global sync instance
let globalSync: RealtimeSync | null = null

// Initialize global sync
export const initGlobalSync = (userId: string) => {
  if (globalSync) {
    globalSync.stopSync()
  }
  globalSync = new RealtimeSync(userId)
  return globalSync
}

// Get global sync instance
export const getGlobalSync = () => globalSync

// Stop global sync
export const stopGlobalSync = () => {
  if (globalSync) {
    globalSync.stopSync()
    globalSync = null
  }
}
