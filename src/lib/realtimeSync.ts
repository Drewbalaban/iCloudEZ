import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { toast } from 'sonner'

export class RealtimeSync {
  private supabase: SupabaseClient
  private userId: string
  private isConnected: boolean = false
  private syncCallbacks: Map<string, ((data: unknown) => void)[]> = new Map()

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
          (payload: unknown) => {
            this.handleRealtimeChange(payload)
          }
        )
        .subscribe()

      this.isConnected = true
      console.log('🔄 Real-time sync started')

      // File watching not implemented in this version

      return { subscription }
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
  private handleRealtimeChange(payload: unknown) {
    const { eventType, new: newRecord, old: oldRecord } = payload as { eventType: string; new: unknown; old: unknown }

    switch (eventType) {
      case 'INSERT':
        this.notifyCallbacks('fileAdded', newRecord)
        toast.success(`📁 New file synced: ${(newRecord as { name?: string })?.name || 'Unknown'}`)
        break
      
      case 'UPDATE':
        this.notifyCallbacks('fileUpdated', newRecord)
        toast.info(`📝 File updated: ${(newRecord as { name?: string })?.name || 'Unknown'}`)
        break
      
      case 'DELETE':
        this.notifyCallbacks('fileDeleted', oldRecord)
        toast.info(`🗑️ File deleted: ${(oldRecord as { name?: string })?.name || 'Unknown'}`)
        break
    }
  }

  // Handle storage changes
  private handleStorageChange(payload: unknown) {
    console.log('Storage change detected:', payload)
    // Handle file uploads, deletions, etc.
  }

  // File watching functionality removed for now - will be implemented in future versions

  // Register callback for sync events
  on(event: string, callback: (data: unknown) => void) {
    if (!this.syncCallbacks.has(event)) {
      this.syncCallbacks.set(event, [])
    }
    this.syncCallbacks.get(event)!.push(callback)
  }

  // Remove callback
  off(event: string, callback: (data: unknown) => void) {
    const callbacks = this.syncCallbacks.get(event)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  // Notify all callbacks for an event
  private notifyCallbacks(event: string, data: unknown) {
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
