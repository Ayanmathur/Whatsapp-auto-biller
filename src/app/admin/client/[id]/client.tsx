"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface AdminClientForm {
  id?: string;
  whatsapp_enabled?: boolean;
  whatsapp_provider?: string;
  whatsapp_webhook_url?: string;
  whatsapp_webhook_payload?: string;
  whatsapp_api_url?: string;
  whatsapp_instance_id?: string;
  whatsapp_api_key?: string;
  shop_name?: string;
  shop_address?: string;
  gst_number?: string;
  owner_phone?: string;
  whatsapp_message_template?: string;
  [key: string]: unknown; // fallback
}

export function AdminClientSettings({ initialClient }: { initialClient: AdminClientForm }) {
  const [form, setForm] = useState<AdminClientForm>(initialClient);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/clients/${form.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Failed to save client settings");
      toast.success("Client settings updated successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>WhatsApp API Provider Settings</CardTitle>
          <CardDescription>Configure how this client sends WhatsApp messages.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="waEnabled"
              checked={form.whatsapp_enabled as boolean}
              onCheckedChange={(v: boolean) => setForm({ ...form, whatsapp_enabled: v })}
            />
            <Label htmlFor="waEnabled">Enable Automated WhatsApp Sending</Label>
          </div>

          {form.whatsapp_enabled && (
            <>
              <div className="space-y-2">
                <Label>Provider</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={form.whatsapp_provider || "ultramsg"}
                  onChange={(e) => setForm({ ...form, whatsapp_provider: e.target.value })}
                >
                  <option value="ultramsg">Ultramsg</option>
                  <option value="custom">Custom Webhook</option>
                </select>
              </div>

              {form.whatsapp_provider === "custom" ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Webhook URL</Label>
                    <Input
                      placeholder="https://api.example.com/send"
                      value={form.whatsapp_webhook_url || ""}
                      onChange={(e) => setForm({ ...form, whatsapp_webhook_url: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Webhook Payload (JSON)</Label>
                    <p className="text-xs text-muted-foreground">
                      Use {"{{phone}}"} and {"{{message}}"} as placeholders.
                    </p>
                    <textarea
                      className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                      value={form.whatsapp_webhook_payload || ""}
                      onChange={(e) => setForm({ ...form, whatsapp_webhook_payload: e.target.value })}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Ultramsg API URL</Label>
                    <Input
                      value={form.whatsapp_api_url || ""}
                      onChange={(e) => setForm({ ...form, whatsapp_api_url: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Instance ID</Label>
                    <Input
                      value={form.whatsapp_instance_id || ""}
                      onChange={(e) => setForm({ ...form, whatsapp_instance_id: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input
                      type="password"
                      value={form.whatsapp_api_key || ""}
                      onChange={(e) => setForm({ ...form, whatsapp_api_key: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Shop Details & Branding</CardTitle>
          <CardDescription>Edit client shop name, GST, and message template.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Shop Name</Label>
            <Input
              value={form.shop_name || ""}
              onChange={(e) => setForm({ ...form, shop_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Shop Address</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.shop_address || ""}
              onChange={(e) => setForm({ ...form, shop_address: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>GST Number</Label>
              <Input
                value={form.gst_number || ""}
                onChange={(e) => setForm({ ...form, gst_number: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Owner Phone</Label>
              <Input
                value={form.owner_phone || ""}
                onChange={(e) => setForm({ ...form, owner_phone: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>WhatsApp Template</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.whatsapp_message_template || ""}
              onChange={(e) => setForm({ ...form, whatsapp_message_template: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? "Saving..." : "Save Settings on Behalf of Client"}
      </Button>
    </div>
  );
}
