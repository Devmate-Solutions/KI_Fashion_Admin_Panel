"use client"

import { useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { UserMenu } from "./auth/UserMenu"
import { useAuthStore } from '@/store/store';


import { Search } from "lucide-react"

export default function TopBar() {
    const { loadUser } = useAuthStore();

  // Load user on mount - instant from token, then background refresh
  useEffect(() => {
    loadUser(); // Uses hybrid approach automatically
  }, [loadUser]);

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100/80">
      <div className="mx-auto max-w-[1600px] px-8">
        <div className="h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/home" className="flex items-center gap-2 group">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200 group-hover:scale-105 transition-transform">
                <span className="font-black text-xs">KI</span>
              </div>
              <span className="text-base font-black tracking-tighter text-slate-900 group-hover:text-blue-600 transition-colors">FASHION CRM</span>
            </Link>

            {/* Global Search Placeholder */}
            <div className="hidden md:flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100/50 w-64 group focus-within:ring-2 focus-within:ring-blue-100 focus-within:bg-white transition-all">
              <Search className="h-4 w-4 text-slate-400 group-focus-within:text-blue-500" />
              <input 
                type="text" 
                placeholder="Search command..." 
                className="bg-transparent border-none text-xs font-bold text-slate-600 focus:outline-none placeholder:text-slate-400 w-full"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <UserMenu />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
