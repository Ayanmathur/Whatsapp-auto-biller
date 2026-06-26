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
  whatsapp_sent_at?: string;
  items: Record<string, unknown>[];
  subtotal?: number;
  gst_amount?: number;
  discount_type?: string;
  discount_value?: number;
  discount_amount?: number;
  extra_charges?: { label: string; amount: number }[];
}

export function HistoryClient({ clientId }: { clientId?: string }) {
  const supabase = createClient();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState("all");
  const [cachedSettings, setCachedSettings] = useState<Record<string, unknown> | null>(null);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');


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

      const { data: dbSettings } = await supabase.from("clients").select("*").eq("id", shopId).single();
      if (dbSettings) {
        setCachedSettings(dbSettings);
      }

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

  function handleWhatsappFromHistory(bill: Bill) {
    const raw = (bill.customer_phone || '').replace(/\D/g, '');
    const ten = raw.slice(-10);

    if (!ten || ten.length !== 10) {
      toast.error('No valid phone number for this customer');
      return;
    }

    const template = (cachedSettings?.whatsapp_message_template as string) ||
      'Dear {customer_name}, thank you for visiting!';

    const msg = template
      .replace(/\{customer_name\}/gi, bill.customer_name || 'Customer')
      .replace(/\{shop_name\}/gi, (cachedSettings?.shop_name as string) || '');

    const url = 'https://wa.me/91' + ten +
      '?text=' + encodeURIComponent(msg);

    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Mark as sent in Supabase
    supabase
      .from('bills')
      .update({
        whatsapp_sent: true,
        whatsapp_sent_at: new Date().toISOString()
      })
      .eq('id', bill.id)
      .then(() => {
        setBills(prev => prev.map(b =>
          b.id === bill.id
            ? { ...b, whatsapp_sent: true,
                whatsapp_sent_at: new Date().toISOString() }
            : b
        ));
      });
  }

  function handleHistoryPrint(bill: Bill) {
    const itemRows = (bill.items || []).map((item: Record<string, unknown>, i: number) => {
      const amt = Number(item.qty || 0) * Number(item.price || item.rate || 0) *
        (1 + Number(item.gst_percent || item.gst || 0) / 100);
      return `<tr style="background:${i%2===0?'#fff':'#fafafa'}">
        <td style="padding:5px 8px">${i+1}</td>
        <td style="padding:5px 8px">${item.name || ''}</td>
        <td style="padding:5px 8px;text-align:right">${item.qty || 0}</td>
        <td style="padding:5px 8px;text-align:right">
          ₹${Number(item.price || item.rate || 0).toFixed(2)}
        </td>
        <td style="padding:5px 8px;text-align:right">${item.gst_percent || item.gst || 0}%</td>
        <td style="padding:5px 8px;text-align:right">
          ₹${amt.toFixed(2)}
        </td>
      </tr>`;
    }).join('');

    const billHtml = `
      <div style="font-family:Carlito,Calibri,Arial,sans-serif;font-size:13px;
        color:#000;padding:16mm;max-width:740px;margin:0 auto">
        <div style="display:flex;justify-content:space-between;
          align-items:flex-start;margin-bottom:16px">
          <div>
            ${(cachedSettings?.logo_url as string)
              ? `<img src="${cachedSettings?.logo_url}" 
                 style="max-height:60px;margin-bottom:8px;display:block;filter:grayscale(100%)"/>`
              : ''}
            <div style="font-size:18px;font-weight:bold">
              ${(cachedSettings?.shop_name as string) || ''}
            </div>
            <div style="color:#555;font-size:12px">
              ${(cachedSettings?.shop_address as string) || ''}
            </div>
            ${(cachedSettings?.gst_number as string)
              ? `<div style="color:#555;font-size:12px">
                 GSTIN: ${cachedSettings?.gst_number}</div>`
              : ''}
          </div>
          <div style="text-align:right">
            <div style="font-weight:bold;font-size:15px">
              ${bill.bill_number}
            </div>
            <div style="color:#555;font-size:12px">
              ${new Date(bill.created_at).toLocaleDateString('en-IN',{
                day:'2-digit',month:'short',year:'numeric'
              })}
            </div>
          </div>
        </div>
        <hr style="border:none;border-top:1.5px solid #ddd;margin:10px 0"/>
        <div style="margin-bottom:16px">
          <div style="font-weight:600;margin-bottom:2px">Bill To:</div>
          <div>${bill.customer_name}</div>
          <div style="color:#555;font-size:12px">${bill.customer_phone}</div>
        </div>
        ${bill.items && bill.items.length > 0 ? `
          <table style="width:100%;border-collapse:collapse;
            font-size:12px;margin-bottom:12px">
            <thead>
              <tr style="background:#f3f4f6">
                <th style="padding:6px 8px;text-align:left">#</th>
                <th style="padding:6px 8px;text-align:left">Item</th>
                <th style="padding:6px 8px;text-align:right">Qty</th>
                <th style="padding:6px 8px;text-align:right">Rate</th>
                <th style="padding:6px 8px;text-align:right">GST%</th>
                <th style="padding:6px 8px;text-align:right">Amount</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
          <div style="display:flex;justify-content:flex-end">
            <div style="width:220px;font-size:13px">
              <div style="display:flex;justify-content:space-between;
                padding:3px 0;border-top:1px solid #ddd">
                <span>Subtotal</span>
                <span>₹${Number(bill.subtotal||0).toFixed(2)}</span>
              </div>
              ${(bill.discount_amount && bill.discount_amount > 0) ? '<div style="display:flex;justify-content:space-between;padding:3px 0;color:#16a34a"><span>Discount' + (bill.discount_type === 'percent' ? ' (' + (bill.discount_value||0) + '%)' : '') + '</span><span>-₹' + Number(bill.discount_amount).toFixed(2) + '</span></div>' : ''}
              <div style="display:flex;justify-content:space-between;
                padding:3px 0">
                <span>GST</span>
                <span>₹${Number(bill.gst_amount||0).toFixed(2)}</span>
              </div>
              ${(bill.extra_charges && bill.extra_charges.length > 0) ? bill.extra_charges.filter(ec => ec.label && ec.amount > 0).map(ec => '<div style="display:flex;justify-content:space-between;padding:3px 0"><span>' + ec.label + '</span><span>₹' + Number(ec.amount).toFixed(2) + '</span></div>').join('') : ''}
              <div style="display:flex;justify-content:space-between;
                padding:6px 0;border-top:2px solid #333;
                font-weight:bold;font-size:15px">
                <span>Total</span>
                <span>₹${Number(bill.total||0).toFixed(2)}</span>
              </div>
            </div>
          </div>` : ''}
        <div style="text-align:center;color:#999;font-size:11px;
          margin-top:24px;padding-top:10px;border-top:1px solid #eee">
          Thank you for your business!
        </div>
      </div>`;

    const existing = document.getElementById('bill-print-root');
    if (existing) existing.remove();
    const styleExisting = document.getElementById('bill-print-style');
    if (styleExisting) styleExisting.remove();

    const container = document.createElement('div');
    container.id = 'bill-print-root';
    container.innerHTML = billHtml;
    document.body.appendChild(container);

    const styleTag = document.createElement('style');
    styleTag.id = 'bill-print-style';
    styleTag.innerHTML = `
      @media print {
        html, body { background: white !important; color: black !important; }
        body > *:not(#bill-print-root) {
          display:none !important;visibility:hidden !important;
        }
        #bill-print-root {
          display:block !important;visibility:visible !important;
          position:fixed !important;top:0 !important;left:0 !important;
          width:100% !important;background:white !important;
          z-index:999999 !important;
        }
        @page { margin:0; size:A4 portrait; }
      }`;
    document.head.appendChild(styleTag);

    setTimeout(() => {
      window.print();
      window.onafterprint = () => {
        document.getElementById('bill-print-root')?.remove();
        document.getElementById('bill-print-style')?.remove();
        window.onafterprint = null;
      };
      setTimeout(() => {
        document.getElementById('bill-print-root')?.remove();
        document.getElementById('bill-print-style')?.remove();
      }, 30000);
    }, 100);
  }

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
                      <TableCell className="text-right">
                        <div style={{display:'flex',gap:'6px',justifyContent:'flex-end'}}>
                          <button
                            type="button"
                            onClick={() => handleWhatsappFromHistory(b)}
                            title="Send WhatsApp"
                            style={{
                              background: '#25d366',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '6px 10px',
                              cursor: 'pointer',
                              fontSize: '16px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            📞
                          </button>
                          <button
                            type="button"
                            onClick={() => handleHistoryPrint(b)}
                            title="Print Bill"
                            style={{
                              background: '#f3f4f6',
                              border: '1px solid #d1d5db',
                              borderRadius: '8px',
                              padding: '6px 10px',
                              cursor: 'pointer',
                              fontSize: '16px',
                            }}
                          >
                            🖨️
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingBill(b);
                              setEditName(b.customer_name);
                              setEditPhone(b.customer_phone);
                            }}
                            title="Edit Bill"
                            style={{
                              background: '#f3f4f6',
                              border: '1px solid #d1d5db',
                              borderRadius: '8px',
                              padding: '6px 10px',
                              cursor: 'pointer',
                              fontSize: '13px',
                            }}
                          >
                            ✏️
                          </button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(b.id)}>
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {editingBill && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.4)',
          display:'flex', alignItems:'center', justifyContent:'center',
          zIndex:1000
        }}>
          <div style={{
            background:'white', borderRadius:'12px',
            padding:'28px', width:'360px',
            boxShadow:'0 10px 40px rgba(0,0,0,0.15)'
          }}>
            <h3 style={{marginBottom:16,fontSize:'16px',fontWeight:'600'}}>
              Edit Bill — {editingBill.bill_number}
            </h3>
            <label style={{fontSize:'13px',fontWeight:'500'}}>
              Customer Name
            </label>
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              style={{width:'100%',padding:'8px 10px',
                border:'1px solid #d1d5db',borderRadius:'8px',
                marginBottom:'12px',marginTop:'4px',
                fontSize:'14px',boxSizing:'border-box'}}
            />
            <label style={{fontSize:'13px',fontWeight:'500'}}>
              Phone Number
            </label>
            <input
              value={editPhone}
              onChange={e => setEditPhone(e.target.value)}
              style={{width:'100%',padding:'8px 10px',
                border:'1px solid #d1d5db',borderRadius:'8px',
                marginBottom:'20px',marginTop:'4px',
                fontSize:'14px',boxSizing:'border-box'}}
            />
            <div style={{display:'flex',gap:10}}>
              <button
                type="button"
                onClick={async () => {
                  await supabase.from('bills').update({
                    customer_name: editName,
                    customer_phone: editPhone.replace(/\D/g,'').slice(-10)
                  }).eq('id', editingBill.id);
                  setBills(prev => prev.map(b =>
                    b.id === editingBill.id
                      ? {...b, customer_name:editName,
                         customer_phone:editPhone.replace(/\D/g,'').slice(-10)}
                      : b
                  ));
                  setEditingBill(null);
                  toast.success('Bill updated successfully.');
                }}
                style={{flex:1,background:'#2563eb',color:'white',
                  border:'none',borderRadius:'8px',padding:'10px',
                  fontSize:'14px',cursor:'pointer',fontWeight:'500'}}
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditingBill(null)}
                style={{flex:1,background:'white',color:'#555',
                  border:'1px solid #d1d5db',borderRadius:'8px',
                  padding:'10px',fontSize:'14px',cursor:'pointer'}}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
