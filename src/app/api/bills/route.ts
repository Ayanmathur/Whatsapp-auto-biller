import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// GET /api/bills - Fetch shop info and bills for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action"); // "shop" | "bills" | "bill" | "count"
    const adminSupabase = createAdminClient();

    // Get authenticated user
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Determine client ID
    let clientId = searchParams.get("clientId");
    if (!clientId && user) {
      const { data: clientData } = await adminSupabase
        .from("clients")
        .select("id")
        .eq("user_id", user.id)
        .single();
      clientId = clientData?.id || null;
    }

    if (!clientId) {
      return NextResponse.json({ error: "No client found" }, { status: 404 });
    }

    if (action === "shop") {
      const { data, error } = await adminSupabase
        .from("clients")
        .select("id, shop_name, shop_address, gst_number, logo_url, bill_size, whatsapp_message_template, owner_phone, products, whatsapp_enabled, default_gst, whatsapp_automation_enabled, whatsapp_api_token, whatsapp_phone_number_id, default_discount_type, default_discount_value, saved_extra_charges")
        .eq("id", clientId)
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ data });
    }

    if (action === "bill") {
      const billId = searchParams.get("billId");
      if (!billId) return NextResponse.json({ error: "billId required" }, { status: 400 });

      const { data, error } = await adminSupabase
        .from("bills")
        .select("*")
        .eq("id", billId)
        .eq("client_id", clientId)
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data });
    }

    if (action === "count") {
      const billDate = searchParams.get("billDate");
      if (!billDate) return NextResponse.json({ count: 0 });

      const { count, error } = await adminSupabase
        .from("bills")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId)
        .eq("bill_date", billDate);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ count: count || 0 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("GET /api/bills error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/bills - Save or update a bill
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { billPayload, editBillId } = body;

    if (!billPayload) {
      return NextResponse.json({ error: "billPayload required" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    let data, error;
    if (editBillId) {
      const res = await adminSupabase
        .from("bills")
        .update(billPayload)
        .eq("id", editBillId)
        .select("id");
      data = res.data;
      error = res.error;
    } else {
      const res = await adminSupabase
        .from("bills")
        .insert(billPayload)
        .select("id");
      data = res.data;
      error = res.error;
    }

    if (error) {
      console.error("POST /api/bills Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("POST /api/bills error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
