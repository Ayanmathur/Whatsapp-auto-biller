import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = createClient()
  await supabase.auth.signOut()

  const response = NextResponse.json({ success: true })
  response.cookies.delete('admin_session')
  return response
}
