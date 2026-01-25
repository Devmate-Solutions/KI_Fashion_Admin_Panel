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
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-slate-100/80 transition-shadow duration-300">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <div className="h-14 sm:h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-8 min-w-0 flex-1">
            <Link href="/home" className="flex items-center gap-2 group min-w-0 flex-shrink-0">
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200 group-hover:scale-105 transition-transform flex-shrink-0">
                <span className="font-black text-xs">KI</span>
              </div>
              <span className="text-sm sm:text-base font-black tracking-tighter text-slate-900 group-hover:text-blue-600 transition-colors hidden sm:inline">FASHION CRM</span>
            </Link>

            {/* Global Search Placeholder - Hidden on mobile to save space */}
            <div className="hidden lg:flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100/50 w-64 group focus-within:ring-2 focus-within:ring-blue-100 focus-within:bg-white transition-all">
              <Search className="h-4 w-4 text-slate-400 group-focus-within:text-blue-500 flex-shrink-0" />
              <input 
                type="text" 
                placeholder="Search command..." 
                className="bg-transparent border-none text-xs font-bold text-slate-600 focus:outline-none placeholder:text-slate-400 w-full min-w-0"
              />
            </div>
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
