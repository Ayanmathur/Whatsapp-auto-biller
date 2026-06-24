import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  const { password } = await request.json()
  const correct = process.env.ADMIN_PASSWORD

  if (password !== correct) {
    return NextResponse.json(
      { error: 'Incorrect password' },
      { status: 401 }
    )
  }

  const cookieStore = await cookies()
  cookieStore.set('admin_session', 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return NextResponse.json({ success: true })
}
