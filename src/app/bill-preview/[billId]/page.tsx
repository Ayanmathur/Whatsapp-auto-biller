"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams } from "next/navigation";
import type { BillSize } from "@/types/database";

// Define local types matching the database schema we need
interface ShopData {
  shop_name: string;
  shop_address: string;
  gst_number: string;
  logo_url: string | null;
  bill_size: BillSize;
}

interface ItemData {
  name: string;
  qty: number;
  price: number;
  gst_percent: number;
}

interface BillData {
  id: string;
  bill_number: string;
  bill_date: string;
  customer_name: string;
  customer_phone: string;
  items: ItemData[];
  subtotal: number;
  gst_amount: number;
  total: number;
  clients: ShopData;
}

export default function BillPreviewPage() {
  const params = useParams();
  const billId = params?.billId as string;
  const [bill, setBill] = useState<BillData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const supabase = createClient();

  useEffect(() => {
    if (!billId) return;

    async function fetchBill() {
      try {
        const { data, error } = await supabase
          .from("bills")
          .select("*, clients(*)")
          .eq("id", billId)
          .single();

        if (error) {
          throw error;
        }

        if (data) {
          // Normalize items just in case
          const rawItems = Array.isArray(data.items) ? data.items : [];
          const normalizedItems = rawItems.map((item: Record<string, unknown>) => ({
            name: String(item.name || ""),
            qty: Number(item.qty) || 0,
            price: Number(item.price) || 0,
            gst_percent: Number(item.gst_percent) || 0,
          }));

          setBill({
            ...data,
            items: normalizedItems,
          } as BillData);
        } else {
          setError("Bill not found.");
        }
      } catch (err) {
        console.error("Error fetching bill:", err);
        setError("Bill not found.");
      } finally {
        setLoading(false);
      }
    }

    fetchBill();
  }, [billId, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-gray-500 font-medium">Loading bill data...</p>
        </div>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-sm border border-gray-200">
          <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-bold text-gray-800">Bill not found</h2>
          <p className="text-gray-500 mt-2">The requested bill ID does not exist or you don&apos;t have access.</p>
        </div>
      </div>
    );
  }

  const shop = bill.clients;
  const isThermal = shop.bill_size === "thermal_80mm" || shop.bill_size === "thermal_58mm";

  // Calculate GST summary
  const gstSummaryMap = new Map<number, { taxableAmount: number; taxAmount: number }>();
  bill.items.forEach((item) => {
    if (item.gst_percent > 0) {
      const lineAmount = item.qty * item.price;
      const taxAmount = (lineAmount * item.gst_percent) / 100;
      
      const existing = gstSummaryMap.get(item.gst_percent) || { taxableAmount: 0, taxAmount: 0 };
      existing.taxableAmount += lineAmount;
      existing.taxAmount += taxAmount;
      gstSummaryMap.set(item.gst_percent, existing);
    }
  });

  const gstSlabs = Array.from(gstSummaryMap.entries())
    .map(([rate, data]) => ({ rate, ...data }))
    .sort((a, b) => a.rate - b.rate);

  // Formatting helpers
  const formatCurrency = (amt: number) => `₹${amt.toFixed(2)}`;
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --bg-color: #f3f4f6;
        }
        body {
          background-color: var(--bg-color);
          margin: 0;
          padding: 2rem;
          font-family: system-ui, -apple-system, sans-serif;
          color: #111827;
        }

        .print-btn {
          position: fixed;
          top: 1.5rem;
          right: 1.5rem;
          background-color: #2563eb;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          z-index: 50;
        }
        .print-btn:hover {
          background-color: #1d4ed8;
        }

        .bill-container {
          background: white;
          margin: 0 auto;
          box-sizing: border-box;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          overflow: hidden;
        }

        .bill-container[data-size="A4"] {
          width: 210mm;
          min-height: 297mm;
          padding: 20mm;
        }
        .bill-container[data-size="A5"] {
          width: 148mm;
          min-height: 210mm;
          padding: 15mm;
        }
        .bill-container[data-size="thermal_80mm"] {
          width: 80mm;
          padding: 5mm;
          font-size: 11px;
        }
        .bill-container[data-size="thermal_58mm"] {
          width: 58mm;
          padding: 3mm;
          font-size: 10px;
        }

        /* Standard sizing classes */
        .text-xs { font-size: 0.75rem; line-height: 1rem; }
        .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
        .text-base { font-size: 1rem; line-height: 1.5rem; }
        .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
        .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
        .text-2xl { font-size: 1.5rem; line-height: 2rem; }
        
        .font-bold { font-weight: 700; }
        .font-semibold { font-weight: 600; }
        .font-medium { font-weight: 500; }

        .text-gray-500 { color: #6b7280; }
        .text-gray-600 { color: #4b5563; }
        .text-gray-800 { color: #1f2937; }

        .mt-1 { margin-top: 0.25rem; }
        .mt-2 { margin-top: 0.5rem; }
        .mt-4 { margin-top: 1rem; }
        .mt-6 { margin-top: 1.5rem; }
        .mt-8 { margin-top: 2rem; }
        .mb-2 { margin-bottom: 0.5rem; }
        .mb-4 { margin-bottom: 1rem; }
        .my-4 { margin-top: 1rem; margin-bottom: 1rem; }
        
        .flex { display: flex; }
        .justify-between { justify-content: space-between; }
        .items-end { align-items: flex-end; }
        .items-center { align-items: center; }
        .gap-4 { gap: 1rem; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        
        .border-b { border-bottom: 1px solid #e5e7eb; }
        .border-t { border-top: 1px solid #e5e7eb; }
        .border-gray-800 { border-color: #1f2937; }
        .border-dashed { border-style: dashed; }
        .border-2 { border-width: 2px; }

        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; padding: 0.5rem; border-bottom: 2px solid #e5e7eb; font-weight: 600; }
        td { padding: 0.5rem; border-bottom: 1px solid #e5e7eb; }
        th.text-right, td.text-right { text-align: right; }
        
        /* Zebra stripes */
        .zebra-table tbody tr:nth-child(even) {
          background-color: #f9fafb;
        }

        /* Thermal overrides */
        .thermal-table th, .thermal-table td {
          padding: 0.25rem 0.125rem;
          border-bottom: 1px dashed #d1d5db;
        }
        .thermal-table th { border-bottom: 1px dashed #1f2937; }

        @media print {
          body {
            background-color: white;
            padding: 0;
            margin: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-btn {
            display: none !important;
          }
          .bill-container {
            box-shadow: none;
            margin: 0;
            padding: 0;
            width: 100% !important;
          }
          .bill-container[data-size="A4"], 
          .bill-container[data-size="A5"] {
            padding: 0 !important;
          }
          .bill-container[data-size="thermal_80mm"] {
            width: 80mm !important;
            padding: 0 !important;
          }
          .bill-container[data-size="thermal_58mm"] {
            width: 58mm !important;
            padding: 0 !important;
          }
          
          ::-webkit-scrollbar {
            display: none;
          }
        }
      ` }} />

      <button className="print-btn" onClick={() => window.print()}>
        <span role="img" aria-label="print">🖨️</span> Print Bill
      </button>

      <div className="bill-container" data-size={shop.bill_size || "A4"}>
        {/* HEADER */}
        <div className="flex justify-between items-end mb-4">
          <div className="flex gap-4 items-center">
            {shop.logo_url && !isThermal && (
              <img 
                src={shop.logo_url} 
                alt="Logo" 
                style={{ maxHeight: '80px', objectFit: 'contain' }} 
              />
            )}
            {shop.logo_url && isThermal && (
              <img 
                src={shop.logo_url} 
                alt="Logo" 
                style={{ maxHeight: '40px', objectFit: 'contain', marginBottom: '0.5rem' }} 
              />
            )}
            <div>
              <div className={`font-bold \${isThermal ? 'text-lg' : 'text-2xl'}`}>
                {shop.shop_name}
              </div>
              <div className={`text-gray-600 mt-1 \${isThermal ? 'text-xs' : 'text-sm'}`}>
                {shop.shop_address}
              </div>
              <div className={`text-gray-600 mt-1 \${isThermal ? 'text-xs' : 'text-sm'}`}>
                <span className="font-semibold">GSTIN:</span> {shop.gst_number}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className={`font-bold text-gray-800 \${isThermal ? 'text-sm' : 'text-xl'}`}>
              INVOICE
            </div>
            <div className={`mt-1 \${isThermal ? 'text-xs' : 'text-sm'}`}>
              <span className="text-gray-500">Bill No:</span> <span className="font-medium">{bill.bill_number}</span>
            </div>
            <div className={`\${isThermal ? 'text-xs' : 'text-sm'}`}>
              <span className="text-gray-500">Date:</span> <span className="font-medium">{formatDate(bill.bill_date)}</span>
            </div>
          </div>
        </div>

        <div className={`border-b \${isThermal ? 'border-dashed border-gray-400' : 'border-2 border-gray-800'} mb-4`}></div>

        {/* CUSTOMER SECTION */}
        <div className="mb-6">
          <div className={`text-gray-500 font-semibold mb-1 \${isThermal ? 'text-xs' : 'text-sm'}`}>
            Bill To:
          </div>
          <div className={`font-bold \${isThermal ? 'text-sm' : 'text-lg'}`}>
            {bill.customer_name}
          </div>
          <div className={`text-gray-600 \${isThermal ? 'text-xs' : 'text-sm'}`}>
            Phone: +91 {bill.customer_phone}
          </div>
        </div>

        {/* ITEMS TABLE */}
        <table className={`w-full \${isThermal ? 'thermal-table' : 'zebra-table'}`}>
          <thead>
            <tr>
              {!isThermal && <th>#</th>}
              <th>Item Name</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Rate</th>
              {!isThermal && <th className="text-right">GST%</th>}
              <th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {bill.items.map((item, idx) => (
              <tr key={idx}>
                {!isThermal && <td>{idx + 1}</td>}
                <td>{item.name}</td>
                <td className="text-right">{item.qty}</td>
                <td className="text-right">{formatCurrency(item.price)}</td>
                {!isThermal && <td className="text-right">{item.gst_percent}%</td>}
                <td className="text-right font-medium">{formatCurrency(item.qty * item.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* BOTTOM SECTION: GST SUMMARY AND TOTALS */}
        <div className={`flex \${isThermal ? 'flex-col' : 'justify-between'} mt-6`}>
          
          {/* GST SUMMARY TABLE (Hidden on thermal to save space) */}
          <div className={`\${isThermal ? 'hidden' : 'w-1/2 pr-8'}`}>
            {gstSlabs.length > 0 && (
              <>
                <div className="text-sm font-semibold text-gray-500 mb-2">GST Summary</div>
                <table className="text-xs text-gray-600 border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border-b border-gray-200 font-medium">GST Rate</th>
                      <th className="border-b border-gray-200 font-medium text-right">Taxable Amt</th>
                      <th className="border-b border-gray-200 font-medium text-right">GST Amt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gstSlabs.map((slab) => (
                      <tr key={slab.rate}>
                        <td className="border-b border-gray-100">{slab.rate}%</td>
                        <td className="border-b border-gray-100 text-right">{formatCurrency(slab.taxableAmount)}</td>
                        <td className="border-b border-gray-100 text-right">{formatCurrency(slab.taxAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>

          {/* TOTALS */}
          <div className={`\${isThermal ? 'w-full mt-4' : 'w-1/3'}`}>
            <div className="flex justify-between py-1 text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(bill.subtotal)}</span>
            </div>
            
            {/* Show compressed GST lines on thermal if there's GST */}
            {isThermal && gstSlabs.map((slab) => (
              <div key={slab.rate} className="flex justify-between py-0.5 text-xs text-gray-500">
                <span>GST {slab.rate}%</span>
                <span>{formatCurrency(slab.taxAmount)}</span>
              </div>
            ))}

            <div className="flex justify-between py-1 text-gray-600 border-b border-dashed border-gray-300">
              <span>Total GST</span>
              <span>{formatCurrency(bill.gst_amount)}</span>
            </div>
            
            <div className={`flex justify-between py-3 font-bold \${isThermal ? 'text-base' : 'text-xl'}`}>
              <span>GRAND TOTAL</span>
              <span>{formatCurrency(bill.total)}</span>
            </div>
          </div>
        </div>

        {isThermal ? <div className="border-t border-dashed border-gray-400 my-4"></div> : <div className="border-t-2 border-gray-800 mt-2 mb-6"></div>}

        {/* FOOTER */}
        <div className="text-center text-gray-400 text-sm italic pb-8">
          Thank you for your business!
        </div>
      </div>
    </>
  );
}
