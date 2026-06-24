import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    // ── Parse request body ────────────────────────────────────────
    const body = await request.json();
    const { phone, message, billId, clientId } = body as {
      phone?: string;
      message?: string;
      billId?: string;
      clientId?: string;
    };

    if (!phone || !message || !billId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: phone, message, billId" },
        { status: 400 }
      );
    }

    // ── Format phone number ───────────────────────────────────────
    let cleanPhone = phone.replace(/[\s\-\(\)\+]/g, "");

    if (!cleanPhone.startsWith("91")) {
      cleanPhone = `91${cleanPhone}`;
    }

    if (!/^91\d{10}$/.test(cleanPhone)) {
      return NextResponse.json(
        { success: false, error: "Invalid phone number. Expected 10-digit Indian number." },
        { status: 400 }
      );
    }

    // ── Resolve WhatsApp API credentials ──────────────────────────
    // Priority: client DB config > .env.local fallback
    const supabase = createAdminClient();

    let apiUrl: string | null = null;
    let apiKey: string | null = null;
    let instanceId: string | null = null;
    
    let provider = "ultramsg";
    let webhookUrl: string | null = null;
    let webhookPayload: string | null = null;

    // 1. Try to load from client record in DB
    if (clientId) {
      const { data: client } = await supabase
        .from("clients")
        .select("whatsapp_api_url, whatsapp_api_key, whatsapp_instance_id, whatsapp_provider, whatsapp_webhook_url, whatsapp_webhook_payload")
        .eq("id", clientId)
        .single();

      if (client) {
        apiUrl = client.whatsapp_api_url;
        apiKey = client.whatsapp_api_key;
        instanceId = client.whatsapp_instance_id;
        if (client.whatsapp_provider) provider = client.whatsapp_provider;
        webhookUrl = client.whatsapp_webhook_url;
        webhookPayload = client.whatsapp_webhook_payload;
      }
    }

    let waResponse: Response;

    if (provider === "custom") {
      if (!webhookUrl || !webhookPayload) {
        return NextResponse.json(
          { success: false, error: "Custom webhook URL or payload not configured in settings." },
          { status: 500 }
        );
      }

      // Substitute {{phone}} and {{message}} into the payload string
      // using replace to prevent breaking JSON structure (if it's JSON)
      const finalPayload = webhookPayload
        .replace(/\{\{phone\}\}/g, cleanPhone)
        .replace(/\{\{message\}\}/g, message.replace(/"/g, '\\"').replace(/\n/g, '\\n'));

      let parsedPayload;
      try {
        parsedPayload = JSON.parse(finalPayload);
      } catch {
        // If it's not valid JSON after replacement, we just send it as text or the user messed up the template
        parsedPayload = finalPayload;
      }

      waResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: typeof parsedPayload === "string" ? parsedPayload : JSON.stringify(parsedPayload),
      });

    } else {
      // 2. Fall back to environment variables if client config is incomplete
      if (!apiUrl) apiUrl = process.env.WHATSAPP_API_URL || null;
      if (!apiKey) apiKey = process.env.WHATSAPP_API_KEY || null;
      if (!instanceId) instanceId = process.env.WHATSAPP_INSTANCE_ID || null;

      // 3. Validate we have all three
      if (!apiUrl || !apiKey || !instanceId) {
        const missing = [];
        if (!apiUrl) missing.push("API URL");
        if (!apiKey) missing.push("API Key");
        if (!instanceId) missing.push("Instance ID");

        return NextResponse.json(
          {
            success: false,
            error: `WhatsApp API not configured. Missing: ${missing.join(", ")}. Configure in Settings or .env.local`,
          },
          { status: 500 }
        );
      }

      // ── Call WhatsApp API ─────────────────────────────────────────
      const normalizedUrl = apiUrl.replace(/\/+$/, ""); // strip trailing slashes

      if (normalizedUrl.includes("graph.facebook.com")) {
        // ── Meta WhatsApp Business API ─────────────────────────────
        const metaUrl = `${normalizedUrl}/${instanceId}/messages`;

        waResponse = await fetch(metaUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: cleanPhone,
            type: "text",
            text: { body: message },
          }),
        });
      } else {
        // ── Ultramsg / Generic API (form-urlencoded) ───────────────
        const genericUrl = `${normalizedUrl}/${instanceId}/messages/chat`;

        const formBody = new URLSearchParams({
          token: apiKey,
          to: cleanPhone,
          body: message,
        });

        waResponse = await fetch(genericUrl, {
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded",
          },
          body: formBody.toString(),
        });
      }
    }

    let waData;
    try {
      waData = await waResponse.json();
    } catch {
      waData = { error: "Non-JSON response from API" };
    }

    // Check for errors
    if (!waResponse.ok || waData.error) {
      const errorMsg =
        waData.error?.message ||
        waData.error?.error_data?.details ||
        waData.error ||
        `WhatsApp API returned status ${waResponse.status}`;

      console.error("WhatsApp API error:", errorMsg, waData);

      return NextResponse.json(
        { success: false, error: `WhatsApp send failed: ${errorMsg}` },
        { status: 502 }
      );
    }

    // ── Update bill in Supabase ───────────────────────────────────
    const { error: dbError } = await supabase
      .from("bills")
      .update({
        whatsapp_sent: true,
        whatsapp_sent_at: new Date().toISOString(),
      })
      .eq("id", billId);

    if (dbError) {
      console.error("Failed to update bill whatsapp status:", dbError);
    }

    return NextResponse.json({
      success: true,
      messageId: waData.messages?.[0]?.id || waData.id || null,
    });
  } catch (err) {
    console.error("send-whatsapp route error:", err);

    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
