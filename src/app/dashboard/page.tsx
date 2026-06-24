import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClientDashboard } from '@/components/client-dashboard'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl py-10 px-4">
        <ClientDashboard />
      </div>
    </main>
  )
}
