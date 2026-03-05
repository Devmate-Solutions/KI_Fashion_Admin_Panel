"use client"

import { useRouter } from "next/navigation"
import { useCallback } from "react"
import SaleReturnFormFrictionless from "@/components/forms/sale-return-form-frictionless"
import BackButton from "@/components/BackButton"

export default function NewSaleReturnPage() {
  const router = useRouter()

  const handleSave = useCallback(() => {
    // Go back to selling page after successful return
    router.push("/selling?tab=1") // Tab 1 is the Sale Returns tab
  }, [router])

  return (
    <div className="mx-auto max-w-[1200px] p-4 pb-8">
      <header className="mb-6">
        <div className="mb-3">
          <BackButton fallbackPath="/selling" label="Back to Selling" />
        </div>
        <h1 className="text-2xl font-bold">Sale Return</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Process customer returns and restore inventory
        </p>
      </header>

      <SaleReturnFormFrictionless onSave={handleSave} />
    </div>
  )
}
