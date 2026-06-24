"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { BillSize, ProductEntry } from "@/types/database";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ── Types ─────────────────────────────────────────────────────────
interface ShopInfo {
  id: string;
  shop_name: string;
  shop_address: string;
  gst_number: string;
  logo_url: string | null;
  bill_size: BillSize;
  whatsapp_message_template: string;
  owner_phone: string;
  whatsapp_enabled: boolean;
  products?: ProductEntry[];
  default_gst?: number;
}

interface LineItem {
  id: string;
  name: string;
  qty: number;
  price: number;
  gst_percent: number;
}

interface GSTSlabBreakdown {
  slab: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  totalTax: number;
}

const GST_OPTIONS = [0, 5, 12, 18, 28];

function generateItemId() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function createEmptyItem(defaultGst = 0): LineItem {
  return {
    id: generateItemId(),
    name: "",
    qty: 1,
    price: 0,
    gst_percent: defaultGst,
  };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}

function getTodayString(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

// ── Component ─────────────────────────────────────────────────────
export function BillingForm({ clientId, editBillId }: { clientId?: string, editBillId?: string }) {

  // Shop info
  const [shop, setShop] = useState<ShopInfo | null>(null);
  const [loadingShop, setLoadingShop] = useState(true);

  // Bill metadata
  const [billNumber, setBillNumber] = useState("");
  const [billDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split("T")[0];
  });

  // Customer
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");

  // Items
  const [items, setItems] = useState<LineItem[]>([createEmptyItem()]);

  // Saving
  const [saving, setSaving] = useState<string | null>(null);
  const [savedBillId, setSavedBillId] = useState<string | null>(null);

  // ── Load shop settings (via server API to bypass RLS) ──────────
  const loadShop = useCallback(async () => {
    try {
      // We need user ID to find the client. Get it from auth, then call our API.
      const params = new URLSearchParams({ action: "shop" });
      if (clientId) params.set("clientId", clientId);

      const res = await fetch(`/api/bills?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load shop");

      const json = await res.json();
      if (json.data) {
        const shopData = json.data as ShopInfo;
        setShop(shopData);
        setItems(prev => prev.map(item => ({
          ...item,
          gst_percent: item.gst_percent === 0 ? (shopData.default_gst || 0) : item.gst_percent
        })));
      }
    } catch (err) {
      console.error("Failed to load shop info:", err);
    } finally {
      setLoadingShop(false);
    }
  }, [clientId]);

  // ── Generate bill number (via server API) ──────────────────────
  const generateBillNumber = useCallback(async () => {
    try {
      const today = getTodayString();
      const dateForQuery = `${today.slice(0, 4)}-${today.slice(4, 6)}-${today.slice(6, 8)}`;

      const params = new URLSearchParams({ action: "count", billDate: dateForQuery });
      if (clientId) params.set("clientId", clientId);

      const res = await fetch(`/api/bills?${params.toString()}`);
      const json = await res.json();

      const seq = ((json.count ?? 0) + 1).toString().padStart(3, "0");
      setBillNumber(`BILL-${today}-${seq}`);
    } catch {
      setBillNumber(`BILL-${getTodayString()}-001`);
    }
  }, [clientId]);

  useEffect(() => {
    loadShop();
    if (!editBillId) {
      generateBillNumber();
    }
  }, [loadShop, generateBillNumber, editBillId]);

  // ── Load bill for editing (via server API) ─────────────────────
  useEffect(() => {
    if (!editBillId) return;
    
    async function fetchBill() {
      const params = new URLSearchParams({ action: "bill", billId: editBillId! });
      if (clientId) params.set("clientId", clientId);
      
      const res = await fetch(`/api/bills?${params.toString()}`);
      const json = await res.json();
      
      if (!res.ok || !json.data) {
        toast.error("Failed to load bill for editing.");
        return;
      }
      
      const data = json.data;
      setCustomerName(data.customer_name || "");
      setCustomerPhone(data.customer_phone || "");
      setBillNumber(data.bill_number);
      
      if (data.items && Array.isArray(data.items) && data.items.length > 0) {
         const loadedItems = data.items.map((item: Record<string, unknown>) => ({
           id: (item.id as string) || generateItemId(),
           name: (item.name as string) || "",
           qty: (item.qty as number) || 1,
           price: (item.price as number) || 0,
           gst_percent: (item.gst_percent as number) || 0
         }));
         setItems(loadedItems);
      }
    }
    fetchBill();
  }, [editBillId, clientId]);

  // ── Phone validation ──────────────────────────────────────────
  function handlePhoneChange(value: string) {
    // Allow only digits
    const digits = value.replace(/\D/g, "").slice(0, 10);
    setCustomerPhone(digits);

    if (digits.length > 0 && digits.length < 10) {
      setPhoneError("Phone number must be 10 digits");
    } else {
      setPhoneError("");
    }
  }

  // ── Item handlers ─────────────────────────────────────────────
  function updateItem<K extends keyof LineItem>(
    itemId: string,
    field: K,
    value: LineItem[K]
  ) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    );
  }

  function addItem() {
    setItems((prev) => [...prev, createEmptyItem()]);
  }

  function removeItem(itemId: string) {
    setItems((prev) => {
      if (prev.length <= 1) {
        toast.error("At least one item is required.");
        return prev;
      }
      return prev.filter((i) => i.id !== itemId);
    });
  }

  // ── Calculations ──────────────────────────────────────────────
  const calculations = useMemo(() => {
    let subtotal = 0;
    const slabMap = new Map<number, number>();

    for (const item of items) {
      const lineTotal = item.qty * item.price;
      subtotal += lineTotal;

      if (item.gst_percent > 0 && lineTotal > 0) {
        slabMap.set(
          item.gst_percent,
          (slabMap.get(item.gst_percent) ?? 0) + lineTotal
        );
      }
    }

    const slabs: GSTSlabBreakdown[] = [];
    let totalGST = 0;

    Array.from(slabMap.entries()).forEach(([slab, taxableAmount]) => {
      const totalTax = (taxableAmount * slab) / 100;
      const half = totalTax / 2;
      slabs.push({
        slab,
        taxableAmount,
        cgst: half,
        sgst: half,
        totalTax,
      });
      totalGST += totalTax;
    });

    slabs.sort((a, b) => a.slab - b.slab);

    return {
      subtotal,
      slabs,
      totalGST,
      grandTotal: subtotal + totalGST,
    };
  }, [items]);

  // ── Save bill (via server API to bypass RLS) ──────────────────
  async function handleSave(action: "send" | "print" | "save") {
    if (!shop) {
      toast.error("Business settings not loaded. Configure your business in Settings first.");
      return;
    }

    if (action === "send" && customerPhone.length !== 10) {
      toast.error("Please enter a valid 10-digit phone number to send WhatsApp.");
      return;
    }

    const validItems = items.filter((i) => i.name.trim() && i.qty > 0 && i.price > 0);

    setSaving(action);

    try {
      const billPayload = {
        client_id: shop.id,
        customer_name: customerName.trim(),
        customer_phone: customerPhone,
        bill_number: billNumber,
        bill_date: billDate,
        items: validItems.map((i) => ({
          name: i.name.trim(),
          qty: i.qty,
          price: i.price,
          gst_percent: i.gst_percent,
        })),
        subtotal: calculations.subtotal,
        gst_amount: calculations.totalGST,
        total: calculations.grandTotal,
        whatsapp_sent: action === "send",
        whatsapp_sent_at: (action === "send") && shop.whatsapp_enabled ? new Date().toISOString() : null,
      };

      // To bypass browser popup blockers, we must open the new tab synchronously before the async fetch
      let newWindow: Window | null = null;
      if (action === "print" || action === "send") {
        newWindow = window.open("", "_blank");
      }

      // Use server API route (bypasses RLS with admin key)
      const saveRes = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billPayload, editBillId: savedBillId || editBillId }),
      });

      const saveJson = await saveRes.json();

      if (!saveRes.ok) {
        if (newWindow) newWindow.close();
        throw new Error(saveJson.error || "Failed to save bill");
      }

      const billId = saveJson.data?.[0]?.id || billPayload.bill_number;
      setSavedBillId(billId);

      if (action === "print") {
        let opened = false;
        if (newWindow) {
          try {
            newWindow.location.href = `/bill-preview/${billId}`;
            opened = true;
          } catch (e) {
            console.error("Popup blocked", e);
          }
        }
        
        if (!opened) {
          const fallback = window.open(`/bill-preview/${billId}`, "_blank");
          if (fallback) opened = true;
        }

        if (opened) {
          toast.success("Bill saved! Opening print preview...");
        } else {
          toast.success("Bill saved! (Popup blocked)", {
            action: {
              label: "Open Print",
              onClick: () => window.open(`/bill-preview/${billId}`, "_blank")
            }
          });
        }
      }

      if (action === "send") {
        const message = shop.whatsapp_message_template
          ? shop.whatsapp_message_template.replace(/\{customer_name\}/g, customerName.trim())
          : `Dear ${customerName.trim()}, thank you for your purchase!`;

        if (shop.whatsapp_enabled) {
          toast("Sending WhatsApp message...");
          try {
            const waRes = await fetch("/api/send-whatsapp", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                phone: customerPhone,
                message,
                billId,
                clientId: shop.id
              }),
            });
            if (!waRes.ok) throw new Error("API failed");
            if (newWindow) newWindow.close();
            toast.success("WhatsApp sent automatically!");
          } catch {
            // Automation failed, fall back to manual
            const waUrl = `https://wa.me/91${customerPhone}?text=${encodeURIComponent(message)}`;
            let opened = false;
            if (newWindow) {
              try {
                newWindow.location.href = waUrl;
                opened = true;
              } catch {
                // Ignore cross-origin or popup errors
              }
            }
            if (!opened) {
              const fallback = window.open(waUrl, "_blank");
              if (fallback) opened = true;
            }
            if (opened) {
              toast.success("Bill saved! WhatsApp opened in new tab.");
            } else {
              toast.success("Bill saved! (Popup blocked)", {
                action: {
                  label: "Open WhatsApp",
                  onClick: () => window.open(waUrl, "_blank")
                }
              });
            }
          }
        } else {
          // Manual mode: open wa.me
          const waUrl = `https://wa.me/91${customerPhone}?text=${encodeURIComponent(message)}`;
          let opened = false;
          if (newWindow) {
            try {
              newWindow.location.href = waUrl;
              opened = true;
            } catch {
              // Ignore cross-origin or popup errors
            }
          }
          if (!opened) {
            const fallback = window.open(waUrl, "_blank");
            if (fallback) opened = true;
          }
          if (opened) {
            toast.success("Bill saved! WhatsApp opened in new tab.");
          } else {
            toast.success("Bill saved! (Popup blocked)", {
              action: {
                label: "Open WhatsApp",
                onClick: () => window.open(waUrl, "_blank")
              }
            });
          }
        }
      }
      
      if (action === "save") {
        toast.success("Bill saved successfully!");
      }
    } catch (err: unknown) {
      console.error("Save failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Please try again.";
      toast.error(`Failed to save bill: ${errorMessage}`);
    } finally {
      setSaving(null);
    }
  }

  // ── Print specific flow ─────────────────────────────────────────
  async function saveBillAndPrint() {
    if (!shop) {
      toast.error("Business settings not loaded. Configure your business in Settings first.");
      return;
    }
    if (!customerName.trim()) {
      toast.error("Customer name is required.");
      return;
    }
    const validItems = items.filter((i) => i.name.trim() && i.qty > 0 && i.price > 0);
    if (validItems.length === 0) {
      toast.error("Please add at least one valid item.");
      return;
    }

    setSaving("print");

    try {
      // Step 2: Calculate totals
      const subtotal = calculations.subtotal;
      const gst_amount = calculations.totalGST;
      const total = calculations.grandTotal;

      // Step 3: Generate unique bill number just-in-time
      const today = getTodayString();
      const dateForQuery = `${today.slice(0, 4)}-${today.slice(4, 6)}-${today.slice(6, 8)}`;
      let newBillNumber = billNumber; // Fallback

      const params = new URLSearchParams({ action: "count", billDate: dateForQuery });
      if (clientId) params.set("clientId", clientId);
      const countRes = await fetch(`/api/bills?${params.toString()}`);
      if (countRes.ok) {
        const json = await countRes.json();
        const seq = ((json.count ?? 0) + 1).toString().padStart(3, "0");
        newBillNumber = `BILL-${today}-${seq}`;
      }

      // Step 4: Save to Supabase
      const billPayload = {
        client_id: shop.id,
        customer_name: customerName.trim(),
        customer_phone: customerPhone,
        bill_number: newBillNumber,
        bill_date: billDate,
        items: validItems.map((i) => ({
          name: i.name.trim(),
          qty: i.qty,
          price: i.price,
          gst_percent: i.gst_percent,
        })),
        subtotal,
        gst_amount,
        total,
        whatsapp_sent: false,
        whatsapp_sent_at: null,
      };

      const saveRes = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billPayload }), // Do not use editBillId to guarantee a new row
      });

      const saveJson = await saveRes.json();
      if (!saveRes.ok) {
        toast.error("Failed to save bill. Try again.");
        return;
      }

      const newBillId = saveJson.data?.[0]?.id || newBillNumber;

      // Step 5: Open preview in new tab
      const url = `/bill-preview/${newBillId}`;
      let opened = false;
      try {
        const popup = window.open(url, "_blank");
        if (popup) opened = true;
      } catch {
        // Ignore errors
      }

      if (opened) {
        toast.success("Bill saved! Opening preview...");
      } else {
        toast.success("Bill saved! (Popup blocked)", {
          action: { label: "Open Print", onClick: () => window.open(url, "_blank") }
        });
      }

      // Step 6: Reset form
      setCustomerName("");
      setCustomerPhone("");
      setItems([createEmptyItem(shop.default_gst || 0)]);
      setSavedBillId(null);
      generateBillNumber();

    } catch (err) {
      console.error("Print failed:", err);
      toast.error("Failed to save bill. Try again.");
    } finally {
      setSaving(null);
    }
  }

  // ── Reset form helper ─────────────────────────────────────────
  function resetForm() {
    setCustomerName("");
    setCustomerPhone("");
    setItems([createEmptyItem(shop?.default_gst || 0)]);
    setSavedBillId(null);
    generateBillNumber();
  }

  // ── Loading state ─────────────────────────────────────────────
  if (loadingShop) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-muted-foreground">
            <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex justify-start">
        <Button
          variant="outline"
          onClick={resetForm}
          disabled={saving !== null}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
          Clear / New Bill
        </Button>
      </div>

      {/* Shop Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">
                {shop?.shop_name || (
                  <span className="text-muted-foreground italic">
                    Business not configured —{" "}
                    <a href="/settings" className="text-primary underline">
                      Go to Settings
                    </a>
                  </span>
                )}
              </h2>
              {shop?.gst_number && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  GSTIN: <span className="font-mono">{shop.gst_number}</span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Bill Number</p>
                <p className="font-mono text-sm font-semibold">{billNumber}</p>
              </div>
              <Separator orientation="vertical" className="h-10" />
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="text-sm font-medium">
                  {new Date(billDate).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customer Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">
                Customer Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="customerName"
                placeholder="Enter customer name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerPhone">
                Phone Number <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                  +91
                </div>
                <Input
                  id="customerPhone"
                  placeholder="9876543210"
                  value={customerPhone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className="font-mono"
                  maxLength={10}
                />
              </div>
              {phoneError && (
                <p className="text-xs text-destructive">{phoneError}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Items</CardTitle>
            <CardDescription>
              Add items to the bill. Amount is auto-calculated.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={addItem}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-1.5"
            >
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
            Add Item
          </Button>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">#</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead className="w-[100px] text-right">Qty</TableHead>
                  <TableHead className="w-[130px] text-right">Price (₹)</TableHead>
                  <TableHead className="w-[120px] text-center">GST %</TableHead>
                  <TableHead className="w-[140px] text-right">Amount (₹)</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, idx) => {
                  const lineAmount = item.qty * item.price;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="text-muted-foreground text-center">
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Item name"
                          list={`products-list-${item.id}`}
                          value={item.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateItem(item.id, "name", val);
                            if (shop?.products) {
                              const prod = shop.products.find(p => p.name === val);
                              if (prod) {
                                updateItem(item.id, "price", prod.price);
                                if (prod.gst_percent !== undefined) {
                                  updateItem(item.id, "gst_percent", prod.gst_percent);
                                }
                              }
                            }
                          }}
                          className="h-9"
                        />
                        <datalist id={`products-list-${item.id}`}>
                          {shop?.products?.map((p, idx) => (
                            <option key={idx} value={p.name} />
                          ))}
                        </datalist>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          placeholder="1"
                          value={item.qty || ""}
                          onChange={(e) =>
                            updateItem(
                              item.id,
                              "qty",
                              Math.max(0, parseInt(e.target.value) || 0)
                            )
                          }
                          className="h-9 text-right"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          placeholder="0.00"
                          value={item.price || ""}
                          onChange={(e) =>
                            updateItem(
                              item.id,
                              "price",
                              Math.max(0, parseFloat(e.target.value) || 0)
                            )
                          }
                          className="h-9 text-right font-mono"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.gst_percent.toString()}
                          onValueChange={(v) =>
                            updateItem(item.id, "gst_percent", parseInt(v))
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {GST_OPTIONS.map((g) => (
                              <SelectItem key={g} value={g.toString()}>
                                {g}%
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {formatCurrency(lineAmount)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeItem(item.id)}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          </svg>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {items.map((item, idx) => {
              const lineAmount = item.qty * item.price;
              return (
                <div
                  key={item.id}
                  className="rounded-lg border p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Item #{idx + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(item.id)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    </Button>
                  </div>
                  <Input
                    placeholder="Item name"
                    value={item.name}
                    onChange={(e) => updateItem(item.id, "name", e.target.value)}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Qty</Label>
                      <Input
                        type="number"
                        min={1}
                        value={item.qty || ""}
                        onChange={(e) =>
                          updateItem(item.id, "qty", Math.max(0, parseInt(e.target.value) || 0))
                        }
                        className="text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Price (₹)</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.price || ""}
                        onChange={(e) =>
                          updateItem(item.id, "price", Math.max(0, parseFloat(e.target.value) || 0))
                        }
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">GST %</Label>
                      <Select
                        value={item.gst_percent.toString()}
                        onValueChange={(v) => updateItem(item.id, "gst_percent", parseInt(v))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {GST_OPTIONS.map((g) => (
                            <SelectItem key={g} value={g.toString()}>{g}%</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="text-right font-mono font-semibold text-sm">
                    Amount: {formatCurrency(lineAmount)}
                  </div>
                </div>
              );
            })}
            <Button variant="outline" className="w-full" onClick={addItem}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
              Add Item
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bill Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Subtotal */}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-mono">{formatCurrency(calculations.subtotal)}</span>
            </div>

            <Separator />

            {/* GST Breakdown */}
            {calculations.slabs.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  GST Breakdown
                </p>
                {calculations.slabs.map((slab) => (
                  <div key={slab.slab} className="rounded-md bg-muted/50 p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="font-mono">
                        GST {slab.slab}%
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        on {formatCurrency(slab.taxableAmount)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">CGST ({slab.slab / 2}%)</span>
                        <span className="font-mono">{formatCurrency(slab.cgst)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">SGST ({slab.slab / 2}%)</span>
                        <span className="font-mono">{formatCurrency(slab.sgst)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between text-sm pt-1">
                  <span className="text-muted-foreground">Total GST</span>
                  <span className="font-mono">{formatCurrency(calculations.totalGST)}</span>
                </div>
              </div>
            ) : (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">GST</span>
                <span className="font-mono text-muted-foreground">₹0.00</span>
              </div>
            )}

            <Separator />

            {/* Grand Total */}
            <div className="flex justify-between items-center pt-1">
              <span className="text-lg font-semibold">Grand Total</span>
              <span className="text-2xl font-bold font-mono">
                {formatCurrency(calculations.grandTotal)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-end gap-3 pb-6">
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
        <Button
          variant="secondary"
          onClick={() => handleSave("send")}
          disabled={saving !== null}
          size="lg"
          className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600"
        >
          {saving === "send" ? <Spinner /> : null}
          Send
        </Button>

        <Button
          variant="outline"
          onClick={() => handleSave("print")}
          disabled={saving !== null}
          size="lg"
        >
          {saving === "print" ? <Spinner /> : null}
          Print
        </Button>

        <Button
          variant="outline"
          onClick={() => handleSave("save")}
          disabled={saving !== null}
          size="lg"
        >
          {saving === "save" ? <Spinner /> : null}
          Save only
        </Button>
        </div>
      </div>
    </div>
  );
}

// ── Spinner helper ──────────────────────────────────────────────
function Spinner() {
  return (
    <svg className="mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
