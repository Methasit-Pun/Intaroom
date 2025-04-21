"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { LogOut, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { getSupabaseClient, clearAuthState } from "@/lib/supabase-client"

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

  const handleLogout = async () => {
    setLoading(true)
    try {
      // Get the Supabase client
      const supabase = getSupabaseClient()

      // Sign out from Supabase
      await supabase.auth.signOut()

      // Clear all auth state
      clearAuthState()

      // Clear cookies
      document.cookie = "isAdmin=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      document.cookie = "userLoggedIn=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"

      // Redirect to login
      window.location.href = "/login"
    } catch (error) {
      console.error("Error signing out:", error)

      // Force redirect even if there's an error
      window.location.href = "/login"
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
