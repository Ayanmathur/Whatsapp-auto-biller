"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function Spinner() {
  return (
    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}

interface Customer {
  name: string;
  phone: string;
}

export function BulkMessageClient({ clientId }: { clientId?: string }) {
  const supabase = createClient();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedPhones, setSelectedPhones] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [shop, setShop] = useState<Record<string, unknown> | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let shopId = clientId;
      if (!shopId) {
        const { data: clientData } = await supabase
          .from("clients")
          .select("*")
          .eq("user_id", user.id)
          .single();
        if (clientData) {
          shopId = clientData.id;
          setShop(clientData);
        }
      } else {
        const { data: clientData } = await supabase
          .from("clients")
          .select("*")
          .eq("id", shopId)
          .single();
        setShop(clientData);
      }

      if (!shopId) return;

      const { data, error } = await supabase
        .from("bills")
        .select("customer_name, customer_phone")
        .eq("client_id", shopId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Extract unique customers
      const uniqueCustomers = new Map<string, string>();
      data?.forEach(b => {
        if (b.customer_phone && b.customer_phone.length >= 10) {
          if (!uniqueCustomers.has(b.customer_phone)) {
            uniqueCustomers.set(b.customer_phone, b.customer_name || "");
          }
        }
      });

      const customerList = Array.from(uniqueCustomers.entries()).map(([phone, name]) => ({
        phone,
        name
      }));

      setCustomers(customerList);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load customers.");
    } finally {
      setLoading(false);
    }
  }, [supabase, clientId]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const toggleSelection = (phone: string) => {
    const newSet = new Set(selectedPhones);
    if (newSet.has(phone)) newSet.delete(phone);
    else newSet.add(phone);
    setSelectedPhones(newSet);
  };

  const toggleAll = () => {
    if (selectedPhones.size === customers.length) {
      setSelectedPhones(new Set());
    } else {
      setSelectedPhones(new Set(customers.map(c => c.phone)));
    }
  };

  const handleBulkSend = async () => {
    if (selectedPhones.size === 0) return toast.error("Select at least one customer.");
    if (!message.trim()) return toast.error("Message cannot be empty.");

    if (!shop?.whatsapp_enabled) {
      return toast.error("WhatsApp Automation is disabled. You can only send manually via the table buttons.");
    }

    setSending(true);
    let successCount = 0;
    
    try {
      const selectedCustomers = customers.filter(c => selectedPhones.has(c.phone));
      
      for (const customer of selectedCustomers) {
        const personalizedMsg = message.replace(/\{customer_name\}/g, customer.name);
        
        try {
          const res = await fetch("/api/send-whatsapp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phone: customer.phone,
              message: personalizedMsg,
              clientId: shop.id
            }),
          });
          if (res.ok) successCount++;
        } catch (e) {
          console.error("Failed to send to", customer.phone, e);
        }
        
        // Small delay to prevent rate limits
        await new Promise(r => setTimeout(r, 500));
      }
      
      toast.success(`Successfully sent ${successCount} messages!`);
      setSelectedPhones(new Set());
    } catch {
      toast.error("An error occurred while sending bulk messages.");
    } finally {
      setSending(false);
    }
  };

  const openManualWhatsApp = (customer: Customer) => {
    if (!message.trim()) return toast.error("Message cannot be empty.");
    // Open synchronously
    const newWindow = window.open("about:blank", "_blank");
    if (newWindow) {
      newWindow.document.write("<div style='font-family: sans-serif; padding: 20px;'>Processing request, please wait...</div>");
    }

    const personalizedMsg = message.replace(/\{customer_name\}/g, customer.name);
    const waUrl = `https://wa.me/91${customer.phone}?text=${encodeURIComponent(personalizedMsg)}`;
    
    if (newWindow) {
      newWindow.location.href = waUrl;
    } else {
      window.open(waUrl, "_blank");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Broadcast Message</CardTitle>
          <CardDescription>
            Write a message to send to selected customers. Use{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
              {"{customer_name}"}
            </code>{" "}
            to personalize it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              placeholder="e.g. Hello {customer_name}, we are offering a 20% discount this weekend!"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            {shop?.whatsapp_enabled ? (
              <Button onClick={handleBulkSend} disabled={sending || selectedPhones.size === 0}>
                {sending ? <Spinner /> : null}
                Send to {selectedPhones.size} Customers (Automated)
              </Button>
            ) : (
              <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
                WhatsApp Automation is turned off in Settings. Please use the manual &quot;Send&quot; buttons in the table below to send messages one by one.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Customer List</CardTitle>
          <CardDescription>
            {customers.length} unique customers found in your billing history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border h-[500px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={selectedPhones.size > 0 && selectedPhones.size === customers.length}
                      onChange={toggleAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">Loading...</TableCell>
                  </TableRow>
                ) : customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">No customers found.</TableCell>
                  </TableRow>
                ) : (
                  customers.map(c => (
                    <TableRow key={c.phone}>
                      <TableCell>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300"
                          checked={selectedPhones.has(c.phone)}
                          onChange={() => toggleSelection(c.phone)}
                        />
                      </TableCell>
                      <TableCell>{c.name || "N/A"}</TableCell>
                      <TableCell>{c.phone}</TableCell>
                      <TableCell className="text-right">
                        {!shop?.whatsapp_enabled && (
                          <Button variant="outline" size="sm" onClick={() => openManualWhatsApp(c)}>
                            Manual Send
                          </Button>
                        )}
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
  );
}
