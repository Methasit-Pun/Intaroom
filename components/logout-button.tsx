"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { LogOut, Loader2 } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { supabaseUrl, supabaseAnonKey } from "@/app/env"
import { useLiff } from "@/components/liff-provider"

interface LogoutButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  className?: string
}

export default function LogoutButton({ variant = "outline", className = "" }: LogoutButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { logout: liffLogout, isLoggedIn: isLiffLoggedIn } = useLiff()

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

      // Logout from LINE if logged in via LIFF
      if (isLiffLoggedIn) {
        liffLogout()
      }

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
    <Button variant={variant} className={className} onClick={handleLogout} disabled={loading}>
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Logging out...
        </>
      ) : (
        <>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </>
      )}
    </Button>
  )
}
