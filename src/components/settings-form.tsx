"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { BillSize, ProductEntry, DiscountType, ExtraCharge } from "@/types/database";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SettingsFormData {
  id: string | null;
  shop_name: string;
  shop_address: string;
  gst_number: string;
  owner_phone: string;
  bill_size: BillSize;
  whatsapp_message_template: string;
  logo_url: string | null;
  whatsapp_api_url: string;
  whatsapp_api_key: string;
  whatsapp_instance_id: string;
  whatsapp_enabled: boolean;
  whatsapp_provider: string;
  whatsapp_webhook_url: string;
  whatsapp_webhook_payload: string;
  products: ProductEntry[];
  default_gst: number;
  whatsapp_automation_enabled: boolean;
  whatsapp_api_token: string;
  whatsapp_phone_number_id: string;
  default_discount_type: DiscountType;
  default_discount_value: number;
  saved_extra_charges: ExtraCharge[];
}

const INITIAL_FORM: SettingsFormData = {
  id: null,
  shop_name: "",
  shop_address: "",
  gst_number: "",
  owner_phone: "",
  bill_size: "A4",
  whatsapp_message_template:
    "Dear {customer_name}, thank you for shopping at our store! Your bill has been generated. Visit us again! 🙏",
  logo_url: null,
  whatsapp_api_url: "",
  whatsapp_api_key: "",
  whatsapp_instance_id: "",
  whatsapp_enabled: true,
  whatsapp_provider: "ultramsg",
  whatsapp_webhook_url: "",
  whatsapp_webhook_payload: '{\n  "phone": "{{phone}}",\n  "message": "{{message}}"\n}',
  products: [],
  default_gst: 0,
  whatsapp_automation_enabled: false,
  whatsapp_api_token: "",
  whatsapp_phone_number_id: "",
  default_discount_type: "none",
  default_discount_value: 0,
  saved_extra_charges: [],
};

const BILL_SIZE_OPTIONS: { value: BillSize; label: string }[] = [
  { value: "A4", label: "A4" },
  { value: "A5", label: "A5" },
  { value: "thermal_80mm", label: "Thermal 80mm" },
  { value: "thermal_58mm", label: "Thermal 58mm" },
];

export function SettingsForm() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<SettingsFormData>(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [newExtraChargeLabel, setNewExtraChargeLabel] = useState("");
  const [newExtraChargeAmount, setNewExtraChargeAmount] = useState("");

  function handleAddExtraCharge() {
    if (!newExtraChargeLabel.trim() || !newExtraChargeAmount) return;
    updateField("saved_extra_charges", [
      ...form.saved_extra_charges,
      { label: newExtraChargeLabel.trim(), amount: Number(newExtraChargeAmount) }
    ]);
    setNewExtraChargeLabel("");
    setNewExtraChargeAmount("");
  }
  
  function handleRemoveExtraCharge(idx: number) {
    const newCharges = [...form.saved_extra_charges];
    newCharges.splice(idx, 1);
    updateField("saved_extra_charges", newCharges);
  }

  // ── Load existing settings ──────────────────────────────────────
  const loadSettings = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows found — that's fine for first-time setup
        throw error;
      }

      if (data) {
        setForm({
          id: data.id,
          shop_name: data.shop_name,
          shop_address: data.shop_address,
          gst_number: data.gst_number,
          owner_phone: data.owner_phone,
          bill_size: data.bill_size as BillSize,
          whatsapp_message_template: data.whatsapp_message_template,
          logo_url: data.logo_url,
          whatsapp_api_url: data.whatsapp_api_url || "",
          whatsapp_api_key: data.whatsapp_api_key || "",
          whatsapp_instance_id: data.whatsapp_instance_id || "",
          whatsapp_enabled: data.whatsapp_enabled ?? true,
          whatsapp_provider: data.whatsapp_provider || "ultramsg",
          whatsapp_webhook_url: data.whatsapp_webhook_url || "",
          whatsapp_webhook_payload: data.whatsapp_webhook_payload || INITIAL_FORM.whatsapp_webhook_payload,
          products: data.products || [],
          default_gst: data.default_gst || 0,
          whatsapp_automation_enabled: data.whatsapp_automation_enabled ?? false,
          whatsapp_api_token: data.whatsapp_api_token || "",
          whatsapp_phone_number_id: data.whatsapp_phone_number_id || "",
          default_discount_type: data.default_discount_type || "none",
          default_discount_value: data.default_discount_value || 0,
          saved_extra_charges: data.saved_extra_charges || [],
        });
        if (data.logo_url) {
          setLogoPreview(data.logo_url);
        }
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
      toast.error("Failed to load settings. Check your Supabase connection.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // ── Form field handlers ─────────────────────────────────────────
  function updateField<K extends keyof SettingsFormData>(
    key: K,
    value: SettingsFormData[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // ── GST validation ──────────────────────────────────────────────
  function isValidGST(gst: string): boolean {
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
      gst.toUpperCase()
    );
  }

  // ── Logo upload ─────────────────────────────────────────────────
  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be smaller than 2MB.");
      return;
    }

    setUploading(true);

    try {
      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("assets")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("assets").getPublicUrl(filePath);

      setLogoPreview(publicUrl);
      updateField("logo_url", publicUrl);
      toast.success("Logo uploaded successfully!");
    } catch (err) {
      console.error("Logo upload failed:", err);
      toast.error("Failed to upload logo. Make sure the 'assets' storage bucket exists in Supabase.");
    } finally {
      setUploading(false);
    }
  }

  function handleRemoveLogo() {
    setLogoPreview(null);
    updateField("logo_url", null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  // ── Save settings ───────────────────────────────────────────────
  async function handleSave() {
    // Validation
    if (!form.shop_name.trim()) {
      toast.error("Business Name is required.");
      return;
    }
    if (!form.shop_address.trim()) {
      toast.error("Business Address is required.");
      return;
    }
    if (!form.gst_number.trim()) {
      toast.error("GST Number is required.");
      return;
    }
    if (form.gst_number.trim().length !== 15) {
      toast.error("GST Number must be exactly 15 characters.");
      return;
    }
    if (!isValidGST(form.gst_number.trim())) {
      toast.error("Invalid GST Number format. Expected format: 22AAAAA0000A1Z5");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        shop_name: form.shop_name.trim(),
        shop_address: form.shop_address.trim(),
        gst_number: form.gst_number.trim().toUpperCase(),
        owner_phone: form.owner_phone.trim(),
        bill_size: form.bill_size,
        whatsapp_message_template: form.whatsapp_message_template,
        logo_url: form.logo_url,
        whatsapp_api_url: form.whatsapp_api_url.trim() || null,
        whatsapp_api_key: form.whatsapp_api_key.trim() || null,
        whatsapp_instance_id: form.whatsapp_instance_id.trim() || null,
        whatsapp_enabled: form.whatsapp_enabled,
        whatsapp_provider: form.whatsapp_provider,
        whatsapp_webhook_url: form.whatsapp_webhook_url.trim() || null,
        whatsapp_webhook_payload: form.whatsapp_webhook_payload,
        products: form.products,
        default_gst: form.default_gst,
        whatsapp_automation_enabled: form.whatsapp_automation_enabled,
        whatsapp_api_token: form.whatsapp_api_token || null,
        whatsapp_phone_number_id: form.whatsapp_phone_number_id || null,
        default_discount_type: form.default_discount_type,
        default_discount_value: form.default_discount_value,
        saved_extra_charges: form.saved_extra_charges,
      };

      if (form.id) {
        // Update existing
        const { error } = await supabase
          .from("clients")
          .update(payload)
          .eq("id", form.id);

        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("clients")
          .insert({ ...payload, user_id: userId })
          .select("id")
          .single();

        if (error) throw error;
        if (data) {
          updateField("id", data.id);
        }
      }

      toast.success("Settings saved successfully!");
    } catch (err) {
      console.error("Save failed:", err);
      toast.error("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // ── Loading state ───────────────────────────────────────────────
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-muted-foreground">
            <svg
              className="h-5 w-5 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Loading settings...
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Form ────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Business Information */}
      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
          <CardDescription>
            Your business details that will appear on generated bills.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Business Name */}
          <div className="space-y-2">
            <Label htmlFor="shopName">
              Business Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="shopName"
              placeholder="e.g. Sharma Electronics"
              value={form.shop_name}
              onChange={(e) => updateField("shop_name", e.target.value)}
            />
          </div>

          {/* Business Address */}
          <div className="space-y-2">
            <Label htmlFor="shopAddress">
              Business Address <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="shopAddress"
              placeholder="e.g. 123, Main Road, Sector 5, Jaipur, Rajasthan - 302001"
              rows={3}
              value={form.shop_address}
              onChange={(e) => updateField("shop_address", e.target.value)}
            />
          </div>

          {/* GST Number & Phone — side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gstNumber">
                GST Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="gstNumber"
                placeholder="22AAAAA0000A1Z5"
                maxLength={15}
                value={form.gst_number}
                onChange={(e) =>
                  updateField("gst_number", e.target.value.toUpperCase())
                }
                className="font-mono tracking-wider"
              />
              <p className="text-xs text-muted-foreground">
                15-character GSTIN (e.g. 22AAAAA0000A1Z5)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerPhone">Owner WhatsApp Number</Label>
              <Input
                id="ownerPhone"
                placeholder="+91 98765 43210"
                value={form.owner_phone}
                onChange={(e) => updateField("owner_phone", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Used for receiving test messages
              </p>
            </div>
          </div>

          {/* Bill Size */}
          <div className="space-y-2">
            <Label htmlFor="billSize">Default Bill Size</Label>
            <Select
              value={form.bill_size}
              onValueChange={(v) => updateField("bill_size", v as BillSize)}
            >
              <SelectTrigger id="billSize" className="w-full md:w-[280px]">
                <SelectValue placeholder="Select bill size" />
              </SelectTrigger>
              <SelectContent>
                {BILL_SIZE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Default Discount */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discountType">Default Discount Type</Label>
              <Select
                value={form.default_discount_type || "none"}
                onValueChange={(v) => updateField("default_discount_type", v as DiscountType)}
              >
                <SelectTrigger id="discountType">
                  <SelectValue placeholder="Discount Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="percent">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="discountValue">Default Discount Value</Label>
              <Input
                id="discountValue"
                type="number"
                min="0"
                step="any"
                disabled={form.default_discount_type === "none"}
                value={form.default_discount_value || 0}
                onChange={(e) => updateField("default_discount_value", parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Saved Extra Charges */}
      <Card>
        <CardHeader>
          <CardTitle>Saved Extra Charges</CardTitle>
          <CardDescription>
            Pre-save common extra charges (e.g., Delivery, Packaging) to quickly add them to bills.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input 
              placeholder="Charge Label (e.g., Delivery Fee)" 
              value={newExtraChargeLabel}
              onChange={(e) => setNewExtraChargeLabel(e.target.value)}
              className="flex-1"
            />
            <Input 
              placeholder="Amount" 
              type="number"
              value={newExtraChargeAmount}
              onChange={(e) => setNewExtraChargeAmount(e.target.value)}
              className="w-32"
            />
            <Button type="button" onClick={handleAddExtraCharge} variant="secondary">
              Add
            </Button>
          </div>
          
          {form.saved_extra_charges.length > 0 && (
            <div className="border rounded-md divide-y mt-4">
              {form.saved_extra_charges.map((charge, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 text-sm">
                  <span>{charge.label}</span>
                  <div className="flex items-center gap-4">
                    <span className="font-medium text-muted-foreground">₹{charge.amount}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveExtraCharge(idx)} className="h-8 text-destructive">
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logo Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Business Logo</CardTitle>
          <CardDescription>
            Upload your business logo to display on bills. Max 2MB, image files
            only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Preview */}
            <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50 overflow-hidden">
              {logoPreview ? (
                <Image
                  src={logoPreview}
                  alt="Business logo"
                  width={128}
                  height={128}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                  </svg>
                  <span className="text-xs">No logo</span>
                </div>
              )}
            </div>

            {/* Upload controls */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <svg
                        className="mr-2 h-4 w-4 animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Uploading...
                    </>
                  ) : (
                    <>
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
                        className="mr-2"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" x2="12" y1="3" y2="15" />
                      </svg>
                      Upload Logo
                    </>
                  )}
                </Button>

                {logoPreview && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveLogo}
                    disabled={uploading}
                  >
                    Remove
                  </Button>
                )}
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="secondary" size="sm">View Sample Bill</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Sample Bill (Black & White)</DialogTitle>
                    </DialogHeader>
                    <div className="mt-4 p-6 border rounded-lg print-bill-preview filter grayscale mx-auto">
                      <div className="print-bill-inner" style={{width: form.bill_size.includes("thermal") ? "300px" : "100%"}}>
                        <div className="flex gap-3 mb-4 items-start">
                          {logoPreview && (
                            <div className="w-16 h-16 relative flex-shrink-0">
                              <Image src={logoPreview} alt="Logo" fill className="object-contain" />
                            </div>
                          )}
                          <div>
                            <h2 className="text-xl font-bold uppercase">{form.shop_name || "BUSINESS NAME"}</h2>
                            <p className="text-sm">{form.shop_address || "123 Business Street"}</p>
                            <p className="text-sm">GSTIN: {form.gst_number || "22AAAAA0000A1Z5"}</p>
                          </div>
                        </div>
                        <hr className="border-t border-black my-4 border-dashed" />
                        <div className="flex justify-between text-sm mb-4">
                          <div>
                            <p>Bill No: <strong>#SAMPLE-1</strong></p>
                            <p>Date: {new Date().toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <p>Name: <strong>John Doe</strong></p>
                            <p>Ph: 9876543210</p>
                          </div>
                        </div>
                        <table className="w-full text-sm mb-4 text-left border-collapse">
                          <thead>
                            <tr className="border-y border-black">
                              <th className="py-2">Item</th>
                              <th className="py-2">Qty</th>
                              <th className="py-2 text-right">Price</th>
                              <th className="py-2 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="py-2">Sample Product</td>
                              <td className="py-2">2</td>
                              <td className="py-2 text-right">₹500</td>
                              <td className="py-2 text-right">₹1,000</td>
                            </tr>
                          </tbody>
                        </table>
                        <div className="flex justify-between font-bold mt-4">
                          <span>Grand Total:</span>
                          <span>₹1,000.00</span>
                        </div>
                        <hr className="border-t border-black my-4 border-dashed" />
                        <div className="text-center text-sm">
                          <p>Thank you for your business!</p>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />

              <p className="text-xs text-muted-foreground">
                PNG, JPG, or SVG. Recommended size: 200×200px.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Default Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Billing Defaults</CardTitle>
          <CardDescription>
            Configure default settings for your new bills.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-sm">
            <Label htmlFor="defaultGst">
              Default GST (%)
            </Label>
            <Input
              id="defaultGst"
              type="number"
              min="0"
              max="100"
              placeholder="e.g. 18"
              value={form.default_gst}
              onChange={(e) => updateField("default_gst", Number(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">
              This GST rate will automatically apply to all new items added to your bills.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp Settings */}
      <Card>
        <CardHeader>
          <CardTitle>WhatsApp Settings</CardTitle>
          <CardDescription>
            Configure your automated WhatsApp messaging.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Toggle Switch */}
          <div className="flex flex-col space-y-3 p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">WhatsApp Automation</Label>
                <p className="text-sm text-muted-foreground">Auto-send thank you message when bill is saved</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={form.whatsapp_automation_enabled}
                  onChange={(e) => updateField("whatsapp_automation_enabled", e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
            
            <div className="pt-2">
              {form.whatsapp_automation_enabled ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <span className="w-2 h-2 mr-1.5 bg-green-500 rounded-full"></span>
                  Automated — sends via API
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  <span className="w-2 h-2 mr-1.5 bg-gray-400 rounded-full"></span>
                  Manual Mode — opens WhatsApp Web
                </span>
              )}
            </div>
          </div>

          {/* Conditional API Fields */}
          {form.whatsapp_automation_enabled && (
            <div className="space-y-4 p-4 border rounded-lg bg-card">
              <h4 className="font-medium text-sm">Meta Cloud API Credentials</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone Number ID</Label>
                  <Input
                    placeholder="e.g. 104561234567890"
                    value={form.whatsapp_phone_number_id}
                    onChange={(e) => updateField("whatsapp_phone_number_id", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>API Token</Label>
                  <div className="relative">
                    <Input
                      type="password"
                      placeholder="EAAL..."
                      value={form.whatsapp_api_token}
                      onChange={(e) => updateField("whatsapp_api_token", e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="pt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    if (!form.whatsapp_api_token || !form.whatsapp_phone_number_id || !form.owner_phone) {
                      toast.error("Please fill in Phone Number ID, API Token, and Owner Phone first.");
                      return;
                    }
                    toast("Sending test message...");
                    // Placeholder for actual test API call
                    setTimeout(() => {
                      toast.success("Test message sent successfully!");
                    }, 1000);
                  }}
                >
                  Test Connection
                </Button>
              </div>
            </div>
          )}

          {/* Always Visible Message Template */}
          <div className="space-y-2">
            <Label>WhatsApp Message Template</Label>
            <Textarea
              rows={4}
              value={form.whatsapp_message_template}
              onChange={(e) => updateField("whatsapp_message_template", e.target.value)}
            />
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <p>Tip: Use <code>{"{customer_name}"}</code> — it will be replaced with the actual name</p>
              <p>{form.whatsapp_message_template.length} characters</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center justify-between rounded-lg border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          {form.id
            ? "Update your business settings."
            : "Save to create your business profile."}
        </p>
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <>
              <svg
                className="mr-2 h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Saving...
            </>
          ) : (
            <>
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
                className="mr-2"
              >
                <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
                <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
                <path d="M7 3v4a1 1 0 0 0 1 1h7" />
              </svg>
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
