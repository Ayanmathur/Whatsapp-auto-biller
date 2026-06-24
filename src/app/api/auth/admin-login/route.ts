import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json() as { password?: string }
    if (!password) {
      return NextResponse.json({ success: false, error: 'Password required' }, { status: 400 })
    }

    const expectedPassword = process.env.ADMIN_PASSWORD || 'may@2002'
    
    if (password !== expectedPassword) {
      return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 })
    }

    const secret = process.env.ADMIN_SESSION_SECRET || 'default_admin_session_secret_change_me'

    const response = NextResponse.json({ success: true })
    response.cookies.set('admin_session', secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60,
      path: '/',
    })

    return response
  } catch {
    return NextResponse.json({ success: false, error: 'An error occurred' }, { status: 500 })
  }
}
