import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PrintBill } from '@/components/print-bill'
import { PrintPreviewClient } from './print-preview-client'

export default async function PrintPage({ params }: { params: { id: string } }) {
  const cookieStore = cookies()
  const adminSession = cookieStore.get('admin_session')?.value

  let supabase;
  if (adminSession === process.env.ADMIN_SESSION_SECRET) {
    supabase = createAdminClient()
  } else {
    supabase = createClient()
  }

  // Fetch bill and client data
  const { data: bill } = await supabase
    .from('bills')
    .select('*, clients(*)')
    .eq('id', params.id)
    .single()

  if (!bill) {
    return <div className="p-10 text-center text-destructive">Bill not found or access denied.</div>
  }

  const shop = bill.clients;

  // Calculate GST slabs to pass to PrintBillData
  const items = Array.isArray(bill.items) ? bill.items : [];
  let subtotal = 0;
  let totalGST = 0;
  const slabsMap: Record<number, { taxableAmount: number; cgst: number; sgst: number; totalTax: number }> = {};

  items.forEach((item: Record<string, unknown>) => {
    const qty = Number(item.qty) || 0;
    const price = Number(item.price) || 0;
    const gstPercent = Number(item.gst_percent) || 0;
    
    const lineAmount = qty * price;
    subtotal += lineAmount;

    if (gstPercent > 0) {
      const taxForLine = lineAmount * (gstPercent / 100);
      const halfTax = taxForLine / 2;

      if (!slabsMap[gstPercent]) {
        slabsMap[gstPercent] = { taxableAmount: 0, cgst: 0, sgst: 0, totalTax: 0 };
      }
      slabsMap[gstPercent].taxableAmount += lineAmount;
      slabsMap[gstPercent].cgst += halfTax;
      slabsMap[gstPercent].sgst += halfTax;
      slabsMap[gstPercent].totalTax += taxForLine;
      totalGST += taxForLine;
    }
  });

  const gstSlabs = Object.entries(slabsMap).map(([slabStr, vals]) => ({
    slab: Number(slabStr),
    ...vals,
  }));

  const printData = {
    shopName: shop.shop_name,
    shopAddress: shop.shop_address,
    gstNumber: shop.gst_number,
    logoUrl: shop.logo_url,
    billSize: shop.bill_size,
    billNumber: bill.bill_number,
    billDate: bill.bill_date,
    customerName: bill.customer_name,
    customerPhone: bill.customer_phone,
    items,
    subtotal,
    gstSlabs,
    totalGST,
    grandTotal: subtotal + totalGST,
  };

  return (
    <>
      <PrintPreviewClient />
      <PrintBill data={printData} />
    </>
  )
}
