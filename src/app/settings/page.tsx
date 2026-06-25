'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [clientId, setClientId] = useState(null)
  const [charCount, setCharCount] = useState(0)

  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('admin_theme') || 'light'
    }
    return 'light'
  })

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
  const c = t[theme as keyof typeof t]

  useEffect(() => {
    document.body.style.background = c.bg
    document.body.style.color = c.text
  }, [theme, c.bg, c.text])

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
        }
      } catch (err) {
        console.error('Load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
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
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('admin_theme', next)
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
          {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
        </button>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 680, margin: '32px auto', padding: '0 20px' }}>

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
