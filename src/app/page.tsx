'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Cloud, Shield, Lock, Zap, Check, ArrowRight, Folder, UploadCloud, Share2 } from 'lucide-react'
import Starfield from '@/components/Starfield'
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
    <div className="min-h-screen hero-gradient relative overflow-hidden">
      <Starfield density={0.00022} layers={3} speed={0.06} />
      {/* Darkness-to-light overlay */}
      <div className="pointer-events-none absolute inset-0 z-[1] top-fade-gradient" />
      {/* Decorative drifting blobs */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full bg-blue-600/20 blur-3xl animate-drift-slow z-0" />
      <div className="pointer-events-none absolute -top-20 right-[-120px] h-[360px] w-[360px] rounded-full bg-cyan-400/20 blur-3xl animate-drift-medium z-0" />
      <div className="pointer-events-none absolute top-[40%] left-[-140px] h-[300px] w-[300px] rounded-full bg-indigo-500/20 blur-3xl animate-drift-slow z-0" />
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
      <section className="relative z-20">
        <div className="absolute inset-0 -z-10" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
          <div className="text-center max-w-3xl mx-auto">
            <div className="animate-float-in" style={{ animationDelay: '50ms', animationDuration: '900ms' }}>
              <div className="mx-auto mb-6 h-12 w-12 rounded-2xl bg-gradient-to-b from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Cloud className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight text-white/95">
                Your Files. In Sync.
                <br />
                Private by Default.
              </h1>
            </div>
            <p className="mt-4 text-base md:text-lg text-slate-400/90 leading-relaxed animate-float-in" style={{ animationDelay: '140ms', animationDuration: '900ms' }}>
              Private storage with instant sync and simple sharing.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3 animate-float-in" style={{ animationDelay: '200ms', animationDuration: '900ms' }}>
              {user ? (
                <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 bg-white text-slate-900 hover:opacity-90 px-5 py-2.5 rounded-full font-medium">
                  Open Dashboard <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <>
                  <Link href="/auth/signup" className="inline-flex items-center justify-center gap-2 bg-white text-slate-900 hover:opacity-90 px-5 py-2.5 rounded-full font-medium">
                    Get Started
                  </Link>
                  <Link href="/auth/signin" className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-5 py-2.5 rounded-full font-medium">
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="mt-16 bottom-halo-gradient">
            <div className="glow-panel p-4 md:p-6">
              <div className="rounded-xl h-[320px] md:h-[420px] bg-slate-900/60 border border-white/5" />
            </div>
          </div>
        </div>
      </section>

      {/* Community gallery removed */}

      {/* Features */}
      <section className="py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-2xl p-5 border border-white/10 bg-white/5 backdrop-blur animate-float-in" style={{ animationDelay: '80ms' }}>
              <div className="h-9 w-9 rounded-lg bg-blue-100/20 flex items-center justify-center mb-3">
                <Shield className="h-4.5 w-4.5 text-blue-400" />
              </div>
              <h3 className="text-base font-medium text-white">End‑to‑end Security</h3>
              <p className="mt-1.5 text-sm text-slate-300/90">Encryption at rest and in transit. RLS everywhere.</p>
            </div>
            <div className="rounded-2xl p-5 border border-white/10 bg-white/5 backdrop-blur animate-float-in" style={{ animationDelay: '140ms' }}>
              <div className="h-9 w-9 rounded-lg bg-cyan-100/20 flex items-center justify-center mb-3">
                <Lock className="h-4.5 w-4.5 text-cyan-400" />
              </div>
              <h3 className="text-base font-medium text-white">Private by Default</h3>
              <p className="mt-1.5 text-sm text-slate-300/90">Files stay private unless you share them.</p>
            </div>
            <div className="rounded-2xl p-5 border border-white/10 bg-white/5 backdrop-blur animate-float-in" style={{ animationDelay: '200ms' }}>
              <div className="h-9 w-9 rounded-lg bg-indigo-100/20 flex items-center justify-center mb-3">
                <Zap className="h-4.5 w-4.5 text-indigo-400" />
              </div>
              <h3 className="text-base font-medium text-white">Fast & Reliable</h3>
              <p className="mt-1.5 text-sm text-slate-300/90">Optimized sync with real‑time updates.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl p-6 md:p-7 bg-gradient-to-r from-blue-600/90 to-cyan-600/90 text-white flex flex-col md:flex-row items-center justify-between gap-4 animate-float-in" style={{ animationDelay: '120ms' }}>
            <div>
              <h3 className="text-xl md:text-2xl font-semibold">Ready to take control of your files?</h3>
              <p className="text-white/90 mt-1 text-sm">Start for free. No credit card required.</p>
            </div>
            <div className="flex gap-3">
              <Link href="/auth/signup" className="bg-white text-slate-900 px-5 py-2.5 rounded-full font-medium shadow-sm">Create account</Link>
              <Link href="/auth/signin" className="border border-white/30 px-5 py-2.5 rounded-full font-medium hover:bg-white/10">Sign in</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
