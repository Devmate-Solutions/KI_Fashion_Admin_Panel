"use client"

import { useRouter } from "next/navigation"
import { useCallback } from "react"
import BuyingReturnFormFrictionless from "@/components/forms/buying-return-form-frictionless"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NewBuyingReturnPage() {
  const router = useRouter()

  const handleSave = useCallback(() => {
    // Refresh the page to start a new return
    router.refresh()
  }, [router])

  return (
    <div className="mx-auto max-w-[1200px] p-4 pb-8">
      <header className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/buying")}
          className="mb-3"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Buying
        </Button>
        <h1 className="text-2xl font-bold">Buying Return</h1>
        
      </header>

      <BuyingReturnFormFrictionless onSave={handleSave} />
    </div>
  )
}
