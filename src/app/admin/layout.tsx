'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors duration-200">
      <style>{`
        /* Hide global AppShell sidebar */
        aside.md\\:flex.md\\:fixed, div.md\\:hidden.fixed.top-0 { display: none !important; }
        .md\\:ml-64 { margin-left: 0 !important; }
      `}</style>

      {/* Collapsed Admin Sidebar */}
      <div className="fixed left-0 top-0 z-50 flex h-screen w-14 flex-col items-center justify-end bg-card border-r pb-5">
        <button
          type="button"
          onClick={handleLogout}
          title="Logout"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-transparent text-foreground hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors text-lg"
        >
          ⏻
        </button>
      </div>

      {/* Main Content Area */}
      <div className="relative flex-1 ml-14">
        {children}
      </div>
    </div>
  )
}

