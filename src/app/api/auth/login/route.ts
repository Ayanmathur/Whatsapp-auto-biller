import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json() as { username?: string; password?: string }

    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Username and password required' }, { status: 400 })
    }

    const supabase = createClient()
    const email = `${username.toLowerCase().trim()}@billing.app`

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      return NextResponse.json({ success: false, error: 'Invalid username or password' }, { status: 401 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'An error occurred' }, { status: 500 })
  }
}
