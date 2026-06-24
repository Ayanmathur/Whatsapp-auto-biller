import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { licenseKey, username, password } = await request.json() as {
      licenseKey?: string; username?: string; password?: string
    }

    if (!licenseKey || !username || !password) {
      return NextResponse.json({ success: false, error: 'All fields are required' }, { status: 400 })
    }

    const trimmed = username.toLowerCase().trim()

    if (!/^[a-z0-9_]{3,30}$/.test(trimmed)) {
      return NextResponse.json(
        { success: false, error: 'Username must be 3-30 characters, only letters, numbers, and underscores' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const email = `${trimmed}@billing.app`

    // 1. Validate license key
    const { data: license, error: licError } = await supabase
      .from('license_keys')
      .select('*')
      .eq('license_key', licenseKey.trim())
      .eq('is_active', true)
      .eq('is_used', false)
      .single()

    if (licError || !license) {
      return NextResponse.json({ success: false, error: 'Invalid or expired license key' }, { status: 400 })
    }

    // 2. Check username uniqueness
    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .eq('username', trimmed)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ success: false, error: 'Username already taken' }, { status: 400 })
    }

    // 3. Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      if (authError?.message?.includes('already been registered')) {
        return NextResponse.json({ success: false, error: 'Username already taken' }, { status: 400 })
      }
      return NextResponse.json({ success: false, error: authError?.message || 'Failed to create account' }, { status: 500 })
    }

    const userId = authData.user.id

    // 4. Consume license key
    await supabase
      .from('license_keys')
      .update({
        is_used: true,
        username: trimmed,
        user_id: userId,
        used_at: new Date().toISOString(),
      })
      .eq('id', license.id)

    // 5. Create blank client record
    await supabase
      .from('clients')
      .insert({
        user_id: userId,
        username: trimmed,
        shop_name: trimmed,
        shop_address: '',
        gst_number: '00AAAAA0000A1Z0',
        owner_phone: '',
      })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Signup error:', err)
    return NextResponse.json({ success: false, error: 'An error occurred' }, { status: 500 })
  }
}
