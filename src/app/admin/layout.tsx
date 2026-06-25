'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const t = {
  light: {
    bg:           '#f9fafb',   // page background
    surface:      '#ffffff',   // cards, tables, panels
    surfaceAlt:   '#f3f4f6',   // table row alt, secondary surface
    border:       '#e5e7eb',   // all borders
    text:         '#111111',   // primary text
    textSub:      '#6b7280',   // secondary / muted text
    sidebarBg:    '#1f2937',   // sidebar stays dark in light mode
    sidebarText:  '#ffffff',
  },
  dark: {
    bg:           '#000000',   // page background — pure black
    surface:      '#111111',   // cards, tables — near black
    surfaceAlt:   '#1a1a1a',   // table row alt
    border:       '#2a2a2a',   // subtle borders
    text:         '#ffffff',   // all primary text — white
    textSub:      '#9ca3af',   // secondary text — light grey
    sidebarBg:    '#0a0a0a',   // sidebar — darker black
    sidebarText:  '#ffffff',
  }
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const supabase = createClient()
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('admin_theme') as 'light' | 'dark') || 'light'
    }
    return 'light'
  })

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_theme', next)
    }
  }

  useEffect(() => {
    document.body.style.background = theme === 'dark' ? '#000000' : '#f9fafb'
    document.body.style.color = theme === 'dark' ? '#ffffff' : '#111111'
  }, [theme])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const c = t[theme]

  return (
    <div style={{
        minHeight: '100vh',
        background: c.bg,
        color: c.text,
        fontFamily: 'Arial, sans-serif',
        transition: 'background 0.2s, color 0.2s',
        display: 'flex'
      }}>
        <style>{`
          /* Hide global AppShell sidebar */
          aside.md\\:flex.md\\:fixed, div.md\\:hidden.fixed.top-0 { display: none !important; }
          .md\\:ml-64 { margin-left: 0 !important; }

          /* Cards and Panels */
          .rounded-xl.border.bg-card.text-card-foreground {
            background: ${c.surface} !important;
            border: 1px solid ${c.border} !important;
            color: ${c.text} !important;
          }
          
          /* Summary cards specifically */
          .grid.grid-cols-2 > .rounded-xl {
            padding: 20px !important;
          }
          .grid.grid-cols-2 > .rounded-xl p.text-2xl {
            color: ${c.text} !important;
            font-size: 24px !important;
            font-weight: bold !important;
          }
          .grid.grid-cols-2 > .rounded-xl p.text-xs {
            color: ${c.textSub} !important;
            font-size: 13px !important;
          }

          /* Tables */
          .rounded-md.border {
            background: ${c.surface} !important;
            border: 1px solid ${c.border} !important;
            border-radius: 10px !important;
            overflow: hidden !important;
          }
          table { width: 100%; }
          thead tr {
            background: ${c.surfaceAlt} !important;
            color: ${c.textSub} !important;
            font-size: 12px !important;
            font-weight: 600 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.05em !important;
          }
          tbody tr:nth-child(even) { background: ${c.surfaceAlt} !important; }
          tbody tr:nth-child(odd) { background: ${c.surface} !important; }
          tbody tr {
            color: ${c.text} !important;
            border-bottom: 1px solid ${c.border} !important;
          }
          tbody td { color: ${c.text} !important; }

          /* Status badges */
          /* Sent badge */
          tbody td span[style*="background: rgb(220, 252, 231)"],
          tbody td span[style*="background:#dcfce7"] {
            background: ${theme === 'dark' ? '#14532d' : '#dcfce7'} !important;
            color: ${theme === 'dark' ? '#86efac' : '#166534'} !important;
          }
          /* Not sent badge */
          tbody td span[style*="background: rgb(243, 244, 246)"],
          tbody td span[style*="background:#f3f4f6"] {
            background: ${theme === 'dark' ? '#1a1a1a' : '#f3f4f6'} !important;
            color: ${theme === 'dark' ? '#9ca3af' : '#666'} !important;
          }
          /* Send button */
          tbody td button[style*="background: rgb(37, 211, 102)"],
          tbody td button[style*="background:#25d366"] {
            background: #25d366 !important;
            color: white !important;
          }

          /* General text */
          h1, h2, h3, h4, .text-3xl, .CardTitle { color: ${c.text} !important; }
          p.text-muted-foreground, .CardDescription { color: ${c.textSub} !important; }
          .bg-background { background: transparent !important; }
          
          /* Form Elements */
          input, select {
            background: ${c.surface} !important;
            color: ${c.text} !important;
            border: 1px solid ${c.border} !important;
          }
        `}</style>

        {/* Collapsed Sidebar */}
        <div style={{
          width: 56,
          background: c.sidebarBg,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingBottom: 20,
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          zIndex: 50
        }}>
          <button
            type="button"
            onClick={handleLogout}
            title="Logout"
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              padding: '8px',
              cursor: 'pointer',
              color: c.sidebarText,
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
            }}
          >
            ⏻
          </button>
        </div>

        {/* Main Content Area */}
        <div style={{ marginLeft: 56, flex: 1, position: 'relative' }}>
          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            style={{
              position: 'fixed',
              top: 16,
              right: 20,
              background: c.surface,
              border: '1px solid ' + c.border,
              borderRadius: '20px',
              padding: '6px 14px',
              fontSize: '13px',
              cursor: 'pointer',
              color: c.text,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              zIndex: 100,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>

          {children}
        </div>
      </div>
  )
}
