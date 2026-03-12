"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { useCallback } from "react"
import toast from "react-hot-toast"
import SaleForm from "@/components/forms/sale-form"
import BackButton from "@/components/BackButton"
import { useSale } from "@/lib/hooks/useSales"
import { Loader2 } from "lucide-react"

export default function EditSellingPage({ params }) {
  const router = useRouter()
  const { id } = use(params)

  const { data: saleResponse, isLoading } = useSale(id)
  const sale = saleResponse?.data || saleResponse

  const handleSave = useCallback(() => {
    toast.success("Sale updated successfully!", {
      duration: 4000,
      position: "top-right",
    })
    setTimeout(() => {
      router.push("/selling")
    }, 500)
  }, [router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!sale) {
    return (
      <div className="space-y-6 p-6">
        <BackButton fallbackPath="/selling" label="Back to Selling" />
        <p className="text-muted-foreground">Sale not found.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1200px] p-4">
      <header className="mb-6">
        <div className="mb-3">
          <BackButton fallbackPath="/selling" label="Back to Selling" />
        </div>
        <h1 className="text-lg font-semibold">Edit Sale</h1>
        <p className="text-sm text-muted-foreground">
          {sale.saleNumber || `#${String(sale._id).slice(-6)}`}
          {sale.buyer?.name ? ` · ${sale.buyer.name}` : sale.manualCustomer?.name ? ` · ${sale.manualCustomer.name}` : ""}
        </p>
      </header>

      <SaleForm onSave={handleSave} initialData={sale} saleId={id} />
    </div>
  )
}
