"use client"

import { useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { UserMenu } from "./auth/UserMenu"
import { useAuthStore } from '@/store/store';
import { Menu } from "lucide-react"
import { useState } from "react"

import { Search } from "lucide-react"

export default function TopBar() {
    const { loadUser } = useAuthStore();

  // Load user on mount - instant from token, then background refresh
  useEffect(() => {
    loadUser(); // Uses hybrid approach automatically
  }, [loadUser]);

  const handleMenuClick = () => {
    // Dispatch custom event to open sidebar
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-sidebar'));
    }
  };

  return (
    <header className="shrink-0 z-30 bg-white/95 backdrop-blur-xl border-b border-slate-100/80 transition-shadow duration-300">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <div className="h-14 sm:h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-8 min-w-0 flex-1">
            <Link href="/home" className="flex items-center gap-2 group min-w-0 flex-shrink-0">
              <Image src="/ki-logo.png" alt="KI Fashion" width={120} height={20} priority />
            </Link>

            
          </div>

          <div className="flex items-center gap-3 sm:gap-6 flex-shrink-0">
            {/* Mobile Menu Button - Right Side */}
            <button
              type="button"
              onClick={handleMenuClick}
              className="md:hidden h-10 w-10 flex items-center justify-center rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 transition-all active:scale-95"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  )
}
