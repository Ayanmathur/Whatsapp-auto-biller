import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { licenseKey } = await request.json() as { licenseKey?: string }
    if (!licenseKey) {
      return NextResponse.json({ valid: false, error: 'License key required' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: license, error } = await supabase
      .from('license_keys')
      .select('id')
      .eq('license_key', licenseKey.trim())
      .eq('is_active', true)
      .eq('is_used', false)
      .maybeSingle()

    if (error || !license) {
      return NextResponse.json({ valid: false, error: 'Invalid or expired license key' })
    }

    return NextResponse.json({ valid: true })
  } catch {
    return NextResponse.json({ valid: false, error: 'An error occurred' }, { status: 500 })
  }
}
