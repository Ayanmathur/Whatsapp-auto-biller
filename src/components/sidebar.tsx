"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const t = {
  light: {
    background: '#f3f4f6', // Greyish
    borderRight: '1px solid #d1d5db',
    text: '#000000', // Dark black text
    iconColor: '#000000',
    activeBackground: '#d1d5db',
    activeColor: '#000000',
    hoverBackground: '#e5e7eb',
  },
  dark: {
    background: '#f3f4f6', // Keep it same to support black text
    borderRight: '1px solid #d1d5db',
    text: '#000000',
    iconColor: '#000000',
    activeBackground: '#d1d5db',
    activeColor: '#000000',
    hoverBackground: '#e5e7eb',
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

function NavContent({ isCollapsed, setIsCollapsed }: { isCollapsed?: boolean, setIsCollapsed?: (val: boolean) => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [username, setUsername] = useState("");
  const [shopName, setShopName] = useState("");
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user?.email) {
        setUsername(data.user.email.replace("@billing.app", ""));
      }
      if (data.user?.id) {
        const { data: clientData } = await supabase
          .from("clients")
          .select("shop_name")
          .eq("user_id", data.user.id)
          .single();
        if (clientData?.shop_name) {
          setShopName(clientData.shop_name);
        }
      }
    });
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const currentTheme = mounted && theme === 'dark' ? 'dark' : 'light';
  const c = t[currentTheme];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: c.background,
      color: c.text,
      transition: 'all 0.3s ease'
    }}>
      {/* Top Header with collapse toggle */}
      <div style={{ padding: isCollapsed ? '24px 10px' : '24px', display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'inherit' }}>
          <div style={{
            display: 'flex', height: '36px', width: '36px', alignItems: 'center', justifyContent: 'center',
            borderRadius: '50%', background: '#2563eb', color: 'white', flexShrink: 0, fontWeight: 'bold'
          }}>
            {shopName ? shopName[0].toUpperCase() : 'B'}
          </div>
          {!isCollapsed && (
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, letterSpacing: '-0.025em', color: '#000000' }}>Billing System</h2>
              <p style={{ fontSize: '12px', margin: 0, color: '#000000' }}>Invoice Manager</p>
            </div>
          )}
        </Link>
        {setIsCollapsed && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: c.iconColor, display: isCollapsed ? 'none' : 'block'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
        )}
      </div>

      {isCollapsed && setIsCollapsed && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: c.iconColor
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </button>
        </div>
      )}

      <div style={{ borderBottom: c.borderRight, width: '100%' }} />

      {/* Navigation */}
      <nav style={{ flex: 1, padding: isCollapsed ? '16px 8px' : '16px', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: isCollapsed ? 'center' : 'stretch' }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.title : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '8px',
                padding: isCollapsed ? '10px' : '10px 12px', fontSize: '14px', fontWeight: 500,
                background: isActive ? c.activeBackground : 'transparent',
                color: isActive ? c.activeColor : c.iconColor,
                textDecoration: 'none',
                transition: 'all 0.2s',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                width: isCollapsed ? '38px' : 'auto',
                height: isCollapsed ? '38px' : 'auto',
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
              <div style={{ flexShrink: 0 }}>{item.icon}</div>
              {!isCollapsed && <span style={{ color: '#000000' }}>{item.title}</span>}
            </Link>
          );
        })}
        {username === "admin" && (
          <Link
            href="/admin"
            title={isCollapsed ? "Admin Panel" : undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '8px',
              padding: isCollapsed ? '10px' : '10px 12px', fontSize: '14px', fontWeight: 500,
              background: pathname.startsWith("/admin") ? c.activeBackground : 'transparent',
              color: pathname.startsWith("/admin") ? c.activeColor : c.iconColor,
              textDecoration: 'none',
              transition: 'all 0.2s',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              width: isCollapsed ? '38px' : 'auto',
              height: isCollapsed ? '38px' : 'auto',
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
            <div style={{ flexShrink: 0 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            {!isCollapsed && <span style={{ color: '#000000' }}>Admin Panel</span>}
          </Link>
        )}
      </nav>

      <div style={{ marginTop: 'auto' }}>
        <div style={{ borderBottom: c.borderRight, width: '100%' }} />
        <div style={{ padding: isCollapsed ? '16px 8px' : '16px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: isCollapsed ? 'center' : 'stretch' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: c.iconColor, padding: isCollapsed ? '0' : '0 8px', justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
            {!isCollapsed && (
              <>
                <div style={{ height: '8px', width: '8px', borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#000000', fontWeight: 'bold' }}>
                  {username || "Loading..."}
                </span>
              </>
            )}
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title="Toggle Theme"
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
                marginLeft: isCollapsed ? '0' : 'auto',
                marginRight: '4px'
              }}
            >
              {mounted && theme === 'dark' ? '☀️' : '🌙'}
            </button>
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
                marginLeft: isCollapsed ? '0' : '0'
              }}
            >
              ⏻
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ isCollapsed, setIsCollapsed }: { isCollapsed?: boolean, setIsCollapsed?: (val: boolean) => void }) {
  return (
    <>
      {/* Desktop Sidebar */}
      <aside 
        className="hidden md:flex md:fixed md:inset-y-0 md:z-50 md:flex-col transition-all duration-300"
        style={{ width: isCollapsed ? '56px' : '256px' }}
      >
        <NavContent isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      </aside>

      {/* Mobile Sidebar */}
      <div className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center border-b bg-[#f3f4f6] px-4 md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="mr-2" style={{ color: '#000000' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="6" y2="6" />
                <line x1="4" x2="20" y1="18" y2="18" />
              </svg>
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <NavContent isCollapsed={false} />
          </SheetContent>
        </Sheet>
        <h1 className="text-lg font-bold" style={{ color: '#000000' }}>Billing System</h1>
      </div>
    </>
  );
}
