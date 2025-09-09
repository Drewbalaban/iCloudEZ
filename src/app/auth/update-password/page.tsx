'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Lock, Cloud, CheckCircle, AlertCircle } from 'lucide-react'

// Avoid prerender and allow client-side hooks freely
export const dynamic = 'force-dynamic'
export const fetchCache = 'default-no-store'

export default function UpdatePassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Supabase will redirect here with an access_token for password recovery
    // The auth state listener in AuthContext should establish the session.
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    setError(null)

    try {
      if (!supabase) throw new Error('Supabase not configured')
      if (password.length < 8) throw new Error('Password must be at least 8 characters')
      if (password !== confirm) throw new Error('Passwords do not match')

      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      setMessage('Your password has been updated. You can now sign in.')
      setTimeout(() => router.push('/auth/signin'), 1200)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full flex items-center justify-center mb-4">
            <Cloud className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Set a new password</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Enter your new password below.</p>
        </div>

        {message && (
          <div className="flex items-start gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-3 py-2 rounded-lg">
            <CheckCircle className="h-5 w-5 mt-0.5" />
            <span className="text-sm">{message}</span>
          </div>
        )}
        {error && (
          <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-3 py-2 rounded-lg">
            <AlertCircle className="h-5 w-5 mt-0.5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">New password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Confirm password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-4 py-3 rounded-lg font-semibold disabled:opacity-60"
          >
            {loading ? 'Updating...' : 'Update password'}
          </button>
        </form>

        <div className="text-center text-sm text-slate-600 dark:text-slate-400">
          <Link href="/auth/signin" className="hover:underline">Back to sign in</Link>
        </div>
      </div>
    </div>
  )
}
