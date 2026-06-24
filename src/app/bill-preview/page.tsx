/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function BillPreviewContent() {
  const searchParams = useSearchParams()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      const raw = searchParams.get('data')
      if (!raw) {
        setError('No data in URL. Did you open this page directly?')
        return
      }
      const parsed = JSON.parse(decodeURIComponent(raw))
      setData(parsed)
    } catch (e: any) {
      setError('Failed to parse bill data: ' + e.message)
    }
  }, [searchParams])

  useEffect(() => {
    if (data) {
      const t = setTimeout(() => window.print(), 900)
      return () => clearTimeout(t)
    }
  }, [data])

  if (error) return (
    <div style={{ padding: 40, color: 'red', fontFamily: 'Arial' }}>
      ERROR: {error}
    </div>
  )

  if (!data) return (
    <div style={{ padding: 40, fontFamily: 'Arial', color: '#666' }}>
      Loading bill...
    </div>
  )

  return (
    <>
      {/* Print button — hidden when printing */}
      <div className="no-print" style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        background: 'white', borderBottom: '1px solid #eee',
        padding: '10px 24px', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center',
        zIndex: 1000,
      }}>
        <span style={{ fontSize: 13, color: '#666' }}>
          {data.shopName} — {data.billNumber}
        </span>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={() => window.print()}
            style={{
              background: '#2563eb', color: 'white', border: 'none',
              borderRadius: 8, padding: '8px 18px', fontSize: 13,
              cursor: 'pointer', fontWeight: 500,
            }}
          >
            🖨️ Print
          </button>
          <button
            type="button"
            onClick={() => window.close()}
            style={{
              background: 'white', color: '#555',
              border: '1px solid #ddd', borderRadius: 8,
              padding: '8px 14px', fontSize: 13, cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>

      {/* Bill */}
      <div id="bill-content" style={{
        width: 210, // mm handled by @page
        margin: '64px auto 40px',
        padding: '16mm',
        background: 'white',
        fontFamily: 'Arial, sans-serif',
        fontSize: 13,
        color: '#000',
        maxWidth: 740,
      }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            {data.logoUrl && (
              <img src={data.logoUrl} alt="logo"
                style={{ maxHeight: 60, marginBottom: 8, display: 'block' }} />
            )}
            <div style={{ fontSize: 18, fontWeight: 'bold' }}>
              {data.shopName}
            </div>
            <div style={{ color: '#555', fontSize: 12 }}>
              {data.shopAddress}
            </div>
            {data.gstNumber && (
              <div style={{ color: '#555', fontSize: 12 }}>
                GSTIN: {data.gstNumber}
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 'bold', fontSize: 15 }}>
              {data.billNumber}
            </div>
            <div style={{ color: '#555', fontSize: 12 }}>
              {new Date(data.billDate).toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric'
              })}
            </div>
          </div>
        </div>

        <hr style={{ borderTop: '1.5px solid #ddd', margin: '10px 0' }} />

        {/* Customer */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>Bill To:</div>
          <div>{data.customerName}</div>
          <div style={{ color: '#555', fontSize: 12 }}>
            {data.customerPhone}
          </div>
        </div>

        {/* Items */}
        {data.items && data.items.length > 0 && (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse',
              fontSize: 12, marginBottom: 12 }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  {['#','Item','Qty','Rate','GST%','Amount'].map(h => (
                    <th key={h} style={{
                      padding: '6px 8px',
                      textAlign: h === 'Item' || h === '#' ? 'left' : 'right',
                      borderBottom: '1px solid #ddd',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map((item: any, i: number) => {
                  const amt = Number(item.qty) * Number(item.price || item.rate) *
                    (1 + Number(item.gst_percent || item.gst || 0) / 100)
                  return (
                    <tr key={i} style={{
                      background: i % 2 === 0 ? '#fff' : '#fafafa'
                    }}>
                      <td style={{ padding: '5px 8px' }}>{i + 1}</td>
                      <td style={{ padding: '5px 8px' }}>{item.name}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                        {item.qty}
                      </td>
                      <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                        ₹{Number(item.price || item.rate).toFixed(2)}
                      </td>
                      <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                        {item.gst_percent || item.gst || 0}%
                      </td>
                      <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                        ₹{amt.toFixed(2)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: 200, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                  padding: '3px 0', borderTop: '1px solid #ddd' }}>
                  <span>Subtotal</span>
                  <span>₹{Number(data.subtotal).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                  padding: '3px 0' }}>
                  <span>GST</span>
                  <span>₹{Number(data.gstAmount).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                  padding: '6px 0', borderTop: '2px solid #333',
                  fontWeight: 'bold', fontSize: 15 }}>
                  <span>Total</span>
                  <span>₹{Number(data.total).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', color: '#999', fontSize: 11,
          marginTop: 24, paddingTop: 10, borderTop: '1px solid #eee' }}>
          Thank you for your business!
        </div>
      </div>
    </>
  )
}

export default function BillPreview() {
  return (
    <Suspense fallback={<div style={{ padding: 40, fontFamily: 'Arial' }}>Loading...</div>}>
      <BillPreviewContent />
    </Suspense>
  )
}
