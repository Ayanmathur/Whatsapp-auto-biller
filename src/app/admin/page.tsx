import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin-dashboard";
import { LogoutButton } from "./LogoutButton";

export const metadata: Metadata = {
  title: "Admin Dashboard — Billing System",
  description:
    "Overview of billing operations, revenue, and key business metrics.",
};

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl py-10 px-4">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Overview of your billing operations and key metrics.
            </p>
          </div>
          <LogoutButton />
        </div>

        <AdminDashboard />
      </div>
    </main>
  );
}
