"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the main room reservation page
    router.push("/")
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#5A0D16] text-white">
      <div className="flex flex-col items-center">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p>Redirecting to room reservation...</p>
      </div>
    </div>
  )
}
