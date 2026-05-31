"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { supabaseUrl, supabaseAnonKey } from "@/app/env"
import { CheckCircle, Loader2, AlertCircle } from "lucide-react"
import { useLiff } from "@/components/liff-provider"

const supabase = createClientComponentClient({ supabaseUrl, supabaseKey: supabaseAnonKey })

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
  const { isLoggedIn, profile } = useLiff()

  useEffect(() => {
    const verified = searchParams.get("verified")
    if (verified === "true") {
      setVerificationSuccess(true)
    }
  }, [searchParams])

  // Check auth state only once on mount
  useEffect(() => {
    let isMounted = true

    const checkAuthState = async () => {
      try {
        try {
          const adminRes = await fetch("/api/admin/verify")
          if (adminRes.ok) {
            if (isMounted) router.push("/admin")
            return
          }
        } catch {
          // No admin session — continue
        }

        if (isLoggedIn && profile) {
          try {
            const { data: userProfile } = await supabase
              .from("profiles")
              .select("full_name, telephone")
              .eq("line_user_id", profile.userId)
              .single()

            if (userProfile?.full_name && userProfile?.telephone) {
              if (isMounted) router.push("/")
            } else {
              if (isMounted) router.push("/profile?setup=true")
            }
          } catch {
            if (isMounted) router.push("/profile?setup=true")
          }
          return
        }

        const { data } = await supabase.auth.getSession()
        if (data.session) {
          const remembered = localStorage.getItem("rememberMe")
          const sessionActive = sessionStorage.getItem("sessionActive")
          if (!remembered && !sessionActive) {
            await supabase.auth.signOut()
            return
          }
          sessionStorage.setItem("sessionActive", "true")
          if (isMounted) router.push("/")
        }
      } catch {
        // Silently ignore auth check errors on mount
      }
    }

    const timeoutId = setTimeout(checkAuthState, 100)

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const loginTimeout = setTimeout(() => {
      setLoading(false)
      setError("Login is taking too long. Please try again.")
    }, 30000)

    try {
      if (userType === "admin") {
        const res = await fetch("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        })

        if (!res.ok) throw new Error("Invalid admin credentials")

        clearTimeout(loginTimeout)
        router.push("/admin")
        return
      }

      let email = username
      let userProfile = null

      if (!username.includes("@")) {
        try {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("email, id, full_name, username")
            .eq("username", username)
            .single()

          if (profileError) {
            if (profileError.code === "PGRST116") {
              throw new Error("Username not found. Please check your username or register a new account.")
            }
            throw new Error(`Profile lookup failed: ${profileError.message}`)
          }

          if (!profileData) {
            throw new Error("Username not found. Please check your username or register a new account.")
          }

          email = profileData.email
          userProfile = profileData
        } catch (lookupError: unknown) {
          throw lookupError
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          throw new Error("Invalid username or password. Please check your credentials and try again.")
        } else if (error.message.includes("Email not confirmed")) {
          throw new Error("Please verify your email before logging in. Check your inbox for the verification link.")
        }
        throw new Error(`Authentication failed: ${error.message}`)
      }

      if (!data.user) {
        throw new Error("Login failed. No user data received from authentication service.")
      }

      if (!data.user.email_confirmed_at) {
        await supabase.auth.signOut()
        throw new Error("Please verify your email before logging in. Check your inbox for the verification link.")
      }

      void userProfile // profile data is available from the session if needed

      if (rememberMe) {
        localStorage.setItem("rememberMe", "true")
      } else {
        localStorage.removeItem("rememberMe")
      }
      sessionStorage.setItem("sessionActive", "true")

      clearTimeout(loginTimeout)
      router.push("/")
    } catch (error) {
      clearTimeout(loginTimeout)
      setError(error instanceof Error ? error.message : "Failed to login. Please try again.")
    } finally {
      setLoading(false)
    }
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
          <div className="bg-red-500/20 border border-red-500 text-white p-3 rounded-lg mb-4 text-sm flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Login Failed</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* User Type Selection */}
        <div className="flex mb-6 bg-[#5A0D16]/50 rounded-full p-1">
          <button
            className={`flex-1 py-2 rounded-full text-white text-sm font-medium transition-colors ${
              userType === "user" ? "bg-[#8B1F2D]" : "hover:bg-[#8B1F2D]/30"
            }`}
            onClick={() => setUserType("user")}
            type="button"
            suppressHydrationWarning
          >
            User
          </button>
          <button
            className={`flex-1 py-2 rounded-full text-white text-sm font-medium transition-colors ${
              userType === "admin" ? "bg-[#8B1F2D]" : "hover:bg-[#8B1F2D]/30"
            }`}
            onClick={() => setUserType("admin")}
            type="button"
            suppressHydrationWarning
          >
            Admin
          </button>
        </div>

        <form onSubmit={handleLogin}>
          <div className="space-y-4">
            <input
              type="text"
              placeholder={userType === "admin" ? "Admin Username" : "Username or Email"}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-full bg-transparent border border-white/30 text-white placeholder:text-white/70 focus:outline-none focus:border-white/50"
              required
              disabled={loading}
              suppressHydrationWarning
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-full bg-transparent border border-white/30 text-white placeholder:text-white/70 focus:outline-none focus:border-white/50"
              required
              disabled={loading}
              suppressHydrationWarning
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  className="border-white/50 data-[state=checked]:bg-white data-[state=checked]:text-[#5A0D16]"
                  disabled={loading}
                  suppressHydrationWarning
                />
                <Label htmlFor="remember" className="text-sm text-white cursor-pointer">
                  Remember Me
                </Label>
              </div>

              {userType === "user" && (
                <Link href="/forgot-password" className="text-sm text-white hover:underline">
                  Forgot Password?
                </Link>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-full bg-white hover:bg-gray-100 text-[#000000] font-medium transition-colors font-markazi text-[20px] disabled:opacity-50 disabled:cursor-not-allowed"
              suppressHydrationWarning
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

        {userType === "user" && (
          <div className="mt-4 text-center text-sm text-white">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="hover:underline">
              Register
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
