import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// POST /api/auth/update-account
// Body: { email?, password?, currentPassword? }
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email && !password) {
      return NextResponse.json({ error: 'Provide email or password to update' }, { status: 400 });
    }

    // Use admin client to update auth user
    const adminSupabase = createAdminClient();
    const updateData: { email?: string; password?: string } = {};
    if (email) updateData.email = email;
    if (password) updateData.password = password;

    const { data, error } = await adminSupabase.auth.admin.updateUserById(user.id, updateData);
    if (error) throw error;

    // If email changed, also update clients table
    if (email) {
      await adminSupabase
        .from('clients')
        .update({ email })
        .eq('user_id', user.id);
    }

    return NextResponse.json({ success: true, user: data.user });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
