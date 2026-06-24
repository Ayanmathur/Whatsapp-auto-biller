export interface SendWhatsappParams {
  bill: {
    id: string;
    customer_name: string;
    customer_phone: string;
  };
  clientSettings: {
    whatsapp_automation_enabled: boolean;
    whatsapp_api_token: string | null;
    whatsapp_phone_number_id: string | null;
    whatsapp_message_template: string;
    shop_name: string;
  };
}

export async function sendWhatsappMessage({ bill, clientSettings }: SendWhatsappParams) {
  try {
    // Step 1: Prepare the message
    let finalMessage = clientSettings.whatsapp_message_template || "";
    
    // Fallback if template is completely empty
    if (!finalMessage) {
      finalMessage = `Dear {customer_name}, thank you for your purchase from {shop_name}!`;
    }

    finalMessage = finalMessage.replace(/\{customer_name\}/g, bill.customer_name);
    finalMessage = finalMessage.replace(/\{shop_name\}/g, clientSettings.shop_name);

    // Step 2: Format phone number
    // Remove all spaces, dashes, brackets
    let formattedPhone = bill.customer_phone.replace(/[\s\-\(\)]/g, "");

    // If it starts with 0: remove the 0 and add 91
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "91" + formattedPhone.substring(1);
    } 
    // If it starts with +91: remove the +
    else if (formattedPhone.startsWith("+91")) {
      formattedPhone = formattedPhone.substring(1);
    } 
    // If it's exactly 10 digits with no prefix: add 91
    else if (formattedPhone.length === 10) {
      formattedPhone = "91" + formattedPhone;
    }

    // Step 3: Branch on automation setting
    if (clientSettings.whatsapp_automation_enabled === true) {
      const waRes = await fetch("/api/send-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: formattedPhone,
          message: finalMessage,
          billId: bill.id,
        }),
      });

      if (!waRes.ok) {
        let errorData: Record<string, unknown> = {};
        try {
          errorData = await waRes.json();
        } catch {}
        return { success: false, error: (errorData.error as string) || "Failed to send via API" };
      }

      return { success: true, mode: "auto" };
    } else {
      // Manual mode
      const encodedMessage = encodeURIComponent(finalMessage);
      const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
      
      // Use window.open
      let opened = false;
      try {
        const popup = window.open(whatsappUrl, "_blank");
        if (popup) opened = true;
      } catch {}

      if (!opened) {
        // If window.open was aggressively blocked, return manual but with a flag so UI can handle it
        return { success: true, mode: "manual", popupBlocked: true, url: whatsappUrl };
      }

      return { success: true, mode: "manual" };
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
    return { success: false, error: errorMessage };
  }
}
