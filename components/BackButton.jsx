"use client"

import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNavigationHistory } from "@/lib/providers/NavigationHistoryProvider"

export default function BackButton({ fallbackPath, label = "Back" }) {
  const { goBack } = useNavigationHistory()

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => goBack(fallbackPath)}
      className="gap-1"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Button>
  )
}
