import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Recreate response and set cookies on the response only (per Next.js API)
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }: any) =>
            supabaseResponse.cookies.set({ name, value, ...options })
          )
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components and API routes
  await supabase.auth.getUser()

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * 
     * This includes API routes (/api/*) which need authentication
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
