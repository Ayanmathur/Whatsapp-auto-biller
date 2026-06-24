import type { BillSize } from "@/types/database";

// ── Types ─────────────────────────────────────────────────────────
interface PrintLineItem {
  name: string;
  qty: number;
  price: number;
  gst_percent: number;
}

interface PrintGSTSlab {
  slab: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  totalTax: number;
}

export interface PrintBillData {
  // Shop
  shopName: string;
  shopAddress: string;
  gstNumber: string;
  logoUrl: string | null;
  billSize: BillSize;
  // Bill
  billNumber: string;
  billDate: string;
  // Customer
  customerName: string;
  customerPhone: string;
  // Items & totals
  items: PrintLineItem[];
  subtotal: number;
  gstSlabs: PrintGSTSlab[];
  totalGST: number;
  grandTotal: number;
}

// ── Helpers ───────────────────────────────────────────────────────
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatCurrencyShort(amount: number): string {
  return "₹" + amount.toFixed(2);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Size class mapping ────────────────────────────────────────────
function getSizeClass(billSize: BillSize): string {
  switch (billSize) {
    case "A4":
      return "print-a4";
    case "A5":
      return "print-a5";
    case "thermal_80mm":
      return "print-thermal-80";
    case "thermal_58mm":
      return "print-thermal-58";
    default:
      return "print-a4";
  }
}

function isThermal(billSize: BillSize): boolean {
  return billSize === "thermal_80mm" || billSize === "thermal_58mm";
}

// ── Component ─────────────────────────────────────────────────────
export function PrintBill({ data }: { data: PrintBillData | null }) {
  if (!data) return null;

  const thermal = isThermal(data.billSize);
  const sizeClass = getSizeClass(data.billSize);

  return (
    <div id="print-bill" className={`print-bill-container ${sizeClass}`}>
      <div className="print-bill-inner">
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="bill-header">
          {data.logoUrl && !thermal && (
            <div className="bill-logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.logoUrl} alt="Shop Logo" />
            </div>
          )}
          {data.logoUrl && thermal && (
            <div className="bill-logo-thermal">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.logoUrl} alt="" />
            </div>
          )}
          <h1 className="bill-shop-name">{data.shopName}</h1>
          <p className="bill-shop-address">{data.shopAddress}</p>
          <p className="bill-gst">GSTIN: {data.gstNumber}</p>
        </div>

        {thermal ? <div className="bill-divider-dashed" /> : <hr className="bill-divider" />}

        {/* ── Bill Meta ───────────────────────────────────────── */}
        {thermal ? (
          <div className="bill-meta-thermal">
            <div>Bill#: {data.billNumber}</div>
            <div>Date: {formatDate(data.billDate)}</div>
            <div>Customer: {data.customerName}</div>
            <div>Phone: +91 {data.customerPhone}</div>
          </div>
        ) : (
          <div className="bill-meta">
            <table className="bill-meta-table">
              <tbody>
                <tr>
                  <td><strong>Bill No:</strong></td>
                  <td>{data.billNumber}</td>
                  <td><strong>Date:</strong></td>
                  <td>{formatDate(data.billDate)}</td>
                </tr>
                <tr>
                  <td><strong>Customer:</strong></td>
                  <td>{data.customerName}</td>
                  <td><strong>Phone:</strong></td>
                  <td>+91 {data.customerPhone}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {thermal ? <div className="bill-divider-dashed" /> : <hr className="bill-divider" />}

        {/* ── Items Table ─────────────────────────────────────── */}
        {thermal ? (
          /* Thermal receipt — compact format */
          <div className="bill-items-thermal">
            <div className="bill-items-thermal-header">
              <span className="col-name">Item</span>
              <span className="col-qty">Qty</span>
              <span className="col-rate">Rate</span>
              <span className="col-amt">Amt</span>
            </div>
            <div className="bill-divider-dashed" />
            {data.items.map((item, idx) => {
              const amt = item.qty * item.price;
              return (
                <div key={idx} className="bill-items-thermal-row">
                  <span className="col-name">{item.name}</span>
                  <span className="col-qty">{item.qty}</span>
                  <span className="col-rate">{formatCurrencyShort(item.price)}</span>
                  <span className="col-amt">{formatCurrencyShort(amt)}</span>
                </div>
              );
            })}
            <div className="bill-divider-dashed" />
          </div>
        ) : (
          /* A4 / A5 — full table */
          <table className="bill-items-table">
            <thead>
              <tr>
                <th className="text-left">#</th>
                <th className="text-left">Item</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Rate</th>
                <th className="text-right">GST%</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, idx) => {
                const amt = item.qty * item.price;
                return (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>{item.name}</td>
                    <td className="text-right">{item.qty}</td>
                    <td className="text-right">{formatCurrency(item.price)}</td>
                    <td className="text-right">{item.gst_percent}%</td>
                    <td className="text-right">{formatCurrency(amt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* ── Totals ──────────────────────────────────────────── */}
        <div className="bill-totals">
          <div className="bill-total-row">
            <span>Subtotal</span>
            <span>{thermal ? formatCurrencyShort(data.subtotal) : formatCurrency(data.subtotal)}</span>
          </div>

          {/* GST slab breakdown */}
          {data.gstSlabs.length > 0 && !thermal && (
            <div className="bill-gst-breakdown">
              <table className="bill-gst-table">
                <thead>
                  <tr>
                    <th className="text-left">GST Slab</th>
                    <th className="text-right">Taxable</th>
                    <th className="text-right">CGST</th>
                    <th className="text-right">SGST</th>
                    <th className="text-right">Total Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {data.gstSlabs.map((slab) => (
                    <tr key={slab.slab}>
                      <td>{slab.slab}%</td>
                      <td className="text-right">{formatCurrency(slab.taxableAmount)}</td>
                      <td className="text-right">{formatCurrency(slab.cgst)}</td>
                      <td className="text-right">{formatCurrency(slab.sgst)}</td>
                      <td className="text-right">{formatCurrency(slab.totalTax)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Thermal GST — compact */}
          {data.gstSlabs.length > 0 && thermal && (
            <div className="bill-gst-thermal">
              {data.gstSlabs.map((slab) => (
                <div key={slab.slab} className="bill-total-row sub">
                  <span>GST {slab.slab}% (on {formatCurrencyShort(slab.taxableAmount)})</span>
                  <span>{formatCurrencyShort(slab.totalTax)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="bill-total-row">
            <span>GST Total</span>
            <span>{thermal ? formatCurrencyShort(data.totalGST) : formatCurrency(data.totalGST)}</span>
          </div>

          {thermal ? <div className="bill-divider-dashed" /> : <hr className="bill-divider" />}

          <div className="bill-total-row grand">
            <span>Grand Total</span>
            <span>{thermal ? formatCurrencyShort(data.grandTotal) : formatCurrency(data.grandTotal)}</span>
          </div>
        </div>

        {thermal ? <div className="bill-divider-dashed" /> : <hr className="bill-divider" />}

        {/* ── Footer ──────────────────────────────────────────── */}
        <div className="bill-footer">
          <p>Thank you for your business!</p>
        </div>
      </div>
    </div>
  );
}
