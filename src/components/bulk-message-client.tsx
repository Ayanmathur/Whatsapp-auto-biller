"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function Spinner() {
  return (
    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

interface Customer {
  name: string;
  phone: string;
}

interface MessageTemplate {
  id: string;
  label: string;
  body: string;
}

/**
 * BROADCAST = same message sent to many customers at once (bulk send)
 * TEMPLATE  = saved reusable message snippets with {customer_name} personalisation
 * These are two distinct concepts shown in separate tabs.
 */
export function BulkMessageClient({ clientId }: { clientId?: string }) {
  const supabase = createClient();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedPhones, setSelectedPhones] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [shop, setShop] = useState<Record<string, unknown> | null>(null);

  // Active tab: "broadcast" | "templates"
  const [tab, setTab] = useState<"broadcast" | "templates">("broadcast");

  // ── Broadcast state ──
  const [broadcastMsg, setBroadcastMsg] = useState("");

  // ── Templates state ──
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [newTemplateLabel, setNewTemplateLabel] = useState("");
  const [newTemplateBody, setNewTemplateBody] = useState("");

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let shopId = clientId;
      if (!shopId) {
        const { data: clientData } = await supabase.from("clients").select("*").eq("user_id", user.id).single();
        if (clientData) { shopId = clientData.id; setShop(clientData); }
      } else {
        const { data: clientData } = await supabase.from("clients").select("*").eq("id", shopId).single();
        setShop(clientData);
      }

      if (!shopId) return;

      const { data, error } = await supabase
        .from("bills").select("customer_name, customer_phone").eq("client_id", shopId).order("created_at", { ascending: false });
      if (error) throw error;

      const uniqueCustomers = new Map<string, string>();
      data?.forEach(b => {
        if (b.customer_phone && b.customer_phone.length >= 10) {
          if (!uniqueCustomers.has(b.customer_phone)) uniqueCustomers.set(b.customer_phone, b.customer_name || "");
        }
      });
      setCustomers(Array.from(uniqueCustomers.entries()).map(([phone, name]) => ({ phone, name })));

      // Load saved templates from localStorage (client-specific)
      const stored = localStorage.getItem(`wa_templates_${shopId}`);
      if (stored) {
        try { setTemplates(JSON.parse(stored)); } catch { /* ignore */ }
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load customers.");
    } finally {
      setLoading(false);
    }
  }, [supabase, clientId]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const saveTemplates = (updated: MessageTemplate[]) => {
    setTemplates(updated);
    const shopId = shop?.id as string;
    if (shopId) localStorage.setItem(`wa_templates_${shopId}`, JSON.stringify(updated));
  };

  const toggleSelection = (phone: string) => {
    const next = new Set(selectedPhones);
    if (next.has(phone)) next.delete(phone); else next.add(phone);
    setSelectedPhones(next);
  };

  const toggleAll = () => {
    setSelectedPhones(selectedPhones.size === customers.length ? new Set() : new Set(customers.map(c => c.phone)));
  };

  // ── Broadcast: automated API send ──
  const handleBroadcastSend = async () => {
    if (selectedPhones.size === 0) return toast.error("Select at least one customer.");
    if (!broadcastMsg.trim()) return toast.error("Message cannot be empty.");
    if (!shop?.whatsapp_automation_enabled) return toast.error("WhatsApp Automation is disabled. Use the manual Send buttons.");

    setSending(true);
    let successCount = 0;
    try {
      const selected = customers.filter(c => selectedPhones.has(c.phone));
      for (const customer of selected) {
        const msg = broadcastMsg
          .replace(/\{customer_name\}/gi, customer.name || "Customer")
          .replace(/\{shop_name\}/gi, (shop?.shop_name as string) || "");
        try {
          const res = await fetch("/api/send-whatsapp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: customer.phone, message: msg, clientId: shop.id }),
          });
          if (res.ok) successCount++;
        } catch { /* continue */ }
        await new Promise(r => setTimeout(r, 500));
      }
      toast.success(`Sent ${successCount}/${selected.length} messages!`);
      setSelectedPhones(new Set());
    } catch {
      toast.error("An error occurred.");
    } finally {
      setSending(false);
    }
  };

  // ── Broadcast: manual wa.me link for one customer ──
  const openManualWhatsApp = (customer: Customer, body?: string) => {
    const ten = (customer.phone || '').replace(/\D/g, '').slice(-10);
    if (ten.length !== 10) { toast.error("Invalid phone: " + customer.phone); return; }

    const template = body || broadcastMsg || (shop?.whatsapp_message_template as string) || "Dear {customer_name}, thank you for visiting!";
    const msg = template
      .replace(/\{customer_name\}/gi, customer.name || "Customer")
      .replace(/\{shop_name\}/gi, (shop?.shop_name as string) || "");

    const a = document.createElement("a");
    a.href = "https://wa.me/91" + ten + "?text=" + encodeURIComponent(msg);
    a.target = "_blank"; a.rel = "noopener noreferrer";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  // ── Templates CRUD ──
  const addTemplate = () => {
    if (!newTemplateLabel.trim() || !newTemplateBody.trim()) {
      toast.error("Fill in both the label and message body."); return;
    }
    const t: MessageTemplate = { id: Date.now().toString(), label: newTemplateLabel.trim(), body: newTemplateBody.trim() };
    saveTemplates([...templates, t]);
    setNewTemplateLabel(""); setNewTemplateBody("");
    toast.success("Template saved!");
  };

  const deleteTemplate = (id: string) => {
    saveTemplates(templates.filter(t => t.id !== id));
    toast.success("Template deleted.");
  };

  const startEdit = (t: MessageTemplate) => {
    setEditingTemplate({ ...t });
  };

  const saveEdit = () => {
    if (!editingTemplate) return;
    saveTemplates(templates.map(t => t.id === editingTemplate.id ? editingTemplate : t));
    setEditingTemplate(null);
    toast.success("Template updated.");
  };

  return (
    <div className="space-y-4">
      {/* Automation status banner */}
      <div className={`rounded-[10px] px-4 py-3 flex items-start gap-2.5 border ${
        shop?.whatsapp_automation_enabled
          ? 'bg-green-50 border-green-300 dark:bg-green-950 dark:border-green-700'
          : 'bg-amber-50 border-amber-300 dark:bg-amber-950 dark:border-amber-700'
      }`}>
        <span className="text-lg">{shop?.whatsapp_automation_enabled ? '✅' : '⚠️'}</span>
        <div>
          <div className={`font-semibold text-[13px] ${
            shop?.whatsapp_automation_enabled
              ? 'text-green-800 dark:text-green-300'
              : 'text-amber-800 dark:text-amber-300'
          }`}>
            {shop?.whatsapp_automation_enabled
              ? 'WhatsApp Automation Active — Broadcast uses API to auto-send'
              : 'WhatsApp Automation Disabled — Use manual Send buttons or enable API in Settings'}
          </div>
          <div className="text-[11px] mt-0.5 text-gray-500 dark:text-gray-400">
            <strong>Broadcast</strong> = same message to many customers at once &nbsp;|&nbsp;
            <strong>Templates</strong> = saved reusable message snippets you can pick per customer
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {(['broadcast', 'templates'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`min-h-[44px] px-5 text-sm font-semibold bg-transparent border-none cursor-pointer capitalize border-b-2 transition-colors ${
              tab === t
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t === 'broadcast' ? '📢 Broadcast' : '📝 Templates'}
          </button>
        ))}
      </div>

      {/* ── BROADCAST TAB ── */}
      {tab === 'broadcast' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Broadcast Message</CardTitle>
              <CardDescription>
                Send the same message to all selected customers at once.{' '}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{'{customer_name}'}</code>{' '}
                and{' '}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{'{shop_name}'}</code>{' '}
                will be replaced per customer.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder={`Hello {customer_name}, we have a special offer at {shop_name} this weekend!`}
                rows={4}
                value={broadcastMsg}
                onChange={e => setBroadcastMsg(e.target.value)}
              />
              <div className="flex gap-2 flex-wrap">
                {shop?.whatsapp_automation_enabled ? (
                  <Button onClick={handleBroadcastSend} disabled={sending || selectedPhones.size === 0}>
                    {sending ? <Spinner /> : null}
                    🚀 Send to {selectedPhones.size} Customer{selectedPhones.size !== 1 ? 's' : ''} (API)
                  </Button>
                ) : (
                  <p className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-md border border-amber-200">
                    API not configured. Use the manual &quot;📞 Send&quot; buttons in the customer table below.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Customer List</CardTitle>
              <CardDescription>{customers.length} unique customers from your billing history.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border max-h-[480px] overflow-y-auto overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[44px]">
                        <input type="checkbox" className="h-4 w-4" checked={selectedPhones.size > 0 && selectedPhones.size === customers.length} onChange={toggleAll} aria-label="Select all" />
                      </TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                    ) : customers.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No customers found.</TableCell></TableRow>
                    ) : (
                      customers.map(c => (
                        <TableRow key={c.phone}>
                          <TableCell>
                            <input type="checkbox" className="h-4 w-4" checked={selectedPhones.has(c.phone)} onChange={() => toggleSelection(c.phone)} />
                          </TableCell>
                          <TableCell className="font-medium">{c.name || 'N/A'}</TableCell>
                          <TableCell className="font-mono text-sm">{c.phone}</TableCell>
                          <TableCell className="text-right">
                            <button
                              onClick={() => openManualWhatsApp(c)}
                              className="min-h-[44px] min-w-[44px] bg-[#25d366] hover:bg-[#1da851] text-white border-none rounded-md px-3 text-xs cursor-pointer font-semibold transition-colors dark:bg-[#25d366] dark:hover:bg-[#1da851]"
                            >
                              📞 Send
                            </button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TEMPLATES TAB ── */}
      {tab === 'templates' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Saved Templates</CardTitle>
              <CardDescription>
                Create reusable message templates. Click &quot;Use&quot; to apply one to a customer via manual WhatsApp,
                or edit/delete as needed.{' '}
                Use <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{'{customer_name}'}</code>{' '}
                and <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{'{shop_name}'}</code>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {templates.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No templates yet. Create one below.</p>
              ) : (
                <div className="space-y-3">
                  {templates.map(t => (
                    <div key={t.id} className="border border-gray-200 dark:border-gray-700 rounded-[10px] px-4 py-3">
                      {editingTemplate?.id === t.id ? (
                        <div className="space-y-2">
                          <Input value={editingTemplate.label} onChange={e => setEditingTemplate({ ...editingTemplate, label: e.target.value })} placeholder="Template label" />
                          <Textarea rows={3} value={editingTemplate.body} onChange={e => setEditingTemplate({ ...editingTemplate, body: e.target.value })} />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={saveEdit}>Save</Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingTemplate(null)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="font-semibold text-[13px] mb-1">{t.label}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2.5 whitespace-pre-wrap">{t.body}</div>
                          <div className="flex gap-2 flex-wrap">
                            <Button size="sm" variant="outline" onClick={() => startEdit(t)}>✏️ Edit</Button>
                            <Button size="sm" variant="outline" onClick={() => deleteTemplate(t.id)} className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-950">🗑️ Delete</Button>
                          </div>

                          {/* Use template for a specific customer */}
                          {customers.length > 0 && (
                            <details className="mt-2">
                              <summary className="text-xs cursor-pointer text-blue-600 dark:text-blue-400 font-semibold min-h-[44px] flex items-center">📞 Send to a customer</summary>
                              <div className="mt-1.5 max-h-[200px] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
                                {customers.map(c => (
                                  <div key={c.phone} className="flex justify-between items-center px-3 min-h-[44px] border-b border-gray-100 dark:border-gray-800 last:border-b-0">
                                    <span className="text-xs">{c.name} · {c.phone}</span>
                                    <button
                                      onClick={() => openManualWhatsApp(c, t.body)}
                                      className="min-h-[44px] min-w-[44px] bg-[#25d366] hover:bg-[#1da851] text-white border-none rounded-[5px] px-2.5 text-[11px] cursor-pointer font-semibold transition-colors"
                                    >
                                      Send
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add new template */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Create New Template</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>Label / Name</Label>
                <Input value={newTemplateLabel} onChange={e => setNewTemplateLabel(e.target.value)} placeholder="e.g. Weekend Offer, Festival Greeting" />
              </div>
              <div className="space-y-1">
                <Label>Message Body</Label>
                <Textarea
                  rows={4}
                  value={newTemplateBody}
                  onChange={e => setNewTemplateBody(e.target.value)}
                  placeholder="Hello {customer_name}, thank you for shopping at {shop_name}!"
                />
              </div>
              <Button onClick={addTemplate}>+ Save Template</Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
