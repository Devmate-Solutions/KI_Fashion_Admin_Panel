"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function SaleReturnsRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to /selling/return
    router.replace("/selling/return")
  }, [router])

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting to Sale Returns...</p>
      </div>
    </div>
  )
}
