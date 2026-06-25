import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminClientSettings } from './client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ClientDashboard } from '@/components/client-dashboard'

export default async function AdminClientPage({
  params,
}: {
  params: { id: string };
}) {
  const cookieStore = cookies()
  const adminSession = cookieStore.get('admin_session')?.value
  
  if (adminSession !== process.env.ADMIN_SESSION_SECRET) {
    redirect('/login')
  }

  const supabase = createAdminClient()
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!client) {
    return <div>Client not found.</div>
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-5xl py-10 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Manage Client: {client.shop_name || client.username}</h1>
          <p className="text-muted-foreground mt-2">
            You are editing settings on behalf of {client.username}.
          </p>
        </div>
        
        <div className="space-y-6">
          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            
            <TabsContent value="dashboard">
              <ClientDashboard clientId={params.id} />
            </TabsContent>
            
            <TabsContent value="settings">
              <AdminClientSettings initialClient={client} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  )
}
