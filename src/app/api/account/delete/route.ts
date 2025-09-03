import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string

export async function POST(req: NextRequest) {
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }

  try {
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accessToken = authHeader.replace('Bearer ', '').trim()

    // Verify the token belongs to the caller
    const supabase = createClient(supabaseUrl, anonKey)
    const { data: userData, error: userErr } = await supabase.auth.getUser(accessToken)
    if (userErr || !userData.user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = userData.user.id

    // Best-effort: delete user files in storage under documents/<userId>
    try {
      const adminForStorage = createClient(supabaseUrl, serviceKey)
      // List top-level folder for user prefix
      const { data: list } = await adminForStorage.storage.from('documents').list(userId, { limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } })
      const toDelete: string[] = []
      if (list && list.length) {
        for (const item of list) {
          // If file
          if ((item as any).id === undefined && item.name) {
            toDelete.push(`${userId}/${item.name}`)
          }
        }
      }
      if (toDelete.length) {
        await adminForStorage.storage.from('documents').remove(toDelete)
      }
    } catch (_) {
      // ignore storage cleanup errors
    }

    // Delete the user via admin API (cascades will remove profile/documents)
    const admin = createClient(supabaseUrl, serviceKey)
    const { error: delErr } = await (admin as any).auth.admin.deleteUser(userId)
    if (delErr) {
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
