import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// DELETE /api/auth/delete-account
export async function DELETE() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    // Delete clients row first (cascade should handle bills, products etc.)
    await adminSupabase
      .from('clients')
      .delete()
      .eq('user_id', user.id);

    // Delete auth user
    const { error } = await adminSupabase.auth.admin.deleteUser(user.id);
    if (error) throw error;

    // Sign out
    await supabase.auth.signOut();

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
