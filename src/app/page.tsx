'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Cloud, Shield, Lock, Zap, Check, ArrowRight, Folder, UploadCloud, Share2 } from 'lucide-react'
import Link from 'next/link'
// import removed: supabase no longer needed after removing community gallery

// Public gallery removed; no public document interface needed

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const forceLanding = searchParams?.get('landing') === '1'
    if (!loading && user && !forceLanding) {
      router.push('/dashboard')
    }
  }, [user, loading, router, searchParams])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Always allow viewing landing page; no early return for logged-in users

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(37,99,235,0.15),transparent)] dark:bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(37,99,235,0.25),transparent)]">
      {/* Nav */}
      <header className="sticky top-0 z-20 bg-white/70 dark:bg-slate-900/60 backdrop-blur border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 flex items-center justify-center shadow-sm">
              <Cloud className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-slate-900 dark:text-white">iCloudEZ</span>
          </div>
          <nav className="flex items-center gap-3">
            {user ? (
              <Link href="/dashboard" className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-4 py-2 rounded-lg shadow-sm">
                Go to dashboard <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link href="/auth/signin" className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-2 rounded-lg">Sign in</Link>
                <Link href="/auth/signup" className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-4 py-2 rounded-lg shadow-sm">
                  Get started <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(800px_400px_at_20%_10%,rgba(14,165,233,0.12),transparent)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Your secure cloud,{' '}
                <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">under your control</span>
              </h1>
              <p className="mt-5 text-lg text-slate-600 dark:text-slate-400 max-w-xl">
                Private storage, instant sync, and effortless sharing—built on modern, privacy-first tech.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                {user ? (
                  <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 px-6 py-3 rounded-lg font-medium">
                    Open dashboard <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <>
                    <Link href="/auth/signup" className="inline-flex items-center justify-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 px-6 py-3 rounded-lg font-medium">
                      Create account <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link href="/auth/signin" className="inline-flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 px-6 py-3 rounded-lg font-medium">
                      Sign in
                    </Link>
                  </>
                )}
              </div>
              <div className="mt-6 flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> End-to-end security</div>
                <div className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Fast sync</div>
                <div className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Private by default</div>
              </div>
            </div>
            <div className="relative">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur p-6 shadow-lg">
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <Folder className="h-6 w-6 text-blue-600" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Organize</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <UploadCloud className="h-6 w-6 text-cyan-600" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Upload</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <Share2 className="h-6 w-6 text-indigo-600" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Share</span>
                  </div>
                </div>
                <div className="mt-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 p-4 text-white">
                  <p className="text-sm">“Finally a private cloud that feels as smooth as consumer apps.”</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Community gallery removed */}

      {/* Features */}
      <section className="py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-2xl p-6 border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50">
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">End-to-end Security</h3>
              <p className="mt-2 text-slate-600 dark:text-slate-400">Encryption at rest and in transit. RLS on every table.</p>
            </div>
            <div className="rounded-2xl p-6 border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50">
              <div className="h-10 w-10 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center mb-4">
                <Lock className="h-5 w-5 text-cyan-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Private by Default</h3>
              <p className="mt-2 text-slate-600 dark:text-slate-400">Files are private unless you explicitly share them.</p>
            </div>
            <div className="rounded-2xl p-6 border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50">
              <div className="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-4">
                <Zap className="h-5 w-5 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Fast & Reliable</h3>
              <p className="mt-2 text-slate-600 dark:text-slate-400">Optimized queries and real-time updates when needed.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl p-8 bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-200 text-white dark:text-slate-900 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold">Ready to take control of your files?</h3>
              <p className="text-slate-300 dark:text-slate-700 mt-1">Start for free. No credit card required.</p>
            </div>
            <div className="flex gap-3">
              <Link href="/auth/signup" className="bg-white text-slate-900 px-5 py-3 rounded-lg font-medium shadow-sm dark:bg-slate-900 dark:text-white">Create account</Link>
              <Link href="/auth/signin" className="border border-white/30 px-5 py-3 rounded-lg font-medium hover:bg-white/10">Sign in</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
