import { HistoryClient } from '@/components/history-client'

export default function BillHistoryPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl py-10 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Bill History</h1>
          <p className="text-muted-foreground mt-2">
            Search, filter, delete, and export your billing history.
          </p>
        </div>
        <HistoryClient />
      </div>
    </main>
  )
}
