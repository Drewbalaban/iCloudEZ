'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { 
  User, 
  Save, 
  ArrowLeft,
  Camera,
  Globe,
  Lock,
  Trash
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface ProfileForm {
  username: string
  full_name: string
  bio: string
  avatar_url: string
}

export default function ProfileSettingsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [form, setForm] = useState<ProfileForm>({
    username: '',
    full_name: '',
    bio: '',
    avatar_url: ''
  })
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<any>(null)

  if (!supabase) {
    console.warn('Supabase client not initialized on settings page')
  }

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchProfile()
    }
  }, [user])

  const fetchProfile = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase!
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error

      setProfile(data)
      setForm({
        username: data.username || '',
        full_name: data.full_name || '',
        bio: data.bio || '',
        avatar_url: data.avatar_url || ''
      })
    } catch (error) {
      console.error('Error fetching profile:', error)
      toast.error('Failed to load profile')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSaving(true)
    try {
      const { error } = await supabase!
        .from('profiles')
        .update({
          username: form.username,
          full_name: form.full_name,
          bio: form.bio,
          avatar_url: form.avatar_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error

      toast.success('Profile updated successfully!')
      fetchProfile()
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof ProfileForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Dashboard</span>
              </Link>
            </div>
            
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
              Profile Settings
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Section */}
            <div className="text-center">
              <div className="relative inline-block">
                {form.avatar_url ? (
                  <img
                    src={form.avatar_url}
                    alt="Profile"
                    className="h-24 w-24 rounded-full object-cover mx-auto"
                  />
                ) : (
                  <div className="h-24 w-24 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full flex items-center justify-center mx-auto">
                    <User className="h-12 w-12 text-white" />
                  </div>
                )}
                
                <button
                  type="button"
                  className="absolute bottom-0 right-0 h-8 w-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>
              
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Click the camera icon to change your avatar
              </p>
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Username
              </label>
              <input
                type="text"
                id="username"
                value={form.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter username"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                This will be your public profile URL: /profile/{form.username || 'username'}
              </p>
            </div>

            {/* Full Name */}
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Full Name
              </label>
              <input
                type="text"
                id="full_name"
                value={form.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your full name"
              />
            </div>

            {/* Bio */}
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Bio
              </label>
              <textarea
                id="bio"
                value={form.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Tell people about yourself..."
              />
            </div>

            {/* Avatar URL */}
            <div>
              <label htmlFor="avatar_url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Avatar URL
              </label>
              <input
                type="url"
                id="avatar_url"
                value={form.avatar_url}
                onChange={(e) => handleInputChange('avatar_url', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://example.com/avatar.jpg"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Enter a direct link to an image file
              </p>
            </div>

            {/* Privacy Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Globe className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Privacy Information
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Your profile information is public. Files are private by default unless you make them public using the globe icon in your dashboard.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
          {/* Danger Zone */}
          <div className="mt-10 border-t border-slate-200 dark:border-slate-700 pt-6">
            <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-3">Danger Zone</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Permanently delete your account and all associated data.</p>
            <button
              onClick={async () => {
                if (!user) return
                const confirmed = confirm('This will permanently delete your account and data. Continue?')
                if (!confirmed) return
                try {
                  const { data: sessionData } = await supabase!.auth.getSession()
                  const token = sessionData.session?.access_token
                  if (!token) throw new Error('Not authenticated')
                  const res = await fetch('/api/account/delete', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` }
                  })
                  const body = await res.json()
                  if (!res.ok) throw new Error(body.error || 'Delete failed')
                  toast.success('Account deleted')
                  // Best-effort sign out and redirect
                  await supabase!.auth.signOut()
                  router.push('/')
                } catch (e: any) {
                  console.error(e)
                  toast.error(e?.message || 'Failed to delete account')
                }
              }}
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
            >
              <Trash className="h-4 w-4" /> Delete Account
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
