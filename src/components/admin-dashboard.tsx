"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface LicenseKey {
  id: string;
  license_key: string;
  client_name: string | null;
  username: string | null;
  is_active: boolean;
  is_used: boolean;
  created_at: string;
  used_at: string | null;
}

interface ClientRow {
  id: string;
  username: string;
  shop_name: string;
  gst_number: string;
  owner_phone: string;
  created_at: string;
  next_billing_date: string;
  client_password?: string;
}

interface BillRow {
  id: string;
  bill_number: string;
  customer_name: string;
  customer_phone: string;
  items: unknown[];
  total: number;
  whatsapp_sent: boolean;
  whatsapp_sent_at: string | null;
  created_at: string;
  bill_date: string;
}

interface DayData {
  day: string;
  bills: number;
  revenue: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getTodayDateStr(): string {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

function getWeekDates(): { start: string; end: string; days: string[] } {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));

  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d.toISOString().split("T")[0]);
  }

  return {
    start: days[0],
    end: days[6],
    days,
  };
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function AdminDashboard() {
  const supabase = createClient();

  const [keys, setKeys] = useState<LicenseKey[]>([]);

  const router = useRouter();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newClientName, setNewClientName] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const [editingClient, setEditingClient] = useState<ClientRow | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeletingClient, setIsDeletingClient] = useState(false);

  const togglePassword = (id: string) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Today's summary
  const [todayBills, setTodayBills] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [todayWhatsApp, setTodayWhatsApp] = useState(0);
  const [todayCustomers, setTodayCustomers] = useState(0);

  // Week chart data
  const [weekData, setWeekData] = useState<DayData[]>([]);

  // Recent bills (last 10)
  const [recentBills, setRecentBills] = useState<BillRow[]>([]);
  const [clientSettings, setClientSettings] = useState<Record<string, unknown> | null>(null);

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [keysRes, clientsRes, { data: billsData }] = await Promise.all([
        fetch("/api/admin/license-keys").then((r) => r.json()),
        fetch("/api/admin/clients").then((r) => r.json()),
        supabase
          .from("bills")
          .select("id, bill_number, customer_name, customer_phone, items, total, whatsapp_sent, created_at, bill_date")
          .order("created_at", { ascending: false }),
      ]);

      if (keysRes?.keys) setKeys(keysRes.keys);
      if (clientsRes?.clients) setClients(clientsRes.clients);

      if (billsData) {
        // Recent bills (last 10)
        setRecentBills(billsData.slice(0, 10) as BillRow[]);

        // Today's summary
        const todayStr = getTodayDateStr();
        const todaysBills = billsData.filter((b) => {
          if (!b.created_at) return false;
          return b.created_at.split("T")[0] === todayStr;
        });

        setTodayBills(todaysBills.length);
        setTodayRevenue(
          todaysBills.reduce((sum, b) => sum + (Number(b.total) || 0), 0)
        );
        setTodayWhatsApp(todaysBills.filter((b) => b.whatsapp_sent).length);
        const uniquePhones = new Set(
          todaysBills.map((b) => b.customer_phone).filter(Boolean)
        );
        setTodayCustomers(uniquePhones.size);

        // Calculate week data
        const week = getWeekDates();
        const dayMap = new Map<string, { bills: number; revenue: number }>();
        for (const date of week.days) {
          dayMap.set(date, { bills: 0, revenue: 0 });
        }

        billsData.forEach((b) => {
          if (!b.created_at) return;
          const dateStr = b.created_at.split("T")[0];
          if (dateStr >= week.start && dateStr <= week.end) {
            const entry = dayMap.get(dateStr);
            if (entry) {
              entry.bills++;
              entry.revenue += Number(b.total) || 0;
            }
          }
        });

        const chartData: DayData[] = week.days.map((date, idx) => {
          const entry = dayMap.get(date) || { bills: 0, revenue: 0 };
          return {
            day: DAY_NAMES[idx],
            bills: entry.bills,
            revenue: Math.round(entry.revenue),
          };
        });
        setWeekData(chartData);
      }

      // Load client settings for whatsapp template
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: settings } = await supabase
          .from('clients')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        if (settings) setClientSettings(settings);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const generateKey = async () => {
    try {
      const res = await fetch("/api/admin/license-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName: newClientName }),
      });
      if (!res.ok) throw new Error("Failed to generate key");
      toast.success("License key generated successfully");
      setNewClientName("");
      loadAdminData();
    } catch {
      toast.error("Failed to generate key");
    }
  };

  const toggleKey = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch("/api/admin/license-keys", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          action: currentStatus ? "revoke" : "reactivate",
        }),
      });
      if (!res.ok) throw new Error("Failed to update key status");
      toast.success(`License key ${currentStatus ? "revoked" : "reactivated"}`);
      loadAdminData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle key");
    }
  };

  const handleEditClick = (client: ClientRow) => {
    setEditingClient(client);
    setEditUsername(client.username || "");
    setEditPassword(client.client_password || "");
  };

  const handleSaveEdit = async () => {
    if (!editingClient) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/clients/${editingClient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: editUsername,
          client_password: editPassword,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to update client");
      }
      toast.success("Client credentials updated successfully");
      setEditingClient(null);
      loadAdminData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update client");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!editingClient) return;
    if (!confirm("Are you sure you want to delete this client? This cannot be undone.")) return;
    
    setIsDeletingClient(true);
    try {
      const res = await fetch(`/api/admin/clients/${editingClient.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to delete client");
      }
      toast.success("Client deleted successfully");
      setEditingClient(null);
      loadAdminData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete client");
    } finally {
      setIsDeletingClient(false);
    }
  };

  const markClientPaid = async (clientId: string) => {
    try {
      const res = await fetch("/api/admin/clients/mark-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      if (!res.ok) throw new Error("Failed to mark paid");
      toast.success("Client marked as paid, extended by 1 month!");
      loadAdminData();
    } catch {
      toast.error("Failed to mark client as paid");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  function handleDashboardWhatsapp(bill: BillRow) {
    const raw = (bill.customer_phone || '').replace(/\D/g, '');
    const ten = raw.slice(-10);
    if (!ten || ten.length !== 10) {
      alert('No valid phone for this customer');
      return;
    }
    const template = (clientSettings?.whatsapp_message_template as string) ||
      'Dear {customer_name}, thank you for visiting!';
    const msg = template
      .replace(/\{customer_name\}/gi, bill.customer_name || 'Customer')
      .replace(/\{shop_name\}/gi, (clientSettings?.shop_name as string) || '');
    const url = 'https://wa.me/91' + ten +
      '?text=' + encodeURIComponent(msg);

    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    supabase.from('bills')
      .update({
        whatsapp_sent: true,
        whatsapp_sent_at: new Date().toISOString()
      })
      .eq('id', bill.id)
      .then(() => {
        setRecentBills(prev => prev.map(b =>
          b.id === bill.id
            ? {...b, whatsapp_sent:true,
               whatsapp_sent_at: new Date().toISOString()}
            : b
        ));
      });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-muted-foreground">
          <svg
            className="h-5 w-5 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Loading admin dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Today's Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 dark:bg-blue-950 p-2.5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-blue-600 dark:text-blue-400"
                >
                  <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                  <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold">{todayBills}</p>
                <p className="text-xs text-muted-foreground">Bills Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-100 dark:bg-emerald-950 p-2.5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-emerald-600 dark:text-emerald-400"
                >
                  <line x1="12" x2="12" y1="2" y2="22" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold font-mono">
                  {formatCurrency(todayRevenue)}
                </p>
                <p className="text-xs text-muted-foreground">Revenue Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 dark:bg-green-950 p-2.5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="text-green-600 dark:text-green-400"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold">{todayWhatsApp}</p>
                <p className="text-xs text-muted-foreground">
                  WhatsApps Today
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-100 dark:bg-purple-950 p-2.5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-purple-600 dark:text-purple-400"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold">{todayCustomers}</p>
                <p className="text-xs text-muted-foreground">
                  Customers Today
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>



      {/* ── This Week's Chart ── */}
      <Card>
        <CardHeader>
          <CardTitle>This Week</CardTitle>
          <CardDescription>
            Bills generated and revenue across all clients over the current
            week.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {weekData.every((d) => d.bills === 0 && d.revenue === 0) ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              No billing data for this week yet.
            </div>
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={weekData}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="day"
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    yAxisId="bills"
                    orientation="left"
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    label={{
                      value: "Bills",
                      angle: -90,
                      position: "insideLeft",
                      style: {
                        fill: "hsl(var(--muted-foreground))",
                        fontSize: 11,
                      },
                    }}
                  />
                  <YAxis
                    yAxisId="revenue"
                    orientation="right"
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    label={{
                      value: "Revenue",
                      angle: 90,
                      position: "insideRight",
                      style: {
                        fill: "hsl(var(--muted-foreground))",
                        fontSize: 11,
                      },
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                    formatter={(value, name) => {
                      if (name === "revenue")
                        return [formatCurrency(Number(value)), "Revenue"];
                      return [String(value), "Bills"];
                    }}
                  />
                  <Legend />
                  <Bar
                    yAxisId="bills"
                    dataKey="bills"
                    name="Bills"
                    fill="hsl(221, 83%, 53%)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                  <Bar
                    yAxisId="revenue"
                    dataKey="revenue"
                    name="Revenue"
                    fill="hsl(142, 71%, 45%)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Recent Bills (Last 10) ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Bills</CardTitle>
              <CardDescription>
                Last 10 bills generated across all clients.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/history")}
            >
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-center">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">WhatsApp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentBills.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell className="font-mono text-sm">
                      {bill.bill_number || "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(bill.created_at)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {bill.customer_name}
                    </TableCell>
                    <TableCell className="text-sm">
                      {bill.customer_phone}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {Array.isArray(bill.items) ? bill.items.length : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatCurrency(Number(bill.total) || 0)}
                    </TableCell>
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
                            onClick={() => handleDashboardWhatsapp(bill)}
                            style={{
                              background:'#25d366', color:'white', border:'none',
                              borderRadius:'6px', padding:'3px 8px',
                              fontSize:'11px', cursor:'pointer'
                            }}
                          >
                            📞 Send
                          </button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {recentBills.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-6 text-muted-foreground"
                    >
                      No bills generated yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── License Keys ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>License Keys</CardTitle>
              <CardDescription>
                Manage license keys for new clients.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Optional Client Name"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                className="w-48"
              />
              <Button onClick={generateKey}>Generate Key</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>License Key</TableHead>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Username (Used By)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-mono text-sm">
                      {k.license_key}
                    </TableCell>
                    <TableCell>{k.client_name || "-"}</TableCell>
                    <TableCell>{k.username || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          !k.is_active
                            ? "destructive"
                            : k.is_used
                              ? "secondary"
                              : "default"
                        }
                      >
                        {!k.is_active
                          ? "Revoked"
                          : k.is_used
                            ? "Used"
                            : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(k.created_at)}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(k.license_key)}
                      >
                        Copy
                      </Button>
                      <Button
                        variant={k.is_active ? "destructive" : "secondary"}
                        size="sm"
                        onClick={() => toggleKey(k.id, k.is_active)}
                      >
                        {k.is_active ? "Revoke" : "Reactivate"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {keys.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-4 text-muted-foreground"
                    >
                      No license keys generated yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Registered Clients ── */}
      <Card>
        <CardHeader>
          <CardTitle>Registered Clients</CardTitle>
          <CardDescription>
            View all registered clients using the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Password</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Registered At</TableHead>
                  <TableHead>Billing Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((c) => {
                  const isOverdue =
                    new Date(c.next_billing_date) < new Date();
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        {c.shop_name}
                      </TableCell>
                      <TableCell>{c.username}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">
                            {visiblePasswords[c.id] ? (c.client_password || '—') : '••••••••'}
                          </span>
                          {c.client_password && (
                            <button
                              onClick={() => togglePassword(c.id)}
                              className="text-xs text-muted-foreground hover:text-foreground"
                            >
                              {visiblePasswords[c.id] ? 'Hide' : 'Show'}
                            </button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{c.owner_phone}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(c.created_at)}
                      </TableCell>
                      <TableCell>
                        {isOverdue ? (
                          <div className="flex items-center gap-2 text-destructive">
                            <span className="flex h-2 w-2 rounded-full bg-destructive animate-pulse" />
                            <span className="text-sm font-medium">
                              Overdue
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Due {formatDate(c.next_billing_date)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {isOverdue && (
                          <Button
                            variant="default"
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => markClientPaid(c.id)}
                          >
                          Mark Paid
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClick(c)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            router.push(`/admin/client/${c.id}`);
                            router.refresh();
                          }}
                        >
                          Manage
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {clients.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-4 text-muted-foreground"
                    >
                      No clients registered yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editingClient} onOpenChange={(open) => !open && setEditingClient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Client Credentials</DialogTitle>
            <DialogDescription>
              Update the username and password for {editingClient?.shop_name}. These will be used for their next login.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">Username</Label>
              <Input
                id="username"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">Password</Label>
              <Input
                id="password"
                type="text"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between sm:justify-between w-full">
            <Button 
              variant="destructive" 
              onClick={handleDeleteClient} 
              disabled={isDeletingClient || isSavingEdit}
            >
              {isDeletingClient ? "Deleting..." : "Delete Client"}
            </Button>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setEditingClient(null)}>Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={isSavingEdit || isDeletingClient}>
                {isSavingEdit ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
