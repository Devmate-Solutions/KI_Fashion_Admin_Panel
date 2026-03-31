"use client"

import { useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { UserMenu } from "./auth/UserMenu"
import { useAuthStore } from '@/store/store';
import { Menu, Calculator } from "lucide-react"
import { useState } from "react"
import UniversalPaymentDialog from "./modals/UniversalPaymentDialog"

import { Search } from "lucide-react"

export default function TopBar() {
    const { user, loadUser } = useAuthStore();
    const [showUniversalModal, setShowUniversalModal] = useState(false);
    const isSuperAdmin = user?.role === 'super-admin';

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
            {/* Super Admin Universal Payment Trigger */}
            {isSuperAdmin && (
              <button
                onClick={() => setShowUniversalModal(true)}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100 transition-all font-bold text-xs shadow-sm hover:shadow-md active:scale-95"
              >
                <Calculator className="h-4 w-4" />
                <span>LEDGER TOOL</span>
              </button>
            )}

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

      {isSuperAdmin && (
        <UniversalPaymentDialog 
          open={showUniversalModal} 
          onClose={() => setShowUniversalModal(false)} 
        />
      )}
    </header>
  )
}
