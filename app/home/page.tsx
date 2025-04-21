"use client"

import { useState } from "react"

import { useEffect } from "react"
import RoomReservation from "@/components/room-reservation"
import { isUserAuthenticated } from "@/lib/supabase-client"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function HomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  // Check authentication on page load - with reduced frequency
  useEffect(() => {
    // First check localStorage for faster response
    if (typeof window !== "undefined") {
      if (localStorage.getItem("isAdmin") === "true" || localStorage.getItem("userLoggedIn") === "true") {
        console.log("User authenticated via localStorage")
        setLoading(false)
        return
      }
    }

    // Only if localStorage check fails, do a full auth check
    const checkAuth = async () => {
      try {
        const authenticated = await isUserAuthenticated()

        if (!authenticated) {
          // If not authenticated, redirect to login
          console.log("User not authenticated, redirecting to login")
          router.push("/login")
          return
        }

        setLoading(false)
      } catch (error) {
        console.error("Auth check error:", error)
        router.push("/login")
      }
    }

    checkAuth()
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
