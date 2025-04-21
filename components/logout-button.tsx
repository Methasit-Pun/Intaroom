"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { LogOut, Loader2 } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { supabaseUrl, supabaseAnonKey } from "@/app/env"
// Import the utility function
import { handleLogout as handleLogoutUtil } from "@/lib/auth-utils"

interface LogoutButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  className?: string
  showTextOnMobile?: boolean
}

export default function LogoutButton({
  variant = "outline",
  className = "",
  showTextOnMobile = true,
}: LogoutButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Initialize Supabase client
  const supabase = createClientComponentClient({
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
  })

  // Replace the handleLogout function with:
  const handleLogout = async () => {
    setLoading(true)
    try {
      await handleLogoutUtil(supabase, router)
      // In the handleLogout function, update the redirect path:
      if (router) {
        router.push("/login")
      } else if (typeof window !== "undefined") {
        window.location.href = "/login"
      }
    } catch (error) {
      console.error("Error signing out:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant={variant} className={className} onClick={handleLogout} disabled={loading}>
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          <span className={showTextOnMobile ? "" : "hidden sm:inline"}>Logging out...</span>
        </>
      ) : (
        <>
          <LogOut className="h-4 w-4 mr-2 sm:mr-2" />
          <span className={showTextOnMobile ? "" : "hidden sm:inline"}>Logout</span>
        </>
      )}
    </Button>
  )
}
