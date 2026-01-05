"use client"

import { useRouter } from "next/navigation"
import { useCallback } from "react"
import toast from "react-hot-toast"
import SaleForm from "@/components/forms/sale-form"

export default function NewSellingPage() {
  const router = useRouter()

  const handleSave = useCallback((saleData) => {
    // Success! Show notification and navigate back
    toast.success(`Sale created successfully! ID: ${saleData.id || saleData._id || 'N/A'}`, {
      duration: 4000,
      position: 'top-right',
    })
    
    // Navigate back to selling list after short delay
    setTimeout(() => {
      router.push("/selling")
    }, 500)
  }, [router])

  return (
    <div className="mx-auto max-w-[1200px] p-4">
      <header className="mb-6">
        <h1 className="text-lg font-semibold">New Selling</h1>
        <p className="text-sm text-muted-foreground">Create a new selling entry with products and payments.</p>
      </header>

      <SaleForm onSave={handleSave} />
    </div>
  )
}

