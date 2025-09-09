'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { documentService } from '@/lib/database.service'
import type { Database } from '@/lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase as supabaseClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { Users, Share2, Trash2, Shield, FileText, Plus, Inbox } from 'lucide-react'

type Doc = Database['public']['Tables']['documents']['Row']

export default function SharingManagerPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [docs, setDocs] = useState<Doc[]>([])
  const [shares, setShares] = useState<Array<{ id: string; document_id: string; shared_with: string; permission_level: string; created_at: string; expires_at: string | null }>>([])
  const [receivedShares, setReceivedShares] = useState<Array<{ id: string; document_id: string; shared_by: string; permission_level: string; created_at: string; expires_at: string | null }>>([])
  const [profilesById, setProfilesById] = useState<Record<string, { id: string; username: string; email: string }>>({})
  const [activeTab, setActiveTab] = useState<'byMe' | 'withMe'>('byMe')
  const [selectedDocId, setSelectedDocId] = useState<string>('')
  const [targetUsername, setTargetUsername] = useState('')
  const [busy, setBusy] = useState(false)

  const getSb = (): SupabaseClient<Database> | null => (supabaseClient as unknown as SupabaseClient<Database>) || null

  useEffect(() => {
    if (!loading && !user) router.push('/auth/signin')
  }, [user, loading, router])

  const loadData = useCallback(async () => {
    const sb = getSb()
    if (!sb || !user) return
    try {
      // Load user's documents
      const userDocs = await documentService.getUserDocuments()
      setDocs(userDocs)
      if (userDocs.length && !selectedDocId) setSelectedDocId(userDocs[0].id)

      // Load active shares created by user
      const { data: sharesData, error: sharesErr } = await sb
        .from('file_shares')
        .select('id,document_id,shared_with,permission_level,created_at,expires_at')
        .eq('shared_by', user.id)
        .order('created_at', { ascending: false })
      if (sharesErr) throw sharesErr
      setShares(sharesData || [])

      // Load shares received by user
      const { data: receivedData, error: receivedErr } = await sb
        .from('file_shares')
        .select('id,document_id,shared_by,permission_level,created_at,expires_at')
        .eq('shared_with', user.id)
        .order('created_at', { ascending: false })
      if (receivedErr) throw receivedErr
      setReceivedShares(receivedData || [])

      // Fetch profile usernames for participants
      const uniqueUserIds = Array.from(new Set([
        ...((sharesData || []) as Array<{ shared_with: string }>).map(s => s.shared_with),
        ...((receivedData || []) as Array<{ shared_by: string }>).map(s => s.shared_by),
      ]))
      if (uniqueUserIds.length > 0) {
        const { data: profs, error: profErr } = await sb
          .from('profiles')
          .select('id,username,email')
          .in('id', uniqueUserIds)
        if (profErr) throw profErr
        const map: Record<string, { id: string; username: string; email: string }> = {}
        ;(profs || []).forEach((p: { id: string; username: string; email: string }) => { map[p.id] = { id: p.id, username: p.username, email: p.email } })
        setProfilesById(map)
      } else {
        setProfilesById({})
      }
    } catch (e: unknown) {
      console.error('Sharing manager load error:', e)
      toast.error('Failed to load sharing data')
    }
  }, [user, selectedDocId])

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user?.id, loadData, user])

  const sharesByDoc = useMemo(() => {
    const grouped: Record<string, typeof shares> = {}
    shares.forEach(s => {
      if (!grouped[s.document_id]) grouped[s.document_id] = []
      grouped[s.document_id].push(s)
    })
    return grouped
  }, [shares])

  const selectedDoc = useMemo(() => docs.find(d => d.id === selectedDocId) || null, [docs, selectedDocId])

  const handleCreateShare = async () => {
    const sb = getSb()
    if (!sb || !user) return
    if (!selectedDocId) { toast.error('Choose a file to share'); return }
    if (!targetUsername.trim()) { toast.error('Enter a username or email'); return }
    setBusy(true)
    try {
      // Share by username or email: look up user id first
      // Try username
      let recipientId: string | null = null
      const uname = targetUsername.trim().replace(/^@+/, '')
      let res = await (sb as any).from('profiles').select('id').ilike('username', uname).single()
      if (!res.error && res.data?.id) recipientId = res.data.id
      if (!recipientId) {
        res = await (sb as any).from('profiles').select('id').ilike('email', targetUsername.trim()).single()
        if (!res.error && res.data?.id) recipientId = res.data.id
      }
      if (!recipientId) { toast.error('User not found'); return }
      if (recipientId === user.id) { toast.error('Cannot share with yourself'); return }

      // Prevent duplicate
      const { data: existing, error: dupErr } = await sb
        .from('file_shares')
        .select('id')
        .eq('document_id', selectedDocId)
        .eq('shared_with', recipientId)
        .single()
      if (existing) { toast.info('Already shared with this user'); return }
      if (dupErr && dupErr.code && dupErr.code !== 'PGRST116') { throw dupErr }

      const { error } = await ((sb as any)
        .from('file_shares')
        .insert({ document_id: selectedDocId, shared_by: user.id, shared_with: recipientId, permission_level: 'read', expires_at: null }))
      if (error) throw error
      toast.success('Share created')
      setTargetUsername('')
      await loadData()
    } catch (e: unknown) {
      console.error('Create share error:', e)
      toast.error((e as Error)?.message || 'Failed to create share')
    } finally {
      setBusy(false)
    }
  }

  const handleRevoke = async (shareId: string) => {
    const sb = getSb()
    if (!sb) return
    try {
      const { error } = await sb.from('file_shares').delete().eq('id', shareId)
      if (error) throw error
      toast.success('Share revoked')
      setShares(prev => prev.filter(s => s.id !== shareId))
    } catch (e: unknown) {
      console.error('Revoke share error:', e)
      toast.error('Failed to revoke share')
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Sharing Manager</h1>
          </div>
          <Link href="/dashboard" className="text-sm text-slate-600 dark:text-slate-300 hover:underline">Back to Dashboard</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('byMe')}
            className={`px-3 py-1.5 rounded-lg text-sm ${activeTab === 'byMe' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'}`}
          >
            Shared by me
          </button>
          <button
            onClick={() => setActiveTab('withMe')}
            className={`px-3 py-1.5 rounded-lg text-sm ${activeTab === 'withMe' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'}`}
          >
            Shared with me
          </button>
        </div>

        {/* Create Share */}
        <section className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-base font-medium text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Share2 className="h-4 w-4" /> Create a Share
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <label className="block text-sm mb-1 text-slate-600 dark:text-slate-300">Choose file</label>
              <select
                value={selectedDocId}
                onChange={(e) => setSelectedDocId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {docs.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-1">
              <label className="block text-sm mb-1 text-slate-600 dark:text-slate-300">Username or Email</label>
              <input
                type="text"
                value={targetUsername}
                onChange={(e) => setTargetUsername(e.target.value)}
                placeholder="e.g. alice or alice@example.com"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div className="sm:col-span-1 flex items-end">
              <button
                onClick={handleCreateShare}
                disabled={busy}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
              >
                <Plus className="h-4 w-4" /> Share
              </button>
            </div>
          </div>
          {selectedDoc && (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <FileText className="h-3 w-3" /> Selected: {selectedDoc.name}
            </p>
          )}
        </section>

        {/* Active Shares - two views */}
        {activeTab === 'byMe' ? (
          <section className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-base font-medium text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4" /> Shared by me
            </h2>
            {shares.length === 0 ? (
              <div className="text-slate-500 dark:text-slate-400">No active shares.</div>
            ) : (
              <div className="space-y-4">
                {docs.map(doc => (
                  <div key={doc.id} className="border border-slate-200 dark:border-slate-700 rounded-lg">
                    <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/40 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-500" />
                        <span className="font-medium text-slate-900 dark:text-white">{doc.name}</span>
                      </div>
                      <span className="text-xs text-slate-500">{(sharesByDoc[doc.id] || []).length} share(s)</span>
                    </div>
                    {(sharesByDoc[doc.id] || []).length === 0 ? (
                      <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">Not shared</div>
                    ) : (
                      <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                        {(sharesByDoc[doc.id] || []).map(s => (
                          <li key={s.id} className="px-4 py-3 flex items-center justify-between">
                            <div className="space-y-0.5">
                              <div className="text-sm text-slate-900 dark:text-white">
                                {profilesById[s.shared_with]?.username || profilesById[s.shared_with]?.email || s.shared_with}
                              </div>
                              <div className="text-xs text-slate-500">{s.permission_level}</div>
                            </div>
                            <button
                              onClick={() => handleRevoke(s.id)}
                              className="inline-flex items-center gap-1 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" /> Revoke
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : (
          <section className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-base font-medium text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Inbox className="h-4 w-4" /> Shared with me
            </h2>
            {receivedShares.length === 0 ? (
              <div className="text-slate-500 dark:text-slate-400">Nothing shared with you yet.</div>
            ) : (
              <ul className="space-y-2">
                {receivedShares.map(s => {
                  const doc = docs.find(d => d.id === s.document_id)
                  return (
                    <li key={s.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-slate-500" />
                        <div>
                          <div className="text-sm text-slate-900 dark:text-white">{doc?.name || s.document_id}</div>
                          <div className="text-xs text-slate-500">
                            from {profilesById[s.shared_by]?.username ? (
                              <Link href={`/profile/${profilesById[s.shared_by]?.username}`} className="underline">
                                @{profilesById[s.shared_by]?.username}
                              </Link>
                            ) : (profilesById[s.shared_by]?.email || s.shared_by)}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-slate-500">{s.permission_level}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )}
      </main>
    </div>
  )
}


