'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from 'next-themes'
import JsBarcode from 'jsbarcode'

// ── Barcode Display Component ──
function BarcodeDisplay({
  value,
  height = 50,
  fontSize = 10,
}: {
  value: string
  height?: number
  fontSize?: number
}) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          width: 1.8,
          height,
          displayValue: true,
          fontSize,
          margin: 6,
          background: '#ffffff',
          lineColor: '#000000',
        })
      } catch (err) {
        console.error('Barcode error:', err)
      }
    }
  }, [value, height, fontSize])

  return (
    <svg
      ref={svgRef}
      style={{
        display: 'block',
        background: 'white',
        borderRadius: 4,
      }}
    />
  )
}

export default function SettingsPage() {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [clientId, setClientId] = useState<string | null>(null)
  const [charCount, setCharCount] = useState(0)

  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [settings, setSettings] = useState({
    shop_name: '',
    shop_address: '',
    gst_number: '',
    owner_phone: '',
    bill_size: 'A4',
    logo_url: '',
    default_gst: '18',
    whatsapp_automation_enabled: false,
    whatsapp_api_token: '',
    whatsapp_phone_number_id: '',
    whatsapp_message_template: '',
  })

  // ── Products state ──
  const [products, setProducts] = useState<any[]>([])
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [savingProduct, setSavingProduct] = useState(false)

  const emptyProduct = {
    name: '',
    size: '',
    unit: 'pcs',
    combo_units: '1',
    price: '',
    gst_percent: '0',
    stock: '',
  }
  const [newProduct, setNewProduct] = useState(emptyProduct)

  // ── Theme tokens ──
  const t = {
    light: {
      bg: '#f9fafb',
      surface: '#ffffff',
      surfaceAlt: '#f3f4f6',
      border: '#e5e7eb',
      text: '#111111',
      textSub: '#6b7280',
      label: '#374151',
      inputBg: '#ffffff',
      accent: '#2563eb',
    },
    dark: {
      bg: '#000000',
      surface: '#111111',
      surfaceAlt: '#1a1a1a',
      border: '#2a2a2a',
      text: '#ffffff',
      textSub: '#9ca3af',
      label: '#d1d5db',
      inputBg: '#1a1a1a',
      accent: '#3b82f6',
    },
  }
  const currentTheme = mounted && theme === 'dark' ? 'dark' : 'light'
  const c = t[currentTheme]

  // ── Load settings + products ──
  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from('clients')
          .select('*')
          .limit(1)
          .single()
        if (data) {
          setClientId(data.id)
          setSettings({
            shop_name: data.shop_name || '',
            shop_address: data.shop_address || '',
            gst_number: data.gst_number || '',
            owner_phone: data.owner_phone || '',
            bill_size: data.bill_size || 'A4',
            logo_url: data.logo_url || '',
            default_gst: data.default_gst || '18',
            whatsapp_automation_enabled:
              data.whatsapp_automation_enabled || false,
            whatsapp_api_token: data.whatsapp_api_token || '',
            whatsapp_phone_number_id:
              data.whatsapp_phone_number_id || '',
            whatsapp_message_template:
              data.whatsapp_message_template || '',
          })
          setCharCount(
            (data.whatsapp_message_template || '').length
          )

          // Load products
          const { data: productData } = await supabase
            .from('products')
            .select('*')
            .eq('client_id', data.id)
            .order('created_at', { ascending: false })

          if (productData) setProducts(productData)
        }
      } catch (err) {
        console.error('Load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function update(field: string, value: string | boolean) {
    setSettings(prev => ({ ...prev, [field]: value }))
    if (field === 'whatsapp_message_template' && typeof value === 'string') {
      setCharCount(value.length)
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      alert('Max 2MB allowed')
      return
    }
    const ext = file.name.split('.').pop()
    const path = `logos/${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('logos')
      .upload(path, file, { upsert: true })
    if (error) {
      alert('Upload failed: ' + error.message)
      return
    }
    const { data: urlData } = supabase.storage
      .from('logos')
      .getPublicUrl(path)
    update('logo_url', urlData.publicUrl)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const payload = {
        shop_name: settings.shop_name,
        shop_address: settings.shop_address,
        gst_number: settings.gst_number,
        owner_phone: settings.owner_phone,
        bill_size: settings.bill_size,
        logo_url: settings.logo_url,
        default_gst: settings.default_gst,
        whatsapp_automation_enabled:
          settings.whatsapp_automation_enabled,
        whatsapp_api_token: settings.whatsapp_api_token,
        whatsapp_phone_number_id:
          settings.whatsapp_phone_number_id,
        whatsapp_message_template:
          settings.whatsapp_message_template,
      }
      if (clientId) {
        await supabase
          .from('clients')
          .update(payload)
          .eq('id', clientId)
      } else {
        await supabase.from('clients').insert(payload)
      }
      alert('Settings saved!')
    } catch (err) {
      alert('Save failed: ' + (err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  // ── Product functions ──
  function generateBarcodeValue(cId: string): string {
    const prefix = cId.slice(0, 6).toUpperCase().replace(/-/g, '')
    const timestamp = Date.now().toString().slice(-7)
    const random = Math.floor(Math.random() * 999)
      .toString().padStart(3, '0')
    return prefix + timestamp + random
  }

  function printProductLabel(product: any) {
    const canvas = document.createElement('canvas')
    JsBarcode(canvas, product.barcode_value, {
      format: 'CODE128',
      width: 2, height: 60,
      displayValue: true, fontSize: 12,
      margin: 8, background: '#ffffff',
    })
    const barcodeDataUrl = canvas.toDataURL('image/png')

    const label = document.createElement('div')
    label.id = 'product-label-print'
    label.innerHTML = `
      <div style="font-family:Arial;text-align:center;
        padding:8mm;width:60mm;box-sizing:border-box">
        <div style="font-size:13px;font-weight:bold;
          margin-bottom:3px;line-height:1.3">
          ${product.name}
          ${product.size ? ' — ' + product.size : ''}
        </div>
        ${product.unit !== 'pcs' || product.combo_units > 1
          ? `<div style="font-size:10px;color:#555;margin-bottom:3px">
               ${product.combo_units} ${product.unit}
             </div>`
          : ''
        }
        <div style="font-size:14px;font-weight:bold;
          color:#111;margin-bottom:6px">
          ₹${Number(product.price).toFixed(2)}
        </div>
        <img src="${barcodeDataUrl}"
          style="width:100%;max-width:52mm"/>
      </div>
    `
    document.body.appendChild(label)

    const style = document.createElement('style')
    style.id = 'product-label-style'
    style.innerHTML = `
      @media print {
        body > *:not(#product-label-print) {
          display: none !important;
        }
        #product-label-print {
          display: block !important;
          position: fixed !important;
          top: 0 !important; left: 0 !important;
        }
        @page {
          margin: 0;
          size: 62mm 40mm;
        }
      }
    `
    document.head.appendChild(style)

    setTimeout(() => {
      window.print()
      window.onafterprint = () => {
        document.getElementById('product-label-print')?.remove()
        document.getElementById('product-label-style')?.remove()
        window.onafterprint = null
      }
      setTimeout(() => {
        document.getElementById('product-label-print')?.remove()
        document.getElementById('product-label-style')?.remove()
      }, 30000)
    }, 150)
  }

  async function handleSaveProduct() {
    if (!newProduct.name.trim()) {
      alert('Product name is required')
      return
    }
    if (!newProduct.price || Number(newProduct.price) <= 0) {
      alert('Enter a valid price')
      return
    }
    if (!clientId) {
      alert('Settings not loaded yet. Try again.')
      return
    }

    setSavingProduct(true)

    const barcodeValue = generateBarcodeValue(clientId)

    const payload = {
      client_id: clientId,
      name: newProduct.name.trim(),
      size: newProduct.size.trim() || null,
      unit: newProduct.unit,
      combo_units: Number(newProduct.combo_units) || 1,
      price: Number(newProduct.price),
      gst_percent: Number(newProduct.gst_percent) || 0,
      stock: Number(newProduct.stock) || 0,
      barcode_value: barcodeValue,
    }

    const { data, error } = await supabase
      .from('products')
      .insert(payload)
      .select()
      .single()

    if (error) {
      alert('Failed to save product: ' + error.message)
      setSavingProduct(false)
      return
    }

    setProducts(prev => [data, ...prev])
    setNewProduct(emptyProduct)
    setShowAddProduct(false)
    setSavingProduct(false)
  }

  async function handleDeleteProduct(productId: string) {
    if (!confirm('Delete this product? This cannot be undone.')) {
      return
    }
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId)

    if (error) {
      alert('Delete failed: ' + error.message)
      return
    }
    setProducts(prev => prev.filter(p => p.id !== productId))
  }

  async function handleUpdateStock(
    productId: string,
    newStock: number
  ) {
    await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', productId)

    setProducts(prev => prev.map(p =>
      p.id === productId ? { ...p, stock: newStock } : p
    ))
  }

  // ── Shared styles ──
  const card: React.CSSProperties = {
    background: c.surface,
    border: '1px solid ' + c.border,
    borderRadius: 12,
    padding: '24px',
    marginBottom: 20,
  }
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: c.label,
    marginBottom: 5,
  }
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid ' + c.border,
    borderRadius: 8,
    fontSize: 14,
    boxSizing: 'border-box',
    background: c.inputBg,
    color: c.text,
    outline: 'none',
    marginBottom: 10,
  }
  const sectionTitle: React.CSSProperties = {
    fontSize: 15,
    fontWeight: 700,
    color: c.text,
    marginBottom: 4,
  }
  const sectionSub: React.CSSProperties = {
    fontSize: 13,
    color: c.textSub,
    marginBottom: 20,
  }
  const fieldWrap: React.CSSProperties = { marginBottom: 16 }
  const hint: React.CSSProperties = {
    fontSize: 11,
    color: c.textSub,
    marginTop: 4,
  }
  const required: React.CSSProperties = { color: '#ef4444', marginLeft: 2 }

  if (loading) return (
    <div style={{
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', height: '100vh',
      background: c.bg, color: c.text,
      fontFamily: 'Arial, sans-serif',
    }}>
      Loading settings...
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh',
      background: c.bg,
      color: c.text,
      fontFamily: 'Arial, sans-serif',
      paddingBottom: 60,
    }}>

      {/* Top bar */}
      <div style={{
        background: c.surface,
        borderBottom: '1px solid ' + c.border,
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div>
          <h1 style={{
            fontSize: 20, fontWeight: 700,
            color: c.text, margin: 0,
          }}>
            Settings
          </h1>
          <p style={{
            fontSize: 12, color: c.textSub,
            margin: '2px 0 0',
          }}>
            Configure your shop details, default bill size,
            and WhatsApp message template.
          </p>
        </div>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          title="Switch Theme (Alt + T)"
          style={{
            background: c.surfaceAlt,
            border: '1px solid ' + c.border,
            borderRadius: 20,
            padding: '7px 16px',
            fontSize: 13,
            cursor: 'pointer',
            color: c.text,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: 500,
          }}
        >
          {mounted && theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 680, margin: '32px auto', padding: '0 20px' }}>

        {/* ── Hardware Scanner Status ── */}
        <div style={{
          background: c.surface,
          border: '1px solid ' + c.border,
          borderRadius: 12, padding: '16px 20px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: '#22c55e',
              boxShadow: '0 0 6px #22c55e',
              flexShrink: 0,
            }} />
            <div>
              <div style={{
                fontSize: 14, fontWeight: 600, color: c.text,
              }}>
                Hardware Barcode Scanner
              </div>
              <div style={{ fontSize: 12, color: c.textSub, marginTop: 2 }}>
                Plug in any USB or Bluetooth barcode scanner —
                works automatically on the billing page.
                No drivers needed.
              </div>
            </div>
          </div>
          <div style={{
            background: '#f0fdf4', border: '1px solid #86efac',
            borderRadius: 20, padding: '4px 12px',
            fontSize: 11, fontWeight: 600, color: '#166534',
            flexShrink: 0, marginLeft: 12,
          }}>
            Auto-detected
          </div>
        </div>

        {/* ── Business Information ── */}
        <div style={card}>
          <div style={sectionTitle}>Business Information</div>
          <div style={sectionSub}>
            Your business details that will appear on generated bills.
          </div>

          <div style={fieldWrap}>
            <label style={labelStyle}>
              Business Name <span style={required}>*</span>
            </label>
            <input
              style={inputStyle}
              type="text"
              value={settings.shop_name}
              onChange={e => update('shop_name', e.target.value)}
              placeholder="e.g. Sharma General Store"
            />
          </div>

          <div style={fieldWrap}>
            <label style={labelStyle}>
              Business Address <span style={required}>*</span>
            </label>
            <textarea
              style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
              value={settings.shop_address}
              onChange={e => update('shop_address', e.target.value)}
              placeholder="Full address including city and PIN"
            />
          </div>

          <div style={fieldWrap}>
            <label style={labelStyle}>
              GST Number <span style={required}>*</span>
            </label>
            <input
              style={inputStyle}
              type="text"
              value={settings.gst_number}
              onChange={e =>
                update('gst_number', e.target.value.toUpperCase())
              }
              maxLength={15}
              placeholder="22AAAAA0000A1Z5"
            />
            <div style={hint}>
              15-character GSTIN (e.g. 22AAAAA0000A1Z5)
            </div>
          </div>

          <div style={fieldWrap}>
            <label style={labelStyle}>Owner WhatsApp Number</label>
            <input
              style={inputStyle}
              type="tel"
              value={settings.owner_phone}
              onChange={e => update('owner_phone', e.target.value)}
              placeholder="10-digit mobile number"
            />
            <div style={hint}>Used for receiving test messages</div>
          </div>

          <div style={fieldWrap}>
            <label style={labelStyle}>Default Bill Size</label>
            <select
              style={{ ...inputStyle, cursor: 'pointer' }}
              value={settings.bill_size}
              onChange={e => update('bill_size', e.target.value)}
            >
              <option value="A4">A4</option>
              <option value="A5">A5</option>
              <option value="thermal-80mm">Thermal 80mm</option>
              <option value="thermal-58mm">Thermal 58mm</option>
            </select>
          </div>

          {/* Logo upload */}
          <div style={fieldWrap}>
            <label style={labelStyle}>Business Logo</label>
            <div style={{
              fontSize: 13, color: c.textSub, marginBottom: 10,
            }}>
              Upload your business logo to display on bills.
              Max 2MB, image files only.
            </div>

            {settings.logo_url && (
              <div style={{ marginBottom: 12 }}>
                <img
                  src={settings.logo_url}
                  alt="logo preview"
                  style={{
                    maxHeight: 64, maxWidth: 160,
                    borderRadius: 6,
                    border: '1px solid ' + c.border,
                    padding: 4,
                    background: '#fff',
                  }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  background: c.accent,
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 13,
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Upload Logo
              </button>

              {settings.logo_url && (
                <>
                  <button
                    type="button"
                    onClick={() => update('logo_url', '')}
                    style={{
                      background: 'transparent',
                      color: '#ef4444',
                      border: '1px solid #ef4444',
                      borderRadius: 8,
                      padding: '8px 16px',
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    Remove
                  </button>

                  <a
                    href={settings.logo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: 'transparent',
                      color: c.accent,
                      border: '1px solid ' + c.accent,
                      borderRadius: 8,
                      padding: '8px 16px',
                      fontSize: 13,
                      cursor: 'pointer',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                  >
                    View Sample Bill
                  </a>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              style={{ display: 'none' }}
              onChange={handleLogoUpload}
            />
            <div style={{ ...hint, marginTop: 8 }}>
              PNG, JPG, or SVG. Recommended size: 200×200px.
            </div>
          </div>
        </div>

        {/* ── Billing Defaults ── */}
        <div style={card}>
          <div style={sectionTitle}>Billing Defaults</div>
          <div style={sectionSub}>
            Configure default settings for your new bills.
          </div>

          <div style={fieldWrap}>
            <label style={labelStyle}>Default GST (%)</label>
            <input
              style={{ ...inputStyle, maxWidth: 120 }}
              type="number"
              min="0"
              max="28"
              value={settings.default_gst}
              onChange={e => update('default_gst', e.target.value)}
            />
            <div style={hint}>
              This GST rate will automatically apply to all new items
              added to your bills.
            </div>
          </div>
        </div>

        {/* ── Products & Barcodes ── */}
        <div style={card}>

          {/* Section header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'flex-start', marginBottom: 4,
          }}>
            <div>
              <div style={sectionTitle}>Products & Barcodes</div>
              <div style={sectionSub}>
                Add products with auto-generated barcodes.
                Scan barcodes on the billing page to add
                items instantly.
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowAddProduct(prev => !prev)
                setNewProduct(emptyProduct)
              }}
              style={{
                background: showAddProduct
                  ? 'transparent' : c.accent,
                color: showAddProduct ? c.textSub : 'white',
                border: showAddProduct
                  ? '1px solid ' + c.border : 'none',
                borderRadius: 8,
                padding: '8px 16px', fontSize: 13,
                cursor: 'pointer', fontWeight: 500,
                flexShrink: 0, marginLeft: 12,
              }}
            >
              {showAddProduct ? '✕ Cancel' : '+ Add Product'}
            </button>
          </div>

          {/* Add product form */}
          {showAddProduct && (
            <div style={{
              background: c.surfaceAlt,
              border: '1px solid ' + c.border,
              borderRadius: 10, padding: '16px',
              marginBottom: 16,
            }}>
              <div style={{
                fontSize: 13, fontWeight: 600,
                color: c.text, marginBottom: 12,
              }}>
                New Product
              </div>

              {/* Row 1: Name + Size */}
              <div style={{ display:'flex', gap:10 }}>
                <div style={{ flex: 2 }}>
                  <label style={{ ...labelStyle, fontSize: 12 }}>
                    Product Name *
                  </label>
                  <input
                    style={inputStyle}
                    type="text"
                    placeholder="e.g. Basmati Rice"
                    value={newProduct.name}
                    onChange={e => setNewProduct(p => ({
                      ...p, name: e.target.value
                    }))}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ ...labelStyle, fontSize: 12 }}>
                    Size / Variant
                  </label>
                  <input
                    style={inputStyle}
                    type="text"
                    placeholder="e.g. 5kg, 500ml"
                    value={newProduct.size}
                    onChange={e => setNewProduct(p => ({
                      ...p, size: e.target.value
                    }))}
                  />
                </div>
              </div>

              {/* Row 2: Unit + Combo qty + Stock */}
              <div style={{ display:'flex', gap:10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ ...labelStyle, fontSize: 12 }}>
                    Unit
                  </label>
                  <select
                    style={{ ...inputStyle, cursor:'pointer' }}
                    value={newProduct.unit}
                    onChange={e => setNewProduct(p => ({
                      ...p, unit: e.target.value
                    }))}
                  >
                    <option value="pcs">pcs</option>
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="litre">litre</option>
                    <option value="ml">ml</option>
                    <option value="box">box</option>
                    <option value="pack">pack</option>
                    <option value="dozen">dozen</option>
                    <option value="pair">pair</option>
                    <option value="set">set</option>
                    <option value="combo">combo</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ ...labelStyle, fontSize: 12 }}>
                    Qty in combo
                  </label>
                  <input
                    style={inputStyle}
                    type="number"
                    min="1"
                    placeholder="e.g. 6"
                    value={newProduct.combo_units}
                    onChange={e => setNewProduct(p => ({
                      ...p, combo_units: e.target.value
                    }))}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ ...labelStyle, fontSize: 12 }}>
                    Stock
                  </label>
                  <input
                    style={inputStyle}
                    type="number"
                    min="0"
                    placeholder="0"
                    value={newProduct.stock}
                    onChange={e => setNewProduct(p => ({
                      ...p, stock: e.target.value
                    }))}
                  />
                </div>
              </div>

              {/* Row 3: Price + GST */}
              <div style={{ display:'flex', gap:10 }}>
                <div style={{ flex: 2 }}>
                  <label style={{ ...labelStyle, fontSize: 12 }}>
                    Price (₹) *
                  </label>
                  <input
                    style={inputStyle}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={newProduct.price}
                    onChange={e => setNewProduct(p => ({
                      ...p, price: e.target.value
                    }))}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ ...labelStyle, fontSize: 12 }}>
                    GST %
                  </label>
                  <select
                    style={{ ...inputStyle, cursor:'pointer' }}
                    value={newProduct.gst_percent}
                    onChange={e => setNewProduct(p => ({
                      ...p, gst_percent: e.target.value
                    }))}
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
              </div>

              {/* Preview barcode */}
              <div style={{
                background: 'white', borderRadius: 8,
                padding: '10px 14px', border: '1px solid ' + c.border,
                marginBottom: 12,
              }}>
                <div style={{ fontSize: 11, color: '#9ca3af',
                  marginBottom: 4 }}>
                  Barcode preview (auto-generated on save):
                </div>
                <BarcodeDisplay
                  value="PREVIEW123456789"
                  height={40}
                  fontSize={9}
                />
                <div style={{ fontSize: 10, color: '#9ca3af',
                  marginTop: 3 }}>
                  Your product will get a unique barcode like this
                </div>
              </div>

              {/* Save button */}
              <button
                type="button"
                onClick={handleSaveProduct}
                disabled={savingProduct}
                style={{
                  background: savingProduct ? '#93c5fd' : c.accent,
                  color: 'white', border: 'none',
                  borderRadius: 8, padding: '10px 20px',
                  fontSize: 13, fontWeight: 600,
                  cursor: savingProduct ? 'not-allowed' : 'pointer',
                  width: '100%',
                }}
              >
                {savingProduct
                  ? '⏳ Saving...'
                  : '✅ Save Product & Generate Barcode'}
              </button>
            </div>
          )}

          {/* Search bar */}
          {products.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <input
                style={{
                  ...inputStyle,
                  marginBottom: 0,
                  background: c.inputBg,
                }}
                type="text"
                placeholder="🔍 Search products..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
              />
            </div>
          )}

          {/* Product count */}
          <div style={{
            fontSize: 12, color: c.textSub, marginBottom: 10,
          }}>
            {products.length} product{products.length !== 1
              ? 's' : ''} in catalogue
          </div>

          {/* Products list */}
          {products.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '32px 20px',
              color: c.textSub,
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>
                No products yet
              </div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                Add your first product to generate its barcode
              </div>
            </div>
          ) : (
            products
              .filter(p => {
                const q = productSearch.toLowerCase()
                return !q ||
                  p.name.toLowerCase().includes(q) ||
                  (p.size || '').toLowerCase().includes(q) ||
                  p.barcode_value.toLowerCase().includes(q)
              })
              .map((product: any) => (
                <div key={product.id} style={{
                  background: c.surfaceAlt,
                  border: '1px solid ' + c.border,
                  borderRadius: 10, padding: '14px',
                  marginBottom: 10,
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}>

                    {/* Product info */}
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <div style={{
                        fontSize: 14, fontWeight: 700,
                        color: c.text, marginBottom: 2,
                      }}>
                        {product.name}
                        {product.size
                          ? ` — ${product.size}` : ''}
                      </div>
                      <div style={{
                        fontSize: 12, color: c.textSub,
                        marginBottom: 4,
                      }}>
                        {product.combo_units > 1
                          ? `${product.combo_units} ${product.unit} `
                          : `${product.unit} `}
                        · ₹{Number(product.price).toFixed(2)}
                        · GST {product.gst_percent}%
                      </div>

                      {/* Stock control */}
                      <div style={{
                        display: 'flex', alignItems: 'center',
                        gap: 6, marginTop: 4,
                      }}>
                        <span style={{
                          fontSize: 11, color: c.textSub,
                        }}>
                          Stock:
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateStock(
                            product.id,
                            Math.max(0, product.stock - 1)
                          )}
                          style={{
                            width: 22, height: 22,
                            border: '1px solid ' + c.border,
                            borderRadius: 4, cursor: 'pointer',
                            background: c.surface, color: c.text,
                            fontSize: 14, display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                          }}
                        >
                          −
                        </button>
                        <span style={{
                          fontSize: 13, fontWeight: 600,
                          color: product.stock <= 5
                            ? '#ef4444' : c.text,
                          minWidth: 24, textAlign: 'center',
                        }}>
                          {product.stock}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateStock(
                            product.id, product.stock + 1
                          )}
                          style={{
                            width: 22, height: 22,
                            border: '1px solid ' + c.border,
                            borderRadius: 4, cursor: 'pointer',
                            background: c.surface, color: c.text,
                            fontSize: 14, display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                          }}
                        >
                          +
                        </button>
                        {product.stock <= 5 && product.stock > 0 && (
                          <span style={{
                            fontSize: 10, color: '#f59e0b',
                            fontWeight: 600,
                          }}>
                            ⚠️ Low
                          </span>
                        )}
                        {product.stock === 0 && (
                          <span style={{
                            fontSize: 10, color: '#ef4444',
                            fontWeight: 600,
                          }}>
                            ❌ Out of stock
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Barcode */}
                    <div style={{
                      background: 'white', borderRadius: 8,
                      padding: '8px 10px',
                      border: '1px solid #e5e7eb',
                      flexShrink: 0,
                    }}>
                      <BarcodeDisplay
                        value={product.barcode_value}
                        height={44}
                        fontSize={9}
                      />
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{
                    display: 'flex', gap: 6,
                    marginTop: 10, flexWrap: 'wrap',
                  }}>
                    <button
                      type="button"
                      onClick={() => printProductLabel(product)}
                      style={{
                        background: '#2563eb', color: 'white',
                        border: 'none', borderRadius: 6,
                        padding: '5px 12px', fontSize: 12,
                        cursor: 'pointer', fontWeight: 500,
                      }}
                    >
                      🖨️ Print Label
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(product.id)}
                      style={{
                        background: 'transparent',
                        color: '#ef4444',
                        border: '1px solid #ef4444',
                        borderRadius: 6, padding: '5px 12px',
                        fontSize: 12, cursor: 'pointer',
                      }}
                    >
                      🗑️ Delete
                    </button>
                    <div style={{
                      marginLeft: 'auto',
                      fontSize: 10, color: c.textSub,
                      alignSelf: 'center',
                      fontFamily: 'monospace',
                    }}>
                      {product.barcode_value}
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>

        {/* ── WhatsApp Settings ── */}
        <div style={card}>
          <div style={sectionTitle}>WhatsApp Settings</div>
          <div style={sectionSub}>
            Configure your automated WhatsApp messaging.
          </div>

          {/* Automation toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            background: c.surfaceAlt,
            borderRadius: 10,
            border: '1px solid ' + c.border,
            marginBottom: 16,
          }}>
            <div>
              <div style={{
                fontSize: 14, fontWeight: 600, color: c.text,
              }}>
                WhatsApp Automation
              </div>
              <div style={{ fontSize: 12, color: c.textSub, marginTop: 2 }}>
                Auto-send thank you message when bill is saved
              </div>
              <div style={{
                display: 'inline-block',
                marginTop: 6,
                fontSize: 11,
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: 20,
                background: settings.whatsapp_automation_enabled
                  ? '#dcfce7'
                  : '#f3f4f6',
                color: settings.whatsapp_automation_enabled
                  ? '#166534'
                  : '#6b7280',
              }}>
                {settings.whatsapp_automation_enabled
                  ? '✅ Automated — sends via API'
                  : '📱 Manual Mode — opens WhatsApp Web'}
              </div>
            </div>

            {/* Toggle switch */}
            <div
              onClick={() =>
                update(
                  'whatsapp_automation_enabled',
                  !settings.whatsapp_automation_enabled
                )
              }
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                background: settings.whatsapp_automation_enabled
                  ? '#25d366'
                  : c.border,
                position: 'relative',
                cursor: 'pointer',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              <div style={{
                position: 'absolute',
                top: 2,
                left: settings.whatsapp_automation_enabled ? 22 : 2,
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: 'white',
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </div>
          </div>

          {/* API fields — only when automation ON */}
          {settings.whatsapp_automation_enabled && (
            <>
              <div style={fieldWrap}>
                <label style={labelStyle}>API Token</label>
                <input
                  style={inputStyle}
                  type="password"
                  value={settings.whatsapp_api_token}
                  onChange={e =>
                    update('whatsapp_api_token', e.target.value)
                  }
                  placeholder="Your WhatsApp API token"
                />
              </div>
              <div style={fieldWrap}>
                <label style={labelStyle}>Phone Number ID</label>
                <input
                  style={inputStyle}
                  type="text"
                  value={settings.whatsapp_phone_number_id}
                  onChange={e =>
                    update('whatsapp_phone_number_id', e.target.value)
                  }
                  placeholder="Meta Phone Number ID"
                />
              </div>
            </>
          )}

          {/* Message template */}
          <div style={fieldWrap}>
            <label style={labelStyle}>WhatsApp Message Template</label>
            <textarea
              style={{
                ...inputStyle,
                resize: 'vertical',
                minHeight: 100,
              }}
              value={settings.whatsapp_message_template}
              onChange={e =>
                update('whatsapp_message_template', e.target.value)
              }
              placeholder="Dear {customer_name}, thank you for shopping at {shop_name}! Visit us again 🙏"
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 5,
            }}>
              <div style={hint}>
                Tip: Use{' '}
                <code style={{
                  background: c.surfaceAlt,
                  padding: '1px 5px',
                  borderRadius: 4,
                  fontSize: 11,
                }}>
                  {'{customer_name}'}
                </code>
                {' '}— it will be replaced with the actual name
              </div>
              <div style={{
                fontSize: 11,
                color: charCount > 160 ? '#ef4444' : c.textSub,
                flexShrink: 0,
                marginLeft: 8,
              }}>
                {charCount} characters
              </div>
            </div>
          </div>
        </div>

        {/* ── Save button ── */}
        <div style={{
          background: c.surface,
          border: '1px solid ' + c.border,
          borderRadius: 12,
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>
          <div style={{ fontSize: 13, color: c.textSub }}>
            Update your business settings.
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              background: saving ? '#93c5fd' : c.accent,
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '10px 28px',
              fontSize: 14,
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

      </div>
    </div>
  )
}
