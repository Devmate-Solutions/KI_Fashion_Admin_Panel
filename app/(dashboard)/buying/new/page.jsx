"use client"

import { useRouter } from "next/navigation"
import { useCallback } from "react"
import toast from "react-hot-toast"
import BuyingForm from "@/components/forms/buying-form"

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
    <div className="mx-auto max-w-[1200px] p-4">
      <header className="mb-6">
        <h1 className="text-lg font-semibold">New Buying</h1>
        <p className="text-sm text-muted-foreground">Create a new buying entry with products and payments.</p>
      </header>

      <BuyingForm onSave={handleSave} />
    </div>
  )
}
