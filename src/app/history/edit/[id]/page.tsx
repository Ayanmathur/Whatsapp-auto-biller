import { BillingForm } from "@/components/billing-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default function EditBillPage({ params }: { params: { id: string } }) {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl py-10 px-4">
        <div className="mb-8 flex items-center gap-4">
          <Link href="/history">
            <Button variant="outline" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Bill</h1>
            <p className="text-muted-foreground mt-1">
              Modify the details of an existing bill.
            </p>
          </div>
        </div>
        
        <BillingForm editBillId={params.id} />
      </div>
    </main>
  );
}
