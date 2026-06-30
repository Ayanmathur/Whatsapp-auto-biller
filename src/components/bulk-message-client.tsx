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
      <div style={{
        background: shop?.whatsapp_automation_enabled ? '#f0fdf4' : '#fffbeb',
        border: `1px solid ${shop?.whatsapp_automation_enabled ? '#86efac' : '#fcd34d'}`,
        borderRadius: 10, padding: '12px 16px',
        display: 'flex', alignItems: 'flex-start', gap: 10,
      }}>
        <span style={{ fontSize: 18 }}>{shop?.whatsapp_automation_enabled ? '✅' : '⚠️'}</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: shop?.whatsapp_automation_enabled ? '#166534' : '#92400e' }}>
            {shop?.whatsapp_automation_enabled
              ? 'WhatsApp Automation Active — Broadcast uses API to auto-send'
              : 'WhatsApp Automation Disabled — Use manual Send buttons or enable API in Settings'}
          </div>
          <div style={{ fontSize: 11, marginTop: 2, color: '#6b7280' }}>
            <strong>Broadcast</strong> = same message to many customers at once &nbsp;|&nbsp;
            <strong>Templates</strong> = saved reusable message snippets you can pick per customer
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e5e7eb' }}>
        {(['broadcast', 'templates'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 20px', fontSize: 14, fontWeight: 600,
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: tab === t ? '2px solid #2563eb' : '2px solid transparent',
              color: tab === t ? '#2563eb' : '#6b7280',
              textTransform: 'capitalize',
            }}
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
              <div className="rounded-md border" style={{ maxHeight: 480, overflowY: 'auto' }}>
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
                              style={{ background: '#25d366', color: 'white', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
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
                    <div key={t.id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 16px' }}>
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
                          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{t.label}</div>
                          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10, whiteSpace: 'pre-wrap' }}>{t.body}</div>
                          <div className="flex gap-2 flex-wrap">
                            <Button size="sm" variant="outline" onClick={() => startEdit(t)}>✏️ Edit</Button>
                            <Button size="sm" variant="outline" onClick={() => deleteTemplate(t.id)} style={{ color: '#dc2626', borderColor: '#fca5a5' }}>🗑️ Delete</Button>
                          </div>

                          {/* Use template for a specific customer */}
                          {customers.length > 0 && (
                            <details style={{ marginTop: 8 }}>
                              <summary style={{ fontSize: 12, cursor: 'pointer', color: '#2563eb', fontWeight: 600 }}>📞 Send to a customer</summary>
                              <div style={{ marginTop: 6, maxHeight: 200, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 6 }}>
                                {customers.map(c => (
                                  <div key={c.phone} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', borderBottom: '1px solid #f3f4f6' }}>
                                    <span style={{ fontSize: 12 }}>{c.name} · {c.phone}</span>
                                    <button
                                      onClick={() => openManualWhatsApp(c, t.body)}
                                      style={{ background: '#25d366', color: 'white', border: 'none', borderRadius: 5, padding: '3px 10px', fontSize: 11, cursor: 'pointer' }}
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
