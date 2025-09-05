'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase as supabaseClient } from '@/lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase'
import { Users, UserPlus, Check, X, Search } from 'lucide-react'
import { toast } from 'sonner'

type ProfileLite = { id: string; username: string; email: string }

export default function FriendsPage() {
  const { user, loading } = useAuth()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<ProfileLite[]>([])
  const [pending, setPending] = useState<any[]>([])
  const [incoming, setIncoming] = useState<any[]>([])
  const [friends, setFriends] = useState<ProfileLite[]>([])
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({})
  const [busyId, setBusyId] = useState<string | null>(null)

  const getSb = (): SupabaseClient<Database> | null => (supabaseClient as unknown as SupabaseClient<Database>) || null

  useEffect(() => {
    if (!user || loading) return
    refreshLists()
  }, [user?.id, loading])

  const refreshLists = async () => {
    const sb = getSb()
    if (!sb || !user) return
    try {
      // Pending sent
      const { data: sent } = await sb
        .from('friend_requests')
        .select('id,recipient,status,created_at')
        .eq('requester', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      setPending(sent || [])

      // Incoming
      const { data: recv } = await sb
        .from('friend_requests')
        .select('id,requester,status,created_at')
        .eq('recipient', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      setIncoming(recv || [])

      // Accepted friends: union where user involved
      const { data: accepted } = await sb
        .from('friend_requests')
        .select('requester,recipient,status')
        .eq('status', 'accepted')
        .or(`requester.eq.${user.id},recipient.eq.${user.id}`)
      const friendIds = Array.from(new Set((accepted || []).map((r: any) => r.requester === user.id ? r.recipient : r.requester)))
      // Collect all ids we need profile info for
      const neededIds = Array.from(new Set([
        ...friendIds,
        ...((sent || []).map((r: any) => r.recipient)),
        ...((recv || []).map((r: any) => r.requester)),
      ].filter(Boolean)))
      if (neededIds.length) {
        const { data: profs } = await sb.from('profiles').select('id,username,email').in('id', neededIds)
        const map: Record<string, ProfileLite> = {}
        ;(profs || []).forEach((p: any) => { map[p.id] = p })
        setProfiles(map)
        // friends list from map
        setFriends(friendIds.map(fid => map[fid]).filter(Boolean) as any)
      } else {
        setProfiles({})
        setFriends([])
      }
    } catch (e) {
      // ignore
    }
  }

  const onSearch = async () => {
    try {
      const res = await fetch(`/api/friends/search?q=${encodeURIComponent(q)}`)
      const json = await res.json()
      setResults(json.results || [])
    } catch {
      setResults([])
    }
  }

  const sendRequest = async (recipientId: string) => {
    setBusyId(recipientId)
    try {
      const res = await fetch('/api/friends/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipientId }) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      toast.success('Request sent')
      setResults(prev => prev.filter(p => p.id !== recipientId))
      refreshLists()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to send request')
    } finally {
      setBusyId(null)
    }
  }

  const respond = async (requestId: string, action: 'accept' | 'decline') => {
    setBusyId(requestId)
    try {
      const res = await fetch('/api/friends/respond', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId, action }) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      toast.success(action === 'accept' ? 'Friend added' : 'Request declined')
      refreshLists()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to respond')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
  if (!user) return null

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Friends</h1>
          </div>
          <Link href="/dashboard" className="text-sm text-slate-600 dark:text-slate-300 hover:underline">Back to Dashboard</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Find friends */}
        <section className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-base font-medium text-slate-900 dark:text-white mb-4">Find friends</h2>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onSearch()} placeholder="Search by username or email" className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
            </div>
            <button onClick={onSearch} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white">Search</button>
          </div>
          {results.length > 0 && (
            <ul className="mt-4 divide-y divide-slate-200 dark:divide-slate-700">
              {results.map(p => (
                <li key={p.id} className="py-3 flex items-center justify-between">
                  <div>
                    <Link href={`/profile/${p.username}`} className="text-sm font-medium text-slate-900 dark:text-white underline">@{p.username}</Link>
                    <div className="text-xs text-slate-500">{p.email}</div>
                  </div>
                  <button disabled={busyId === p.id} onClick={() => sendRequest(p.id)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 text-sm">
                    <UserPlus className="h-4 w-4" /> Add
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Incoming requests */}
        <section className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-base font-medium text-slate-900 dark:text-white mb-4">Requests</h2>
          {incoming.length === 0 && pending.length === 0 ? (
            <div className="text-slate-500 dark:text-slate-400 text-sm">No requests</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium mb-2">Incoming</h3>
                <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                  {incoming.map(r => (
                    <li key={r.id} className="py-3 flex items-center justify-between">
                      {profiles[r.requester]?.username ? (
                        <Link href={`/profile/${profiles[r.requester].username}`} className="text-sm text-slate-900 dark:text-white underline">@{profiles[r.requester].username}</Link>
                      ) : (
                        <span className="text-sm text-slate-900 dark:text-white">{r.requester}</span>
                      )}
                      <div className="flex items-center gap-2">
                        <button disabled={busyId === r.id} onClick={() => respond(r.id, 'accept')} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-600 text-white text-xs"><Check className="h-3 w-3" /> Accept</button>
                        <button disabled={busyId === r.id} onClick={() => respond(r.id, 'decline')} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs"><X className="h-3 w-3" /> Decline</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">Sent</h3>
                <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                  {pending.map(r => (
                    <li key={r.id} className="py-3 text-sm text-slate-500">
                      Pending to {profiles[r.recipient]?.username ? (
                        <Link href={`/profile/${profiles[r.recipient].username}`} className="underline">@{profiles[r.recipient].username}</Link>
                      ) : r.recipient}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>

        {/* Friends list */}
        <section className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-base font-medium text-slate-900 dark:text-white mb-4">Friends</h2>
          {friends.length === 0 ? (
            <div className="text-slate-500 dark:text-slate-400 text-sm">No friends yet</div>
          ) : (
            <ul className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {friends.map(f => (
                <li key={f.id} className="p-3 rounded border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <Link href={`/profile/${f.username}`} className="text-sm font-medium text-slate-900 dark:text-white underline">@{f.username}</Link>
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-slate-500 hidden sm:block">{f.email}</div>
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/friends/unfriend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ friendId: f.id }) })
                          const json = await res.json()
                          if (!res.ok) throw new Error(json.error || 'Failed')
                          toast.success('Removed from friends')
                          refreshLists()
                        } catch (e: any) {
                          toast.error(e?.message || 'Failed to remove')
                        }
                      }}
                      className="text-xs px-2 py-1 rounded bg-red-600 text-white"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}


