"use client"

import { useRouter } from "next/navigation"
import { useCallback } from "react"
import BuyingReturnFormFrictionless from "@/components/forms/buying-return-form-frictionless"
import BackButton from "@/components/BackButton"

export default function NewBuyingReturnPage() {
  const router = useRouter()

  const handleSave = useCallback(() => {
    // Refresh the page to start a new return
    router.refresh()
  }, [router])

  return (
    <div className="mx-auto max-w-[1200px] p-4 pb-8">
      <header className="mb-6">
        <div className="mb-3">
          <BackButton fallbackPath="/buying" label="Back to Buying" />
        </div>
        <h1 className="text-2xl font-bold">Buying Return</h1>
        
      </header>

      <BuyingReturnFormFrictionless onSave={handleSave} />
    </div>
  )
}
