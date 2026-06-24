import { BulkMessageClient } from "@/components/bulk-message-client";

export default function BulkMessagePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl py-10 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Bulk Messaging</h1>
          <p className="text-muted-foreground mt-2">
            Send WhatsApp messages to multiple customers at once.
          </p>
        </div>
        <BulkMessageClient />
      </div>
    </main>
  );
}
