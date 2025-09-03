import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const { requestId, action } = body || {}
  if (!requestId || !['accept','decline'].includes(action)) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll() {}
      }
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: reqRow, error: fetchErr } = await supabase
    .from('friend_requests')
    .select('id,recipient,status')
    .eq('id', requestId)
    .single()
  if (fetchErr || !reqRow) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  if (reqRow.recipient !== user.id) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  if (reqRow.status !== 'pending') return NextResponse.json({ error: 'Already handled' }, { status: 400 })

  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const admin = adminKey ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, adminKey) : null
  const client = admin ?? supabase
  const { error } = await client
    .from('friend_requests')
    .update({ status: action === 'accept' ? 'accepted' : 'declined', responded_at: new Date().toISOString() })
    .eq('id', requestId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}


