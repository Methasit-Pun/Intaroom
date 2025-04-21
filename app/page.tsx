"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to login page
    router.push("/login")
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#5A0D16] text-white">
      <div className="flex flex-col items-center">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p>Redirecting to login...</p>
      </div>
    </div>
  )
}
