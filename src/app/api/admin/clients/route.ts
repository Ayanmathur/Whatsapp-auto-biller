import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const cookie = request.cookies.get('admin_session')?.value
  const secret = process.env.ADMIN_SESSION_SECRET || 'default_admin_session_secret_change_me'
  if (cookie !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('clients')
    .select('id, username, shop_name, gst_number, owner_phone, created_at, user_id, next_billing_date, client_password')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ clients: data })
}
