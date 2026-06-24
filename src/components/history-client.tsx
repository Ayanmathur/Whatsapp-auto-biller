"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { sendWhatsappMessage } from "@/lib/sendWhatsapp";
import { toast } from "sonner";
import * as XLSX from "xlsx";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Bill {
  id: string;
  bill_number: string;
  customer_name: string;
  customer_phone: string;
  total: number;
  whatsapp_sent: boolean;
  created_at: string;
  whatsapp_sent_at?: string;
  items: Record<string, unknown>[];
}

export function HistoryClient({ clientId }: { clientId?: string }) {
  const supabase = createClient();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState("all");
  const [cachedSettings, setCachedSettings] = useState<any>(null);
  const [sendingWaId, setSendingWaId] = useState<string | null>(null);
  const pathname = usePathname();

  const fetchBills = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let shopId = clientId;
      if (!shopId) {
        const { data: clientData } = await supabase
          .from("clients")
          .select("id")
          .eq("user_id", user.id)
          .single();
        if (clientData) {
          shopId = clientData.id;
        }
      }

      if (!shopId) return;

      let query = supabase
        .from("bills")
        .select("*")
        .eq("client_id", shopId)
        .order("created_at", { ascending: false });

      // Apply date filter
      if (dateRange !== "all") {
        const date = new Date();
        if (dateRange === "7d") date.setDate(date.getDate() - 7);
        if (dateRange === "30d") date.setDate(date.getDate() - 30);
        if (dateRange === "year") date.setFullYear(date.getFullYear() - 1);
        query = query.gte("created_at", date.toISOString());
      }

      // Apply search filter
      if (searchTerm) {
        query = query.or(`customer_name.ilike.%${searchTerm}%,customer_phone.ilike.%${searchTerm}%,bill_number.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setBills(data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load bills.");
    } finally {
      setLoading(false);
    }
  }, [supabase, dateRange, searchTerm, clientId]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this bill? This cannot be undone.")) return;
    try {
      const { error } = await supabase.from("bills").delete().eq("id", id);
      if (error) throw error;
      toast.success("Bill deleted successfully.");
      fetchBills();
    } catch {
      toast.error("Failed to delete bill.");
    }
  };

  const exportToXlsx = () => {
    if (bills.length === 0) return toast.error("No bills to export");
    const exportData = bills.map((b) => ({
      "Bill Number": b.bill_number,
      "Date": new Date(b.created_at).toLocaleString(),
      "Customer Name": b.customer_name,
      "Customer Phone": b.customer_phone,
      "Total Amount": b.total,
      "WhatsApp Sent": b.whatsapp_sent ? "Yes" : "No",
      "Items Count": b.items?.length || 0,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bills");
    XLSX.writeFile(wb, `Bills_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportCustomerList = () => {
    if (bills.length === 0) return toast.error("No customers to export");
    
    // Aggregate unique customers
    const customers = new Map<string, { name: string; phone: string; totalSpent: number; visits: number }>();
    bills.forEach((b) => {
      if (!b.customer_phone) return;
      const key = b.customer_phone;
      if (!customers.has(key)) {
        customers.set(key, { name: b.customer_name, phone: b.customer_phone, totalSpent: 0, visits: 0 });
      }
      const c = customers.get(key)!;
      c.totalSpent += Number(b.total);
      c.visits += 1;
    });

    const exportData = Array.from(customers.values()).map(c => ({
      "Customer Name": c.name,
      "Phone Number": c.phone,
      "Total Visits": c.visits,
      "Total Spent": c.totalSpent
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customers");
    XLSX.writeFile(wb, `Customers_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleSendWhatsapp = async (bill: Bill) => {
    if (!bill.customer_phone) {
      toast.error("No phone number for this customer.");
      return;
    }

    setSendingWaId(bill.id);

    try {
      let settings = cachedSettings;
      if (!settings) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        let shopId = clientId;
        if (!shopId) {
          const { data: clientData } = await supabase.from("clients").select("id").eq("user_id", user.id).single();
          if (clientData) shopId = clientData.id;
        }

        if (shopId) {
          const { data: dbSettings } = await supabase.from("clients").select("*").eq("id", shopId).single();
          settings = dbSettings;
          setCachedSettings(dbSettings);
        }
      }

      if (!settings) throw new Error("Could not load shop settings");

      toast("Preparing WhatsApp message...");
      const result = await sendWhatsappMessage({
        bill: {
          id: bill.id,
          customer_name: bill.customer_name || "Customer",
          customer_phone: bill.customer_phone,
        },
        clientSettings: {
          whatsapp_automation_enabled: settings.whatsapp_automation_enabled ?? false,
          whatsapp_api_token: settings.whatsapp_api_token || null,
          whatsapp_phone_number_id: settings.whatsapp_phone_number_id || null,
          whatsapp_message_template: settings.whatsapp_message_template || "",
          shop_name: settings.shop_name,
        }
      });

      if (result.success) {
        if (result.mode === "auto") {
          toast.success(`✅ WhatsApp sent to ${bill.customer_name} automatically!`);
          
          // Instantly update the row locally
          setBills((prev) =>
            prev.map((b) =>
              b.id === bill.id ? { ...b, whatsapp_sent: true, whatsapp_sent_at: new Date().toISOString() } : b
            )
          );

          // Update backend silently
          await supabase.from("bills").update({ whatsapp_sent: true, whatsapp_sent_at: new Date().toISOString() }).eq("id", bill.id);
        } else {
          toast.success(`📱 WhatsApp Web opened — send the message to ${bill.customer_name}`);
          // Do not update the row locally because it's manual mode
          if (result.popupBlocked && result.url) {
            toast.error("Popup blocked! Click here to open WhatsApp", {
              action: { label: "Open WhatsApp", onClick: () => window.open(result.url, "_blank") }
            });
          }
        }
      } else {
        toast.error(`Auto-send failed. Trying WhatsApp Web...`);
        // Fallback manually
        let finalMessage = settings.whatsapp_message_template || `Dear {customer_name}, thank you for your purchase from {shop_name}!`;
        finalMessage = finalMessage.replace(/\{customer_name\}/g, bill.customer_name);
        finalMessage = finalMessage.replace(/\{shop_name\}/g, settings.shop_name);
        
        let formattedPhone = bill.customer_phone.replace(/[\s\-\(\)]/g, "");
        if (formattedPhone.startsWith("0")) formattedPhone = "91" + formattedPhone.substring(1);
        else if (formattedPhone.startsWith("+91")) formattedPhone = formattedPhone.substring(1);
        else if (formattedPhone.length === 10) formattedPhone = "91" + formattedPhone;

        const encodedMessage = encodeURIComponent(finalMessage);
        const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
        
        let opened = false;
        try {
          const popup = window.open(whatsappUrl, "_blank");
          if (popup) opened = true;
        } catch (e) {}

        if (opened) {
          toast.success(`📱 WhatsApp Web opened — send the message to ${bill.customer_name}`);
        } else {
          toast.error("Popup blocked! Click here to open WhatsApp", {
            action: { label: "Open WhatsApp", onClick: () => window.open(whatsappUrl, "_blank") }
          });
        }
      }

    } catch (err) {
      console.error(err);
      toast.error("Failed to prepare WhatsApp message.");
    } finally {
      setSendingWaId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by bill #, customer name or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                  Export Data
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportToXlsx}>Export Filtered Bills (.xlsx)</DropdownMenuItem>
                <DropdownMenuItem onClick={exportCustomerList}>Export Customer List (.xlsx)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
          <CardDescription>Found {bills.length} bills matching your criteria.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill #</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading bills...</TableCell>
                  </TableRow>
                ) : bills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No bills found.</TableCell>
                  </TableRow>
                ) : (
                  bills.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-sm">{b.bill_number}</TableCell>
                      <TableCell className="text-sm">{new Date(b.created_at).toLocaleString()}</TableCell>
                      <TableCell>{b.customer_name || "-"}</TableCell>
                      <TableCell>{b.customer_phone || "-"}</TableCell>
                      <TableCell className="font-medium">₹{b.total}</TableCell>
                      <TableCell>
                        <Badge variant={b.whatsapp_sent ? "secondary" : "outline"} className={b.whatsapp_sent ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : ""}>
                          {b.whatsapp_sent ? "Sent" : "Not Sent"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {/* WhatsApp Action Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={sendingWaId === b.id}
                          onClick={() => handleSendWhatsapp(b)}
                          className={b.whatsapp_sent ? "text-emerald-500 opacity-70 hover:opacity-100 hover:text-emerald-600" : "text-slate-600 hover:text-emerald-600"}
                          title={b.whatsapp_sent && b.whatsapp_sent_at ? `Sent on ${new Date(b.whatsapp_sent_at).toLocaleString()}` : "Send WhatsApp"}
                        >
                          {sendingWaId === b.id ? (
                            <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : b.whatsapp_sent ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                          )}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => {
                          const route = pathname.includes('/admin') 
                            ? `/admin/client/${clientId}?editBillId=${b.id}` 
                            : `/history/edit/${b.id}`;
                          window.open(route, '_self');
                        }}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => window.open(`/api/print?id=${b.id}`, '_blank')}>
                          Print
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(b.id)}>
                          Delete
                        </Button>
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
