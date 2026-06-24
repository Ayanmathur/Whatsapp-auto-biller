import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookie = request.cookies.get('admin_session')?.value
  const secret = process.env.ADMIN_SESSION_SECRET || 'default_admin_session_secret_change_me'
  if (cookie !== secret && cookie !== 'authenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const data = await request.json()
  const supabase = createAdminClient()
  
  // We only extract the fields we allow admin to update
  const payload = {
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
  }

  const { error } = await supabase
    .from('clients')
    .update(payload)
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
