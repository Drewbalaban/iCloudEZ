import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Simple Test API: Basic connectivity test')
    
    // Get all headers and cookies
    const allHeaders = Object.fromEntries(request.headers.entries())
    const allCookies = request.cookies.getAll()
    
    // Look for any authentication-related headers
    const authHeaders = {
      authorization: allHeaders.authorization,
      cookie: allHeaders.cookie,
      'x-forwarded-for': allHeaders['x-forwarded-for'],
      host: allHeaders.host
    }
    
    console.log('🔍 Simple Test API: All cookies count:', allCookies.length)
    console.log('🔍 Simple Test API: Auth headers:', authHeaders)
    
    return NextResponse.json({ 
      success: true,
      message: 'Basic connectivity working',
      timestamp: new Date().toISOString(),
      data: {
        totalCookies: allCookies.length,
        cookieNames: allCookies.map(c => c.name),
        authHeaders: authHeaders,
        userAgent: allHeaders['user-agent']
      }
    })

  } catch (error) {
    console.error('🔍 Simple Test API: Exception occurred:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
