"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { CheckCircle, Loader2 } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase-client"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userType, setUserType] = useState<"user" | "admin">("user")
  const [verificationSuccess, setVerificationSuccess] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  // Check for verification success parameter
  useEffect(() => {
    const verified = searchParams.get("verified")
    if (verified === "true") {
      setVerificationSuccess(true)
    }
  }, [searchParams])

  // Check for existing session
  useEffect(() => {
    const checkSession = async () => {
      try {
        setCheckingSession(true)

        // Check if admin is already logged in via localStorage
        if (typeof window !== "undefined" && localStorage.getItem("isAdmin") === "true") {
          console.log("Admin is already logged in, redirecting to /admin")
          router.push("/admin")
          return
        }

        // For regular users, check Supabase session
        const supabase = getSupabaseClient()
        try {
          const { data, error } = await supabase.auth.getSession()

          if (error) {
            console.error("Session error during check:", error)
            setCheckingSession(false)
            return // Stay on login page
          }

          if (data.session) {
            console.log("User is already logged in, redirecting to /")
            router.push("/")
          } else {
            console.log("No active session found")
            setCheckingSession(false)
          }
        } catch (error) {
          console.error("Error checking session:", error)
          setCheckingSession(false)
        }
      } catch (error) {
        console.error("Session check error:", error)
        setCheckingSession(false)
      }
    }

    checkSession()
  }, [router])

  // Handle login with separate flows for admin and regular users
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (userType === "admin") {
        // Admin login - completely bypass Supabase auth
        if (username === "admin1" && password === "admin123") {
          // Store admin status in localStorage
          localStorage.setItem("isAdmin", "true")
          localStorage.setItem("adminEmail", username)

          // Set a cookie for server-side checks (middleware)
          document.cookie = `isAdmin=true; path=/; max-age=${60 * 60 * 24 * 7}` // 7 days

          // Redirect to admin page
          router.push("/admin")
          return
        } else {
          throw new Error("Invalid admin credentials")
        }
      } else {
        // Regular user login - use Supabase authentication
        const supabase = getSupabaseClient()

        // First, get the email associated with the username
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, email")
          .eq("username", username)
          .single()

        if (profileError || !profileData) {
          throw new Error("Username not found. Please check your username and try again.")
        }

        // Now sign in with the email and password
        const { data, error } = await supabase.auth.signInWithPassword({
          email: profileData.email,
          password,
        })

        if (error) throw error

        if (data.user) {
          // Check if email is verified for user accounts
          if (!data.user.email_confirmed_at) {
            throw new Error("Please verify your email before logging in. Check your inbox for the verification link.")
          }

          // Store a flag in localStorage to indicate successful login
          localStorage.setItem("userLoggedIn", "true")

          // Redirect to home page
          router.push("/")
          return
        }
      }
    } catch (error: any) {
      console.error("Login error:", error)
      setError(error.message || "Failed to login")
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#5A0D16]">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-white mb-4" />
          <p className="text-white">Checking authentication status...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#5A0D16]">
      <div className="w-[90%] sm:w-[80%] md:w-[70%] max-w-md mx-auto p-6 rounded-3xl bg-[#6D3B3B]">
        <h1 className="text-2xl font-semibold text-white text-center mb-6">Login</h1>

        {verificationSuccess && (
          <div className="bg-green-500/20 border border-green-500 text-white p-3 rounded-lg mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
            <p>Your email has been successfully verified. You can now log in.</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-white p-3 rounded-lg mb-4 text-sm">{error}</div>
        )}

        {/* User Type Selection */}
        <div className="flex mb-6 bg-[#5A0D16]/50 rounded-full p-1">
          <button
            className={`flex-1 py-2 rounded-full text-white text-sm font-medium transition-colors ${
              userType === "user" ? "bg-[#8B1F2D]" : "hover:bg-[#8B1F2D]/30"
            }`}
            onClick={() => setUserType("user")}
            type="button"
          >
            User
          </button>
          <button
            className={`flex-1 py-2 rounded-full text-white text-sm font-medium transition-colors ${
              userType === "admin" ? "bg-[#8B1F2D]" : "hover:bg-[#8B1F2D]/30"
            }`}
            onClick={() => setUserType("admin")}
            type="button"
          >
            Admin
          </button>
        </div>

        <form onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-full bg-transparent border border-white/30 text-white placeholder:text-white/70 focus:outline-none focus:border-white/50"
                required
              />
            </div>

            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-full bg-transparent border border-white/30 text-white placeholder:text-white/70 focus:outline-none focus:border-white/50"
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  className="border-white/50 data-[state=checked]:bg-white data-[state=checked]:text-[#5A0D16]"
                />
                <Label htmlFor="remember" className="text-sm text-white cursor-pointer">
                  Remember Me
                </Label>
              </div>

              <Link href="/forgot-password" className="text-sm text-white hover:underline">
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-full bg-white hover:bg-gray-100 text-[#000000] font-medium transition-colors font-markazi text-[20px]"
            >
              {loading ? (
                <>
                  <Loader2 className="inline mr-2 h-5 w-5 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </button>
          </div>
        </form>

        <div className="mt-4 text-center text-sm text-white">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="hover:underline">
            Register
          </Link>
        </div>
      </div>
    </div>
  )
}
