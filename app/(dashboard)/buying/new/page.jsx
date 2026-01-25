"use client"

import { useRouter } from "next/navigation"
import { useCallback } from "react"
import toast from "react-hot-toast"
import BuyingForm from "@/components/forms/buying-form"
import { Package } from "lucide-react"

export default function NewBuyingPage() {
  const router = useRouter()

  const handleSave = useCallback((purchaseData) => {
    // Success! Show notification and navigate back
    toast.success(`Purchase created successfully! ID: ${purchaseData.id || 'N/A'}`, {
      duration: 4000,
      position: 'top-right',
    })

    // Navigate back to buying list after short delay
    setTimeout(() => {
      router.push("/buying")
    }, 500)
  }, [router])

  return (
    <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
      {/* Enhanced Header */}
      <header className="bg-card border border-border rounded-lg p-6 shadow-sm mb-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Package className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">New Buying</h1>
            <p className="text-sm text-muted-foreground mt-1">Create a new buying entry with products and payments.</p>
          </div>
        </div>
      </header>

      <BuyingForm onSave={handleSave} />
    </div>
  )
}
