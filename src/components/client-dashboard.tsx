"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";


type Bill = {
  id: string;
  customer_name: string;
  customer_phone: string;
  total: number;
  whatsapp_sent: boolean;
  whatsapp_sent_at: string | null;
  bill_date: string;
  created_at: string;
};

type ShopSettings = {
  id: string;
  whatsapp_enabled: boolean;
  whatsapp_message_template: string;
  shop_name: string;
};

type FilterType = "all" | "day" | "week" | "month";

export function ClientDashboard({ clientId }: { clientId?: string }) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [shop, setShop] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("month");
  const [sendingBulk, setSendingBulk] = useState(false);
  const [sendingSingle, setSendingSingle] = useState<string | null>(null);
  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Get Shop Settings
      let shopId = clientId;
      if (!shopId) {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const { data: clientData } = await supabase
            .from("clients")
            .select("id")
            .eq("user_id", userData.user.id)
            .single();
          if (clientData) {
            shopId = clientData.id;
          }
        }
      }

      if (shopId) {
        const { data: config } = await supabase
          .from("clients")
          .select("id, whatsapp_enabled, whatsapp_message_template, shop_name")
          .eq("id", shopId)
          .single();
        if (config) {
          setShop(config as ShopSettings);
        }

        const { data: billsData } = await supabase
          .from("bills")
          .select("*")
          .eq("client_id", shopId)
          .order("created_at", { ascending: false });
        
        if (billsData) {
          setBills(billsData as Bill[]);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [clientId, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredBills = bills.filter((b) => {
    if (filter === "all") return true;
    const date = new Date(b.created_at);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (filter === "day") return diffDays <= 1;
    if (filter === "week") return diffDays <= 7;
    if (filter === "month") return diffDays <= 30;
    return true;
  });

  // Independent revenue calculations
  const now = new Date();
  let dailyRevenue = 0;
  let weeklyRevenue = 0;
  let monthlyRevenue = 0;

  bills.forEach((b) => {
    const date = new Date(b.created_at);
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    const total = Number(b.total) || 0;
    if (diffDays <= 1) dailyRevenue += total;
    if (diffDays <= 7) weeklyRevenue += total;
    if (diffDays <= 30) monthlyRevenue += total;
  });
  const totalBills = filteredBills.length;
  const totalWhatsApps = filteredBills.filter(b => b.whatsapp_sent).length;
  
  // Unique customers based on phone number
  const uniqueCustomers = new Set(filteredBills.map(b => b.customer_phone)).size;

  const handleResend = async (bill: Bill) => {
    if (!shop?.whatsapp_enabled) {
      toast.error("WhatsApp API not enabled. Please enable it in Settings.");
      return;
    }
    
    setSendingSingle(bill.id);
    try {
      const message = shop.whatsapp_message_template.replace(/\{customer_name\}/g, bill.customer_name);
      const waRes = await fetch("/api/send-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: bill.customer_phone,
          message,
          billId: bill.id,
          clientId: shop.id
        }),
      });

      if (!waRes.ok) throw new Error("Failed to send");
      toast.success(`WhatsApp sent to ${bill.customer_name}`);
      await loadData(); // refresh status
    } catch (err) {
      console.error(err);
      toast.error("Failed to send WhatsApp");
    } finally {
      setSendingSingle(null);
    }
  };

  const handleBulkSend = async () => {
    if (!shop?.whatsapp_enabled) {
      toast.error("WhatsApp API not enabled. Please enable it in Settings.");
      return;
    }

    const unsentBills = filteredBills.filter(b => !b.whatsapp_sent);
    if (unsentBills.length === 0) {
      toast.info("All bills in this period have already been sent WhatsApp messages.");
      return;
    }

    setSendingBulk(true);
    let successCount = 0;
    
    // Sequential send to respect potential rate limits loosely
    for (const bill of unsentBills) {
      try {
        const message = shop.whatsapp_message_template.replace(/\{customer_name\}/g, bill.customer_name);
        const waRes = await fetch("/api/send-whatsapp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: bill.customer_phone,
            message,
            billId: bill.id,
            clientId: shop.id
          }),
        });

        if (waRes.ok) successCount++;
        // Small delay between sends
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {
        console.error("Bulk send failed for", bill.customer_phone, e);
      }
    }

    setSendingBulk(false);
    toast.success(`Sent ${successCount} out of ${unsentBills.length} messages.`);
    loadData();
  };

  if (loading) {
    return <div className="flex justify-center py-10"><RefreshCw className="animate-spin h-6 w-6" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Today</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>



      {/* Revenue Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{dailyRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{weeklyRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{monthlyRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Other Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBills}</div>
            <p className="text-xs text-muted-foreground">In selected period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueCustomers}</div>
            <p className="text-xs text-muted-foreground">Unique in selected period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">WhatsApps Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalWhatsApps}</div>
            <p className="text-xs text-muted-foreground">Automated messages delivered</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Row */}
      <div className="flex justify-between items-center bg-card border rounded-lg p-4">
        <div>
          <h3 className="font-semibold">Bulk Message Sender</h3>
          <p className="text-sm text-muted-foreground">Send WhatsApp messages to all unsent customers in the selected period.</p>
        </div>
        <Button 
          onClick={handleBulkSend} 
          disabled={sendingBulk || !shop?.whatsapp_enabled}
        >
          {sendingBulk && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
          Bulk Send ({filteredBills.filter(b => !b.whatsapp_sent).length} unsent)
        </Button>
      </div>

      {/* Customer List */}
      <Card>
        <CardHeader>
          <CardTitle>Customer History</CardTitle>
          <CardDescription>View customers and their message status.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Bill Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-center">WhatsApp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBills.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell className="font-medium">{bill.customer_name}</TableCell>
                    <TableCell>{bill.customer_phone}</TableCell>
                    <TableCell>₹{Number(bill.total).toLocaleString("en-IN")}</TableCell>
                    <TableCell>{new Date(bill.created_at).toLocaleDateString("en-IN")}</TableCell>
                    <TableCell className="text-center">
                      {bill.whatsapp_sent ? (
                        <span style={{
                          background:'#dcfce7', color:'#166534',
                          padding:'2px 8px', borderRadius:'20px',
                          fontSize:'11px', fontWeight:'500'
                        }}>
                          ✅ Sent
                        </span>
                      ) : (
                        <div style={{display:'flex',alignItems:'center',gap:6,justifyContent:'center'}}>
                          <span style={{
                            background:'#f3f4f6', color:'#666',
                            padding:'2px 8px', borderRadius:'20px',
                            fontSize:'11px', fontWeight:'500'
                          }}>
                            Not Sent
                          </span>
                          <button
                            type="button"
                            onClick={() => handleResend(bill)}
                            disabled={sendingSingle === bill.id}
                            style={{
                              background:'#25d366', color:'white', border:'none',
                              borderRadius:'6px', padding:'3px 8px',
                              fontSize:'11px', cursor:'pointer',
                              opacity: sendingSingle === bill.id ? 0.7 : 1
                            }}
                          >
                            {sendingSingle === bill.id ? 'Sending...' : '📞 Send'}
                          </button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredBills.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      No records found for the selected period.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
