"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";



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

  useEffect(() => {
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

  return (
    <div className="flex flex-col h-full bg-card text-card-foreground border-r transition-all duration-300">
      {/* Top Header with collapse toggle */}
      <div className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        <Link href="/" className="flex items-center gap-2 text-inherit no-underline">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
              <path d="M13 5v2" />
              <path d="M13 17v2" />
              <path d="M13 11v2" />
            </svg>
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden whitespace-nowrap">
              <h2 className="text-lg font-bold m-0 tracking-tight">Bill Door</h2>
              <p className="text-xs m-0 text-muted-foreground">Invoice & Billing</p>
            </div>
          )}
        </Link>
        {setIsCollapsed && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`bg-transparent border-none cursor-pointer text-muted-foreground hover:text-foreground ${isCollapsed ? 'hidden' : 'block'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
        )}
      </div>

      {isCollapsed && setIsCollapsed && (
        <div className="flex justify-center mb-4">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="bg-transparent border-none cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </button>
        </div>
      )}

      <div className="w-full border-b" />

      {/* Navigation */}
      <nav className={`flex-1 flex flex-col gap-1 p-4 ${isCollapsed ? 'items-center px-2' : 'items-stretch'}`}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.title : undefined}
              className={`flex items-center gap-3 rounded-lg text-sm font-medium no-underline transition-all duration-200
                ${isCollapsed ? 'justify-center p-2.5 w-10 h-10' : 'justify-start px-3 py-2.5'}
                ${isActive ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}
              `}
            >
              <div className="shrink-0">{item.icon}</div>
              {!isCollapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
        {username === "admin" && (
          <Link
            href="/admin"
            title={isCollapsed ? "Admin Panel" : undefined}
            className={`flex items-center gap-3 rounded-lg text-sm font-medium no-underline transition-all duration-200
              ${isCollapsed ? 'justify-center p-2.5 w-10 h-10' : 'justify-start px-3 py-2.5'}
              ${pathname.startsWith("/admin") ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}
            `}
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

      {/* User Info / Logout / Theme */}
      <div className={`p-4 border-t flex flex-col gap-3 ${isCollapsed ? 'items-center' : ''}`}>
        {!isCollapsed && (
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0 font-medium">
              {username ? username[0].toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden whitespace-nowrap">
              <p className="text-sm font-medium m-0">{username || "User"}</p>
              <p className="text-xs text-muted-foreground m-0 truncate">
                {shopName || "Loading..."}
              </p>
            </div>
          </div>
        )}
        <div className={`flex items-center gap-2 ${isCollapsed ? 'flex-col' : 'justify-between'}`}>
          {!isCollapsed && (
            <div className="flex-1">
              {/* Spacer if needed */}
            </div>
          )}

          <button
            type="button"
            onClick={handleLogout}
            title="Logout"
            className="flex items-center justify-center w-8 h-8 rounded-md bg-transparent border border-muted-foreground/30 text-foreground cursor-pointer hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
          >
            ⏻
          </button>
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
      <div className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center border-b bg-background px-4 md:hidden">
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
        <h1 className="text-lg font-bold">Bill Door</h1>
      </div>
    </>
  );
}
