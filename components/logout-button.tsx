"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { LogOut, Loader2 } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { supabaseUrl, supabaseAnonKey } from "@/app/env"

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

  const handleLogout = async () => {
    setLoading(true)
    try {
      // Clear admin-related localStorage items
      localStorage.removeItem("isAdmin")
      localStorage.removeItem("adminEmail")

      // Clear admin cookie
      document.cookie = "isAdmin=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"

      // Sign out from Supabase (for regular users)
      await supabase.auth.signOut()

      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant={variant} className={className} onClick={handleLogout} disabled={loading} title="Logout">
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 md:mr-2" />
          <span className={showTextOnMobile ? "" : "hidden md:inline"}>Logging out...</span>
        </>
      ) : (
        <>
          <LogOut className="h-4 w-4 md:mr-2" />
          <span className={showTextOnMobile ? "" : "hidden md:inline"}>Logout</span>
        </>
      )}
    </Button>
  )
}
