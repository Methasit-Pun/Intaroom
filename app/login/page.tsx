"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { supabaseUrl, supabaseAnonKey } from "@/app/env"
import { CheckCircle, Loader2 } from "lucide-react"
import LineLoginButton from "@/components/line-login-button"
import { useLiff } from "@/components/liff-provider"

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

  // Initialize Supabase client with explicit URL and key
  const supabase = createClientComponentClient({
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
  })

  // Check for verification success parameter
  useEffect(() => {
    const verified = searchParams.get("verified")
    if (verified === "true") {
      setVerificationSuccess(true)
    }
  }, [searchParams])

  // Check if already logged in
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check if admin is already logged in via localStorage
        if (localStorage.getItem("isAdmin") === "true") {
          router.push("/admin")
          return
        }

        // Check if logged in via LINE
        if (isLoggedIn && profile) {
          router.push("/")
          return
        }

        // For regular users, check Supabase session
        const { data } = await supabase.auth.getSession()
        if (data.session) {
          router.push("/")
        }
      } catch (error) {
        console.error("Session check error:", error)
      }
    }

    checkSession()
  }, [router, supabase, isLoggedIn, profile])

  // Handle login with separate flows for admin and regular users
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (userType === "admin") {
        // Admin login - completely bypass Supabase auth
        // Check hardcoded admin credentials
        if (username === "admin1" && password === "admin123") {
          // Store admin status in localStorage
          localStorage.setItem("isAdmin", "true")
          localStorage.setItem("adminEmail", username)

          // Set a cookie for server-side checks (middleware)
          document.cookie = `isAdmin=true; path=/; max-age=${60 * 60 * 24 * 7}` // 7 days

          // Redirect to admin page
          router.push("/admin")
        } else {
          throw new Error("Invalid admin credentials")
        }
      } else {
        // Regular user login - first check if input is an email or username
        let email = username

        // If username doesn't contain @ symbol, look up the email by username
        if (!username.includes("@")) {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("email")
            .eq("username", username)
            .single()

          if (profileError || !profileData) {
            throw new Error("Username not found")
          }

          email = profileData.email
        }

        // Now login with the email
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        })

        if (error) throw error

        if (data.user) {
          // Check if email is verified for user accounts
          if (!data.user.email_confirmed_at) {
            throw new Error("Please verify your email before logging in. Check your inbox for the verification link.")
          }

          // Regular user
          router.push("/")
        }
      }
    } catch (error: any) {
      setError(error.message || "Failed to login")
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

        {userType === "user" && (
          <div className="mb-6">
            <LineLoginButton />
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[#6D3B3B] px-2 text-white/60">or continue with</span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <input
                type="text"
                placeholder={userType === "admin" ? "Admin Username" : "Username or Email"}
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

            {/* Updated login button with black text and font size 20 */}
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
