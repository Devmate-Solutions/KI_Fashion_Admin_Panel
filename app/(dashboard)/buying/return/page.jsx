"use client"

import { useRouter } from "next/navigation"
import { useCallback } from "react"
import BuyingReturnForm from "@/components/forms/buying-return-form"

export default function NewBuyingReturnPage() {
  const router = useRouter()

  const handleSave = useCallback((payload) => {
    // TODO: replace with API call to create buying return record
    console.log("Saved buying return:", payload)
    // Navigate back to buying list
    router.push("/buying")
  }, [router])

  return (
    <div className="mx-auto max-w-[1200px] p-4">
      <header className="mb-6">
        <h1 className="text-lg font-semibold">New Buying Return</h1>
        <p className="text-sm text-muted-foreground">Create a new buying return entry.</p>
      </header>

      <BuyingReturnForm onSave={handleSave} />
    </div>
  )
}
