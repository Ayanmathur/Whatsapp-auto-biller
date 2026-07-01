"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/sidebar"

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const isLogin = pathname === "/login"

  if (isLogin) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      <div 
        className={`flex-1 transition-all duration-300 pt-14 md:pt-0 ml-0 ${
          isCollapsed ? 'md:ml-14' : 'md:ml-64'
        }`}
      >
        {children}
      </div>
    </div>
  )
}
