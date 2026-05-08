"use client"

import { useRouter } from "next/navigation"
import { useCallback, useState } from "react"
import toast from "react-hot-toast"
import BuyingForm from "@/components/forms/buying-form"
import BackButton from "@/components/BackButton"
import { Package } from "lucide-react"
import BarcodePrintModal from "@/components/modals/BarcodePrintModal"

export default function NewBuyingPage() {
  const router = useRouter()
  const [showBarcodePrintModal, setShowBarcodePrintModal] = useState(false)
  const [isPostCreatePrint, setIsPostCreatePrint] = useState(false)
  const [dispatchOrderId, setDispatchOrderId] = useState(null)

  const handleSave = useCallback((purchaseData) => {
    const createdId = purchaseData?._id || purchaseData?.id || null

    // Success! Show notification and navigate back
    toast.success(`Purchase created successfully! ID: ${createdId || "N/A"}`, {
      duration: 4000,
      position: 'top-right',
    })

    if (createdId) {
      setDispatchOrderId(String(createdId))
      setIsPostCreatePrint(true)
      setShowBarcodePrintModal(true)
      return
    }

    // Navigate back to buying list after short delay (fallback)
    setTimeout(() => {
      router.push("/buying")
    }, 500)
  }, [router])

  return (
    <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
      {/* Enhanced Header */}
      <header className="bg-card border border-border rounded-lg p-6 shadow-sm mb-6">
        <div className="flex items-center gap-4 mb-4">
          <BackButton fallbackPath="/buying" label="Back to Buying" />
        </div>
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

      <BarcodePrintModal
        open={showBarcodePrintModal}
        onClose={() => {
          setShowBarcodePrintModal(false)
          setIsPostCreatePrint(false)
          setDispatchOrderId(null)
          router.push("/buying")
        }}
        dispatchOrderId={dispatchOrderId}
        autoPrint={isPostCreatePrint}
      />
    </div>
  )
}
