"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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
  items: Record<string, unknown>[];
}

export function HistoryClient({ clientId }: { clientId?: string }) {
  const supabase = createClient();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState("all");

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
          .eq("auth_id", user.id)
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
  }, [supabase, dateRange, searchTerm]);

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
