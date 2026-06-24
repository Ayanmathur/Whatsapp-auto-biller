import type { Metadata } from "next";
import { BillingForm } from "@/components/billing-form";

export const metadata: Metadata = {
  title: "New Bill — Billing System",
  description: "Create a new bill for your customer with auto-calculated GST.",
};

export default function BillingPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl py-10 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">New Bill</h1>
          <p className="text-muted-foreground mt-2">
            Create a new bill with itemized GST calculation.
          </p>
        </div>

        <BillingForm />
      </div>
    </main>
  );
}
