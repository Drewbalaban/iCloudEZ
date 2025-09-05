import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug Cookies API: Starting cookie inspection')
    
    // Get all headers and cookies
    const allHeaders = Object.fromEntries(request.headers.entries())
    const allCookies = request.cookies.getAll()
    
    // Look specifically for Supabase-related cookies
    const supabaseCookies = allCookies.filter(cookie => 
      cookie.name.includes('supabase') || 
      cookie.name.includes('auth') ||
      cookie.name.includes('session')
    )
    
    console.log('🔍 Debug Cookies API: All headers:', allHeaders)
    console.log('🔍 Debug Cookies API: All cookies:', allCookies)
    console.log('🔍 Debug Cookies API: Supabase cookies:', supabaseCookies)
    
    return NextResponse.json({ 
      success: true,
      message: 'Cookie inspection complete',
      data: {
        totalCookies: allCookies.length,
        supabaseCookies: supabaseCookies.length,
        allCookies: allCookies.map(c => ({ 
          name: c.name, 
          value: c.value.substring(0, 30) + (c.value.length > 30 ? '...' : '')
        })),
        headers: {
          host: allHeaders.host,
          origin: allHeaders.origin,
          referer: allHeaders.referer,
          'user-agent': allHeaders['user-agent']
        }
      }
    })

  } catch (error) {
    console.error('🔍 Debug Cookies API: Exception occurred:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
