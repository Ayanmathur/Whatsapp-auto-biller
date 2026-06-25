'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    shop_name: '',
    shop_address: '',
    gst_number: '',
    bill_size: 'A4',
    whatsapp_message_template: '',
    whatsapp_automation_enabled: false,
    whatsapp_api_token: '',
    whatsapp_phone_number_id: '',
    logo_url: '',
    owner_phone: '',
  })

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from('clients')
          .select('*')
          .limit(1)
          .single()

        if (data) {
          setSettings({
            shop_name: data.shop_name || '',
            shop_address: data.shop_address || '',
            gst_number: data.gst_number || '',
            bill_size: data.bill_size || 'A4',
            whatsapp_message_template: 
              data.whatsapp_message_template || '',
            whatsapp_automation_enabled: 
              data.whatsapp_automation_enabled || false,
            whatsapp_api_token: data.whatsapp_api_token || '',
            whatsapp_phone_number_id: 
              data.whatsapp_phone_number_id || '',
            logo_url: data.logo_url || '',
            owner_phone: data.owner_phone || '',
          })
        }
      } catch (err) {
        console.error('Settings load failed:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const { shop_name, shop_address, gst_number, bill_size,
        whatsapp_message_template, whatsapp_automation_enabled,
        whatsapp_api_token, whatsapp_phone_number_id,
        logo_url, owner_phone } = settings

      const { error } = await supabase
        .from('clients')
        .upsert({
          shop_name,
          shop_address,
          gst_number,
          bill_size,
          whatsapp_message_template,
          whatsapp_automation_enabled,
          whatsapp_api_token,
          whatsapp_phone_number_id,
          logo_url,
          owner_phone,
        })
      if (error) throw error
      alert('Settings saved!')
    } catch (err) {
      console.error('Save failed:', err)
      alert('Save failed: ' + (err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  function update(field: string, value: string | boolean) {
    setSettings(prev => ({ ...prev, [field]: value }))
  }

  if (loading) return (
    <div style={{ padding: 40, fontFamily: 'Arial', color: '#666' }}>
      Loading settings...
    </div>
  )

  return (
    <div style={{ 
      maxWidth: 600, margin: '0 auto', padding: '32px 20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ fontSize: 22, fontWeight: 'bold', 
        marginBottom: 24, color: '#111' }}>
        Settings
      </h1>

      {/* Shop Info */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 15, fontWeight: '600', 
          marginBottom: 16, color: '#374151' }}>
          Shop Information
        </h2>
        
        {[
          { label: 'Shop Name', field: 'shop_name' },
          { label: 'GST Number', field: 'gst_number' },
          { label: 'Owner Phone', field: 'owner_phone' },
        ].map(({ label, field }) => (
          <div key={field} style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13,
              fontWeight: 500, color: '#374151', marginBottom: 5 }}>
              {label}
            </label>
            <input
              type="text"
              value={settings[field as keyof typeof settings] as string}
              onChange={e => update(field, e.target.value)}
              style={{ width: '100%', padding: '9px 12px',
                border: '1px solid #d1d5db', borderRadius: 8,
                fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>
        ))}

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 13,
            fontWeight: 500, color: '#374151', marginBottom: 5 }}>
            Shop Address
          </label>
          <textarea
            value={settings.shop_address}
            onChange={e => update('shop_address', e.target.value)}
            rows={3}
            style={{ width: '100%', padding: '9px 12px',
              border: '1px solid #d1d5db', borderRadius: 8,
              fontSize: 14, boxSizing: 'border-box',
              resize: 'vertical' }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 13,
            fontWeight: 500, color: '#374151', marginBottom: 5 }}>
            Default Bill Size
          </label>
          <select
            value={settings.bill_size}
            onChange={e => update('bill_size', e.target.value)}
            style={{ width: '100%', padding: '9px 12px',
              border: '1px solid #d1d5db', borderRadius: 8,
              fontSize: 14, boxSizing: 'border-box',
              background: 'white' }}
          >
            <option value="A4">A4</option>
            <option value="A5">A5</option>
            <option value="thermal-80mm">Thermal 80mm</option>
            <option value="thermal-58mm">Thermal 58mm</option>
          </select>
        </div>
      </div>

      {/* WhatsApp */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 15, fontWeight: '600',
          marginBottom: 16, color: '#374151' }}>
          WhatsApp Settings
        </h2>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'flex', alignItems: 'center',
            gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.whatsapp_automation_enabled}
              onChange={e => 
                update('whatsapp_automation_enabled', e.target.checked)
              }
              style={{ width: 16, height: 16 }}
            />
            <span style={{ fontSize: 14, fontWeight: 500, 
              color: '#374151' }}>
              Enable WhatsApp Automation
            </span>
          </label>
        </div>

        {settings.whatsapp_automation_enabled && (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13,
                fontWeight: 500, color: '#374151', marginBottom: 5 }}>
                API Token
              </label>
              <input
                type="password"
                value={settings.whatsapp_api_token}
                onChange={e => update('whatsapp_api_token', e.target.value)}
                style={{ width: '100%', padding: '9px 12px',
                  border: '1px solid #d1d5db', borderRadius: 8,
                  fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13,
                fontWeight: 500, color: '#374151', marginBottom: 5 }}>
                Phone Number ID
              </label>
              <input
                type="text"
                value={settings.whatsapp_phone_number_id}
                onChange={e => 
                  update('whatsapp_phone_number_id', e.target.value)
                }
                style={{ width: '100%', padding: '9px 12px',
                  border: '1px solid #d1d5db', borderRadius: 8,
                  fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
          </>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 13,
            fontWeight: 500, color: '#374151', marginBottom: 5 }}>
            Thank You Message Template
          </label>
          <textarea
            value={settings.whatsapp_message_template}
            onChange={e => 
              update('whatsapp_message_template', e.target.value)
            }
            rows={4}
            placeholder="Dear {customer_name}, thank you for visiting {shop_name}!"
            style={{ width: '100%', padding: '9px 12px',
              border: '1px solid #d1d5db', borderRadius: 8,
              fontSize: 14, boxSizing: 'border-box',
              resize: 'vertical' }}
          />
          <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
            Use {'{customer_name}'} and {'{shop_name}'} as placeholders
          </p>
        </div>
      </div>

      {/* Save */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        style={{
          width: '100%', background: saving ? '#93c5fd' : '#2563eb',
          color: 'white', border: 'none', borderRadius: 8,
          padding: '12px', fontSize: 15, fontWeight: 600,
          cursor: saving ? 'not-allowed' : 'pointer'
        }}
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  )
}
