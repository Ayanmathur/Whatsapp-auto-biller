"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const t = {
  light: {
    background: '#ffffff',
    borderRight: '1px solid #e5e7eb',
    text: '#374151',
    iconColor: '#6b7280',
    activeBackground: '#eff6ff',
    activeColor: '#2563eb',
    hoverBackground: '#f9fafb',
  },
  dark: {
    background: '#111111',
    borderRight: '1px solid #2a2a2a',
    text: '#ffffff',
    iconColor: '#9ca3af',
    activeBackground: '#1e3a5f',
    activeColor: '#60a5fa',
    hoverBackground: '#1a1a1a',
  }
};

const navItems = [
  {
    title: "New Bill",
    href: "/",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6" />
        <path d="M12 18v-6" />
        <path d="M9 15h6" />
      </svg>
    ),
  },
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="7" height="9" x="3" y="3" rx="1" />
        <rect width="7" height="5" x="14" y="3" rx="1" />
        <rect width="7" height="9" x="14" y="12" rx="1" />
        <rect width="7" height="5" x="3" y="16" rx="1" />
      </svg>
    ),
  },
  {
    title: "Bill History",
    href: "/history",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    title: "Bulk Message",
    href: "/bulk-message",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 2L11 13" />
        <path d="M22 2l-7 20-4-9-9-4 20-7z" />
      </svg>
    ),
  },
  {
    title: "Settings",
    href: "/settings",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
];

function NavContent() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [username, setUsername] = useState("");
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('client_theme') as 'light' | 'dark';
      if (stored) setTheme(stored);
    }
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) {
        setUsername(data.user.email.replace("@billing.app", ""));
      }
    });
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const c = t[theme];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: c.background,
      color: c.text,
      transition: 'background 0.2s, color 0.2s'
    }}>
      {/* Logo/Brand */}
      <div style={{ padding: '24px' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'inherit' }}>
          <div style={{
            display: 'flex', height: '36px', width: '36px', alignItems: 'center', justifyContent: 'center',
            borderRadius: '8px', background: '#2563eb', color: 'white', flexShrink: 0
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
              <path d="M13 5v2" />
              <path d="M13 17v2" />
              <path d="M13 11v2" />
            </svg>
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, letterSpacing: '-0.025em' }}>Billing System</h2>
            <p style={{ fontSize: '12px', margin: 0, color: c.iconColor }}>Invoice Manager</p>
          </div>
        </Link>
      </div>

      <div style={{ borderBottom: c.borderRight, width: '100%' }} />

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '8px',
                padding: '10px 12px', fontSize: '14px', fontWeight: 500,
                background: isActive ? c.activeBackground : 'transparent',
                color: isActive ? c.activeColor : c.iconColor,
                textDecoration: 'none',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = c.hoverBackground;
                  e.currentTarget.style.color = c.text;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = c.iconColor;
                }
              }}
            >
              {item.icon}
              {item.title}
            </Link>
          );
        })}
        {username === "admin" && (
          <Link
            href="/admin"
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '8px',
              padding: '10px 12px', fontSize: '14px', fontWeight: 500,
              background: pathname.startsWith("/admin") ? c.activeBackground : 'transparent',
              color: pathname.startsWith("/admin") ? c.activeColor : c.iconColor,
              textDecoration: 'none',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (!pathname.startsWith("/admin")) {
                e.currentTarget.style.background = c.hoverBackground;
                e.currentTarget.style.color = c.text;
              }
            }}
            onMouseLeave={(e) => {
              if (!pathname.startsWith("/admin")) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = c.iconColor;
              }
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Admin Panel
          </Link>
        )}
      </nav>

      <div style={{ marginTop: 'auto' }}>
        <div style={{ borderBottom: c.borderRight, width: '100%' }} />
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: c.iconColor, padding: '0 8px' }}>
            <div style={{ height: '8px', width: '8px', borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {username || "Loading..."}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              title="Logout"
              style={{
                background: 'transparent',
                border: '1px solid ' + c.iconColor,
                borderRadius: '6px',
                padding: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                color: c.text,
                marginLeft: 'auto'
              }}
            >
              ⏻
            </button>
          </div>
        </div>
      </div>

      <div style={{ borderBottom: c.borderRight, width: '100%' }} />

      {/* Footer */}
      <div style={{ padding: '16px' }}>
        <p style={{ fontSize: '12px', color: c.iconColor, textAlign: 'center', margin: 0 }}>
          Billing System v0.1.0
        </p>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:fixed md:inset-y-0 md:z-50 md:w-64 md:flex-col border-r border-[#e5e7eb] dark:border-[#2a2a2a] bg-card">
        <NavContent />
      </aside>

      {/* Mobile Sidebar */}
      <div className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center border-b bg-card px-4 md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="6" y2="6" />
                <line x1="4" x2="20" y1="18" y2="18" />
              </svg>
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <NavContent />
          </SheetContent>
        </Sheet>
        <h1 className="text-lg font-bold">Billing System</h1>
      </div>
    </>
  );
}
