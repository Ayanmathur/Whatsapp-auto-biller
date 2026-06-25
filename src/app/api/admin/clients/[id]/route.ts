import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookie = request.cookies.get('admin_session')?.value
  const secret = process.env.ADMIN_SESSION_SECRET || 'default_admin_session_secret_change_me'
  if (cookie !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const data = await request.json()
  const supabase = createAdminClient()
  
  // If we are updating username or password, we must update Supabase Auth
  if (data.username || data.client_password) {
    const { data: client, error: clientErr } = await supabase
      .from('clients')
      .select('user_id')
      .eq('id', params.id)
      .single()

    if (clientErr) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    if (client?.user_id) {
      const authUpdates: Record<string, string> = {}
      if (data.username) {
        authUpdates.email = `${data.username}@billing.app`
      }
      if (data.client_password) {
        authUpdates.password = data.client_password
      }

      const { error: authError } = await supabase.auth.admin.updateUserById(
        client.user_id,
        authUpdates
      )
      
      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 400 })
      }
    }
  }

  // Extract the fields we allow admin to update
  const payload: Record<string, unknown> = {
    shop_name: data.shop_name,
    shop_address: data.shop_address,
    gst_number: data.gst_number,
    owner_phone: data.owner_phone,
    whatsapp_enabled: data.whatsapp_enabled,
    whatsapp_provider: data.whatsapp_provider,
    whatsapp_webhook_url: data.whatsapp_webhook_url,
    whatsapp_webhook_payload: data.whatsapp_webhook_payload,
    whatsapp_api_url: data.whatsapp_api_url,
    whatsapp_instance_id: data.whatsapp_instance_id,
    whatsapp_api_key: data.whatsapp_api_key,
    whatsapp_message_template: data.whatsapp_message_template,
    username: data.username,
    client_password: data.client_password,
  }

  // Remove undefined fields
  Object.keys(payload).forEach(key => {
    if (payload[key] === undefined) {
      delete payload[key]
    }
  })

  const { error } = await supabase
    .from('clients')
    .update(payload)
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookie = request.cookies.get('admin_session')?.value
  const secret = process.env.ADMIN_SESSION_SECRET || 'default_admin_session_secret_change_me'
  if (cookie !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // First get the user_id to delete the auth user
  const { data: client, error: fetchErr } = await supabase
    .from('clients')
    .select('user_id')
    .eq('id', params.id)
    .single()

  if (fetchErr) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  // Delete from clients table
  const { error: deleteErr } = await supabase
    .from('clients')
    .delete()
    .eq('id', params.id)

  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 500 })
  }

  // Delete auth user if it exists
  if (client?.user_id) {
    await supabase.auth.admin.deleteUser(client.user_id)
  }

  return NextResponse.json({ success: true })
}
