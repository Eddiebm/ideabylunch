import { NextRequest, NextResponse } from 'next/server'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/dashboard')) {
    const session = req.cookies.get('i2l_session')?.value
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // Validate session exists in Redis via API
    const base = process.env.NEXT_PUBLIC_APP_URL || 'https://idea2lunch.com'
    try {
      const res = await fetch(`${base}/api/auth/session?token=${session}`)
      if (!res.ok) {
        const response = NextResponse.redirect(new URL('/login', req.url))
        response.cookies.delete('i2l_session')
        return response
      }
    } catch {
      // On error, allow through — dashboard will handle gracefully
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
