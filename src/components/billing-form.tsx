"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useTheme } from "next-themes";

import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { BillSize, ProductEntry, DiscountType, ExtraCharge } from "@/types/database";
import { useHardwareScanner } from "@/hooks/useHardwareScanner";

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
  whatsapp_automation_enabled?: boolean;
  whatsapp_api_token?: string;
  whatsapp_phone_number_id?: string;
}

interface LineItem {
  id: string;
  name: string;
  qty: number;
  price: number;
  gst_percent: number;
  barcode?: string;
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


// ── Component ─────────────────────────────────────────────────────
export function BillingForm({ clientId, editBillId }: { clientId?: string, editBillId?: string }) {
  const { theme, setTheme } = useTheme();

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

  // Hardware scanner
  const [manualBarcode, setManualBarcode] = useState('');

  // Discount & Extra Charges
  const [discountType, setDiscountType] = useState<DiscountType>('none');
  const [discountValue, setDiscountValue] = useState(0);
  const [extraCharges, setExtraCharges] = useState<ExtraCharge[]>([]);

  // Saving
  const [saving, setSaving] = useState<string | null>(null);
  const [savedBillId, setSavedBillId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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
      const supabase = createClient();
      const now = new Date();
      const date = now.toISOString().split('T')[0].replace(/-/g, '');
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      const timeSlot = hours + mins;
      const prefix = 'BILL-' + date + '-' + timeSlot + '-';

      const { count } = await supabase
        .from('bills')
        .select('*', { count: 'exact', head: true })
        .ilike('bill_number', prefix + '%');

      setBillNumber(prefix + String((count || 0) + 1).padStart(3, '0'));
    } catch {
      const now = new Date();
      const d = now.toISOString().split('T')[0].replace(/-/g, '');
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      setBillNumber('BILL-' + d + '-' + h + m + '-001');
    }
  }, []);

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

      // Load discount & extra charges
      setDiscountType(data.discount_type || 'none');
      setDiscountValue(data.discount_value || 0);
      if (data.extra_charges && Array.isArray(data.extra_charges)) {
        setExtraCharges(data.extra_charges);
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

  // ── Extra charge helpers ──────────────────────────────────────
  function addExtraCharge() {
    setExtraCharges(prev => [...prev, { label: '', amount: 0 }]);
  }

  function updateExtraCharge(index: number, field: keyof ExtraCharge, value: string | number) {
    setExtraCharges(prev => prev.map((ec, i) =>
      i === index ? { ...ec, [field]: value } : ec
    ));
  }

  function removeExtraCharge(index: number) {
    setExtraCharges(prev => prev.filter((_, i) => i !== index));
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

    // Discount (applied before GST)
    let computedDiscount = 0;
    if (discountType === 'percent' && discountValue > 0) {
      computedDiscount = Math.min((subtotal * discountValue) / 100, subtotal);
    } else if (discountType === 'fixed' && discountValue > 0) {
      computedDiscount = Math.min(discountValue, subtotal);
    }
    const afterDiscount = subtotal - computedDiscount;

    // GST on discounted subtotal (proportionally reduced)
    const ratio = subtotal > 0 ? afterDiscount / subtotal : 1;
    const slabs: GSTSlabBreakdown[] = [];
    let totalGST = 0;

    Array.from(slabMap.entries()).forEach(([slab, taxableAmount]) => {
      const adjusted = taxableAmount * ratio;
      const totalTax = (adjusted * slab) / 100;
      const half = totalTax / 2;
      slabs.push({
        slab,
        taxableAmount: adjusted,
        cgst: half,
        sgst: half,
        totalTax,
      });
      totalGST += totalTax;
    });

    slabs.sort((a, b) => a.slab - b.slab);

    // Extra charges (added after GST)
    const ecTotal = extraCharges.reduce((s, ec) => s + (ec.amount || 0), 0);

    return {
      subtotal,
      discountAmount: computedDiscount,
      afterDiscount,
      slabs,
      totalGST,
      extraChargesTotal: ecTotal,
      grandTotal: afterDiscount + totalGST + ecTotal,
    };
  }, [items, discountType, discountValue, extraCharges]);

  // ── Save bill (via server API to bypass RLS) ──────────────────
  async function handleSave(action: "send" | "print" | "save") {
    if (isSaving) return;
    if (savedBillId) {
      if (action === "print") {
        window.open(`/bill-preview/${savedBillId}`, "_blank");
      } else if (action === "send") {
        openWhatsapp();
      } else {
        toast.info('Bill already saved. Click "+ New Bill" to create a new one.');
      }
      return;
    }
    setIsSaving(true);
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
        discount_type: discountType,
        discount_value: discountValue,
        discount_amount: calculations.discountAmount,
        extra_charges: extraCharges.filter(ec => ec.label.trim() && ec.amount > 0),
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
      setIsSaving(false);
      setSaving(null);
    }
  }

  // ── Print specific flow ──────────────────────────────────────
  // ── Print specific flow ──────────────────────────────────────
  async function saveAndPrint() {
    if (isSaving) return;
    setIsSaving(true);
    if (!customerName.trim()) {
      alert('Enter customer name')
      setIsSaving(false);
      return
    }

    setSaving("print");

    try {
      const validItems = items.filter(i => i.name && i.qty && i.price)

      if (!savedBillId) {
        const printPayload = {
          client_id: shop?.id,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.replace(/\D/g, '').slice(-10),
          bill_number: billNumber,
          bill_date: billDate,
          items: validItems.map(i => ({ name: i.name.trim(), qty: i.qty, price: i.price, gst_percent: i.gst_percent })),
          subtotal: calculations.subtotal || 0,
          gst_amount: calculations.totalGST || 0,
          total: calculations.grandTotal || 0,
          discount_type: discountType,
          discount_value: discountValue,
          discount_amount: calculations.discountAmount,
          extra_charges: extraCharges.filter(ec => ec.label.trim() && ec.amount > 0),
          whatsapp_sent: false,
        };

        const saveRes = await fetch("/api/bills", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ billPayload: printPayload }),
        });
        const saveJson = await saveRes.json();

        if (!saveRes.ok) {
          alert('Save failed: ' + (saveJson.error || 'Unknown error'))
          setSaving(null)
          setIsSaving(false)
          return
        }

        const billId = saveJson.data?.[0]?.id || printPayload.bill_number;
        setSavedBillId(billId);
      }

      // Build bill HTML as a string — inject into print-area div
      const itemRows = validItems.map((item, i) => {
        const amt = Number(item.qty) * Number(item.price) *
          (1 + Number(item.gst_percent || 0) / 100)
        return `
          <tr style="background:${i % 2 === 0 ? '#fff' : '#fafafa'}">
            <td style="padding:5px 8px">${i + 1}</td>
            <td style="padding:5px 8px">${item.name}</td>
            <td style="padding:5px 8px;text-align:right">${item.qty}</td>
            <td style="padding:5px 8px;text-align:right">
              ₹${Number(item.price).toFixed(2)}
            </td>
            <td style="padding:5px 8px;text-align:right">
              ${item.gst_percent || 0}%
            </td>
            <td style="padding:5px 8px;text-align:right">
              ₹${amt.toFixed(2)}
            </td>
          </tr>`
      }).join('')

      const itemsSection = validItems.length > 0 ? `
        <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:12px">
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
            <div style="display:flex;justify-content:space-between;padding:3px 0;border-top:1px solid #ddd">
              <span>Subtotal</span>
              <span>₹${Number(calculations.subtotal || 0).toFixed(2)}</span>
            </div>
            ${calculations.discountAmount > 0 ? '<div style="display:flex;justify-content:space-between;padding:3px 0;color:#16a34a"><span>Discount' + (discountType === 'percent' ? ' (' + discountValue + '%)' : '') + '</span><span>-₹' + Number(calculations.discountAmount).toFixed(2) + '</span></div>' : ''}
            <div style="display:flex;justify-content:space-between;padding:3px 0">
              <span>GST</span>
              <span>₹${Number(calculations.totalGST || 0).toFixed(2)}</span>
            </div>
            ${extraCharges.filter(ec => ec.label && ec.amount > 0).map(ec => '<div style="display:flex;justify-content:space-between;padding:3px 0"><span>' + ec.label + '</span><span>₹' + Number(ec.amount).toFixed(2) + '</span></div>').join('')}
            <div style="display:flex;justify-content:space-between;padding:6px 0;border-top:2px solid #333;font-weight:bold;font-size:15px">
              <span>Total</span>
              <span>₹${Number(calculations.grandTotal || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>` : ''

      const billHtml = `
        <div style="font-family:Arial,sans-serif;font-size:13px;color:#000;padding:16mm;max-width:740px;margin:0 auto">
          
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
            <div>
              ${shop?.logo_url
                ? `<img src="${shop.logo_url}" style="max-height:60px;margin-bottom:8px;display:block;filter:grayscale(100%)" />`
                : ''}
              <div style="font-size:18px;font-weight:bold">
                ${shop?.shop_name || ''}
              </div>
              <div style="color:#555;font-size:12px">
                ${shop?.shop_address || ''}
              </div>
              ${shop?.gst_number
                ? `<div style="color:#555;font-size:12px">
                    GSTIN: ${shop.gst_number}
                   </div>`
                : ''}
            </div>
            <div style="text-align:right">
              <div style="font-weight:bold;font-size:15px">${billNumber}</div>
              <div style="color:#555;font-size:12px">
                ${new Date(billDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>

          <hr style="border:none;border-top:1.5px solid #ddd;margin:10px 0" />

          <div style="margin-bottom:16px">
            <div style="font-weight:600;margin-bottom:2px">Bill To:</div>
            <div>${customerName.trim()}</div>
            <div style="color:#555;font-size:12px">
              ${customerPhone.replace(/\D/g, '').slice(-10)}
            </div>
          </div>

          ${itemsSection}

          <div style="text-align:center;color:#999;font-size:11px;margin-top:24px;padding-top:10px;border-top:1px solid #eee">
            Thank you for your business!
          </div>
        </div>
      `

      // Remove any previous print container if exists
      const existing = document.getElementById('bill-print-root')
      if (existing) existing.remove()

      // Create container appended directly to body
      // This sits OUTSIDE Next.js root div
      const container = document.createElement('div')
      container.id = 'bill-print-root'
      container.innerHTML = billHtml
      document.body.appendChild(container)

      // Add a style tag that hides everything except our container
      const styleTag = document.createElement('style')
      styleTag.id = 'bill-print-style'
      styleTag.innerHTML = `
        @media print {
          html, body { background: white !important; color: black !important; }
          body > *:not(#bill-print-root) {
            display: none !important;
            visibility: hidden !important;
          }
          #bill-print-root {
            display: block !important;
            visibility: visible !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            background: white !important;
            z-index: 999999 !important;
          }
          @page { margin: 0; size: A4 portrait; }
        }
      `
      document.head.appendChild(styleTag)

      // Small delay to let DOM update before print dialog
      setTimeout(() => {
        window.print()

        // Cleanup after print dialog closes
        window.onafterprint = () => {
          const c = document.getElementById('bill-print-root')
          const s = document.getElementById('bill-print-style')
          if (c) c.remove()
          if (s) s.remove()
          window.onafterprint = null
        }
      }, 100)
    } catch (err) {
      console.error(err);
      toast.error("Failed to save and print.");
    } finally {
      setIsSaving(false);
      setSaving(null);
    }
  }

  // ── Standalone WhatsApp Flow ──────────────────────────────────
  function openWhatsapp() {
    const raw = customerPhone.replace(/\D/g, '')
    const ten = raw.slice(-10)

    if (ten.length !== 10) {
      alert('Phone number must be 10 digits. Got: ' + ten)
      return
    }

    const template = shop?.whatsapp_message_template ||
      'Dear {customer_name}, thank you for visiting!'

    const msg = template
      .replace(/\{customer_name\}/gi, customerName.trim() || 'Customer')
      .replace(/\{shop_name\}/gi, shop?.shop_name || '')

    const waUrl = 'https://wa.me/91' + ten + '?text=' + encodeURIComponent(msg)

    const a = document.createElement('a')
    a.href = waUrl
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // ── Keyboard Shortcuts ────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      
      switch(e.key.toLowerCase()) {
        case 'n':
          e.preventDefault();
          handleNewBill();
          break;
        case 'c':
          e.preventDefault();
          handleClearBill();
          break;
        case 'p':
          e.preventDefault();
          saveAndPrint();
          break;
        case 's':
          e.preventDefault();
          handleSave("save");
          break;
        case 'w':
          e.preventDefault();
          openWhatsapp();
          break;
        case 't':
          e.preventDefault();
          setTheme(theme === 'dark' ? 'light' : 'dark');
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, setTheme]);

  // ── Hardware Scanner ──────────────────────────────────────────
  async function handleHardwareScan(barcodeValue: string) {
    if (!shop?.id) return;

    const supabase = createClient();

    // Look up product in Supabase
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('barcode_value', barcodeValue)
      .eq('client_id', shop.id)
      .single();

    if (error || !product) {
      toast.error(`❌ Unknown barcode: ${barcodeValue}`);
      return;
    }

    // Add to items — increment qty if already in list
    setItems(prev => {
      const existingIndex = prev.findIndex(
        i => i.barcode === barcodeValue
      );
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          qty: (Number(updated[existingIndex].qty) || 1) + 1,
        };
        return updated;
      }
      return [
        ...prev.filter(i => i.name),
        {
          id: generateItemId(),
          name: product.name,
          qty: 1,
          price: product.price,
          gst_percent: product.gst_percent || 0,
          barcode: barcodeValue,
        },
      ];
    });

    toast.success(`✅ ${product.name} — ₹${product.price}`);
  }

  // Wire the hardware scanner hook
  useHardwareScanner({
    onScan: handleHardwareScan,
    enabled: hardwareScannerEnabled,
    minLength: 4,
    maxGap: 50,
  });

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

  function handleNewBill() {
    setCustomerName('');
    setCustomerPhone('');
    setPhoneError('');
    setItems([createEmptyItem(shop?.default_gst)]);
    setDiscountType('none');
    setDiscountValue(0);
    setExtraCharges([]);
    setSavedBillId(null);
    setIsSaving(false);
    setSaving(null);
    generateBillNumber();
  }

  function handleClearBill() {
    setCustomerName('');
    setCustomerPhone('');
    setPhoneError('');
    setItems([createEmptyItem(shop?.default_gst)]);
    setDiscountType('none');
    setDiscountValue(0);
    setExtraCharges([]);
    setSavedBillId(null);
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Top action removed */}

      {/* Shop Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-end">
            <Button onClick={handleNewBill} variant="default" title="New Bill (Alt + N)">
              + New Bill
            </Button>
          </div>
        </CardHeader>
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

      {/* Manual Barcode Input */}
      <div style={{display:'flex', gap:8, marginBottom:14}}>
        <input
          data-scanner-input="true"
          type="text"
          placeholder="Or type / scan barcode here..."
          value={manualBarcode}
          onChange={e => setManualBarcode(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && manualBarcode.trim()) {
              handleHardwareScan(manualBarcode.trim());
              setManualBarcode('');
            }
          }}
          style={{
            flex: 1, padding: '8px 12px',
            border: '1px solid #d1d5db', borderRadius: 8,
            fontSize: 13, outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={() => {
            if (manualBarcode.trim()) {
              handleHardwareScan(manualBarcode.trim());
              setManualBarcode('');
            }
          }}
          style={{
            background: '#2563eb', color: 'white',
            border: 'none', borderRadius: 8,
            padding: '8px 14px', fontSize: 13,
            cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          Add Item
        </button>
      </div>

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
              {customerPhone && (
                <p className="text-xs text-gray-400 mt-1">
                  Will open: wa.me/91{customerPhone.replace(/\D/g, '').slice(-10)}
                </p>
              )}
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

            {/* Discount */}
            <div className="rounded-md bg-muted/30 p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Discount</Label>
                <Select value={discountType} onValueChange={(v) => { setDiscountType(v as DiscountType); if (v === 'none') setDiscountValue(0); }}>
                  <SelectTrigger className="h-8 w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Discount</SelectItem>
                    <SelectItem value="percent">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                  </SelectContent>
                </Select>
                {discountType !== 'none' && (
                  <Input
                    type="number"
                    min={0}
                    max={discountType === 'percent' ? 100 : undefined}
                    step={discountType === 'percent' ? 1 : 0.01}
                    value={discountValue || ''}
                    onChange={(e) => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="h-8 w-[100px] text-right font-mono"
                    placeholder={discountType === 'percent' ? '10' : '100'}
                  />
                )}
              </div>
              {calculations.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                  <span>Discount {discountType === 'percent' ? `(${discountValue}%)` : ''}</span>
                  <span className="font-mono">-{formatCurrency(calculations.discountAmount)}</span>
                </div>
              )}
            </div>

            <Separator />

            {/* GST Breakdown */}
            {calculations.slabs.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  GST Breakdown {calculations.discountAmount > 0 && '(on discounted amount)'}
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

            {/* Extra Charges */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Extra Charges
                </p>
                <Button type="button" variant="ghost" size="sm" onClick={addExtraCharge} className="h-7 text-xs">
                  + Add Charge
                </Button>
              </div>
              {extraCharges.map((ec, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder="e.g. Delivery, Packaging"
                    value={ec.label}
                    onChange={(e) => updateExtraCharge(idx, 'label', e.target.value)}
                    className="h-8 text-sm flex-1"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">₹</span>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="0"
                      value={ec.amount || ''}
                      onChange={(e) => updateExtraCharge(idx, 'amount', Math.max(0, parseFloat(e.target.value) || 0))}
                      className="h-8 w-[90px] text-right font-mono"
                    />
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeExtraCharge(idx)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </Button>
                </div>
              ))}
              {calculations.extraChargesTotal > 0 && (
                <div className="flex justify-between text-sm pt-1">
                  <span className="text-muted-foreground">Total Extra Charges</span>
                  <span className="font-mono">{formatCurrency(calculations.extraChargesTotal)}</span>
                </div>
              )}
            </div>

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
            <Button type="button" variant="outline" onClick={handleClearBill} title="Clear Bill (Alt + C)">
              Clear Bill
            </Button>
        <button
          type="button"
          onClick={openWhatsapp}
          title="Send WhatsApp (Alt + W)"
          style={{
            background: '#25d366', color: 'white',
            border: 'none', borderRadius: '8px',
            padding: '10px 20px', fontSize: '14px',
            cursor: 'pointer', fontWeight: '500'
          }}
        >
          📱 Send WhatsApp
        </button>

        <Button
          type="button"
          variant="outline"
          onClick={saveAndPrint}
          disabled={saving !== null}
          size="lg"
          title="Save & Print (Alt + P)"
        >
          {saving === "print" ? <Spinner /> : null}
          🖨️ Save & Print
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => handleSave("save")}
          disabled={saving !== null}
          size="lg"
          title="Save Only (Alt + S)"
        >
          {saving === "save" ? <Spinner /> : null}
          💾 Save Only
        </Button>
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
