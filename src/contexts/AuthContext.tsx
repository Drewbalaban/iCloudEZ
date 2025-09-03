'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (identifier: string, password: string) => Promise<void>
  signUp: (email: string, password: string, username?: string, fullName?: string) => Promise<void>
  signOut: () => Promise<void>
  isConfigured: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isConfigured, setIsConfigured] = useState(false)
  
  // Add state stabilization to prevent rapid changes
  const [stableLoading, setStableLoading] = useState(true)
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      setStableLoading(false)
      setIsConfigured(false)
      return
    }
    setIsConfigured(true)
    
    // Add timeout fallback to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setLoading(false)
      setStableLoading(false)
    }, 10000)
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeoutId)
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current)
      loadingTimeoutRef.current = setTimeout(() => {
        setStableLoading(false)
      }, 200)
    }).catch(error => {
      console.error('Auth session error:', error)
      clearTimeout(timeoutId)
      setLoading(false)
      setStableLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      clearTimeout(timeoutId)
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current)
      loadingTimeoutRef.current = setTimeout(() => {
        setStableLoading(false)
      }, 200)
    })

    return () => {
      clearTimeout(timeoutId)
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current)
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (identifier: string, password: string) => {
    if (!supabase) throw new Error('Supabase not configured')

    // If identifier is a username (no @), look up email
    let email = identifier
    if (!identifier.includes('@')) {
      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', identifier)
        .single()
      const row = data as unknown as { email?: string } | null
      if (error || !row?.email) throw new Error('Username not found')
      email = row.email
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }

  const signUp = async (email: string, password: string, username?: string, fullName?: string) => {
    if (!supabase) throw new Error('Supabase not configured')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username || email.split('@')[0],
          full_name: fullName || ''
        }
      }
    })
    if (error) throw error
  }

  const signOut = async () => {
    if (!supabase) throw new Error('Supabase not configured')
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const value = {
    user,
    session,
    loading: stableLoading,
    signIn,
    signUp,
    signOut,
    isConfigured,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
