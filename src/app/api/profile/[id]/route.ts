import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    // Require authentication via SSR client
    const ssr = createServerClient(url, anon, {
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll() {}
      }
    })
    const { data: { user } } = await ssr.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.id !== id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data, error } = await ssr
      .from('profiles')
      .select('username,email,avatar_url')
      .eq('id', id)
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 404 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
