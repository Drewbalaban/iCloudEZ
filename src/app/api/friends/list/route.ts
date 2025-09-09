import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
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

  try {
    // Get all accepted friends (both directions)
    const { data: accepted, error } = await supabase
      .from('friend_requests')
      .select(`
        id,
        requester,
        recipient
      `)
      .eq('status', 'accepted')
      .or(`requester.eq.${user.id},recipient.eq.${user.id}`)

    if (error) {
      console.error('Error fetching friends:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get unique friend IDs
    const friendIds = new Set<string>()
    accepted?.forEach((friendship: any) => {
      if (friendship.requester === user.id) {
        friendIds.add(friendship.recipient)
      } else {
        friendIds.add(friendship.requester)
      }
    })

    // Get profiles for all friends
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, email, avatar_url')
      .in('id', Array.from(friendIds))

    if (profilesError) {
      console.error('Error fetching friend profiles:', profilesError)
      return NextResponse.json({ error: profilesError.message }, { status: 500 })
    }

    const friends = profiles || []

    return NextResponse.json({ friends })
  } catch (error) {
    console.error('Error in friends list API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
