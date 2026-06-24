import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const adminSession = cookieStore.get("admin_session")?.value;
    
    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { clientId } = await request.json();
    if (!clientId) {
      return NextResponse.json({ error: "Client ID required" }, { status: 400 });
    }

    // Use service role to update client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Update next_billing_date to current date + 1 month
    const newDate = new Date();
    newDate.setMonth(newDate.getMonth() + 1);

    const { error } = await supabaseAdmin
      .from("clients")
      .update({ next_billing_date: newDate.toISOString() })
      .eq("id", clientId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark paid error:", error);
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
  }
}
