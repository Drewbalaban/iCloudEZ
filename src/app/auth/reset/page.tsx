'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Mail, ArrowLeft, Cloud, CheckCircle, AlertCircle } from 'lucide-react'

export default function ResetPasswordRequest() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    setError(null)

    try {
      if (!supabase) throw new Error('Supabase not configured')
      const redirectTo = `${window.location.origin}/auth/update-password`
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
      if (error) throw error
      setMessage('If an account exists for that email, a reset link has been sent.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email')
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reset your password</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Enter your email and we&apos;ll send you a reset link.</p>
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
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-4 py-3 rounded-lg font-semibold disabled:opacity-60"
          >
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        <div className="text-center">
          <Link href="/auth/signin" className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
