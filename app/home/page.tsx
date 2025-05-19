"use client"

import { useState, useEffect } from "react"
import RoomReservation from "@/components/room-reservation"
import { isAuthenticatedFast } from "@/lib/supabase-client"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function HomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  // Check authentication on page load - with simplified approach
  useEffect(() => {
    // Fast check using localStorage only
    const isAuth = isAuthenticatedFast()

    if (!isAuth) {
      console.log("User not authenticated, redirecting to login")
      router.push("/login")
      return
    }

    // User is authenticated, show the page
    setLoading(false)
  }, [router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#5A0D16]">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-white mb-4" />
          <p className="text-white">Loading room reservation...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen">
      <RoomReservation />
    </main>
  )
}
