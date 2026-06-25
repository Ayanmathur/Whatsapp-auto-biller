import type { Metadata } from "next";
import { SettingsForm } from "@/components/settings-form";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Settings — Billing System",
  description: "Configure your shop details, bill format, and WhatsApp integration.",
};

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl py-10 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure your shop details, default bill size, and WhatsApp
            message template.
          </p>
        </div>

        <SettingsForm />
      </div>
    </main>
  );
}
