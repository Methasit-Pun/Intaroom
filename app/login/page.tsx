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
          // Check if user has completed profile setup
          const { data: userProfile } = await supabase
            .from("profiles")
            .select("full_name, telephone")
            .eq("line_user_id", profile.userId)
            .single()

          if (userProfile && userProfile.full_name && userProfile.telephone) {
            router.push("/")
          } else {
            router.push("/profile?setup=true")
          }
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

    console.log("🔐 Login attempt started:", { username, userType, timestamp: new Date().toISOString() })

    try {
      if (userType === "admin") {
        // Admin login - completely bypass Supabase auth
        if (username === "admin1" && password === "admin123") {
          localStorage.setItem("isAdmin", "true")
          localStorage.setItem("adminEmail", username)
          document.cookie = `isAdmin=true; path=/; max-age=${60 * 60 * 24 * 7}` // 7 days
          console.log("✅ Admin login successful")
          router.push("/admin")
          return
        } else {
          throw new Error("Invalid admin credentials")
        }
      } else {
        // Regular user login
        let email = username
        let userProfile = null

        // If username doesn't contain @ symbol, look up the email by username
        if (!username.includes("@")) {
          console.log("🔍 Looking up email for username:", username)

          try {
            const { data: profileData, error: profileError } = await supabase
              .from("profiles")
              .select("email, id, full_name, username")
              .eq("username", username)
              .single()

            console.log("📊 Profile lookup result:", {
              profileData: profileData ? { ...profileData, email: profileData.email } : null,
              profileError: profileError
                ? {
                    message: profileError.message,
                    code: profileError.code,
                    details: profileError.details,
                  }
                : null,
            })

            if (profileError) {
              console.error("❌ Profile lookup error:", profileError)

              if (profileError.code === "PGRST116") {
                throw new Error("Username not found. Please check your username or register a new account.")
              } else if (profileError.message.includes("permission denied")) {
                throw new Error("Database access error. Please contact support.")
              } else {
                throw new Error(`Profile lookup failed: ${profileError.message}`)
              }
            }

            if (!profileData) {
              throw new Error("Username not found. Please check your username or register a new account.")
            }

            email = profileData.email
            userProfile = profileData
            console.log("✅ Found email for username:", email)
          } catch (lookupError: any) {
            console.error("❌ Username lookup failed:", lookupError)
            throw lookupError
          }
        }

        // Now login with the email
        console.log("🔑 Attempting Supabase authentication with email:", email)

        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
          })

          // Detailed error logging
          console.log("🔐 Supabase auth result:", {
            success: !!data.user,
            userId: data.user?.id,
            userEmail: data.user?.email,
            emailConfirmed: data.user?.email_confirmed_at,
            error: error
              ? {
                  message: error.message,
                  status: error.status,
                  name: error.name,
                }
              : null,
            session: !!data.session,
          })

          if (error) {
            console.error("❌ Supabase authentication error:", {
              message: error.message,
              status: error.status,
              name: error.name,
              stack: error.stack,
            })

            // Provide more specific error messages based on error type
            if (error.message.includes("Invalid login credentials")) {
              throw new Error("Invalid username or password. Please check your credentials and try again.")
            } else if (error.message.includes("Email not confirmed")) {
              throw new Error("Please verify your email before logging in. Check your inbox for the verification link.")
            } else if (error.message.includes("Too many requests")) {
              throw new Error("Too many login attempts. Please wait a few minutes before trying again.")
            } else if (error.message.includes("User not found")) {
              throw new Error("Account not found. Please check your credentials or register a new account.")
            } else if (error.status === 400) {
              throw new Error("Invalid request. Please check your username and password format.")
            } else if (error.status === 422) {
              throw new Error("Invalid email format. Please use a valid email address.")
            } else {
              throw new Error(`Authentication failed: ${error.message}`)
            }
          }

          if (!data.user) {
            throw new Error("Login failed. No user data received from authentication service.")
          }

          console.log("✅ Authentication successful for user:", data.user.id)

          // Check if email is verified for user accounts
          if (!data.user.email_confirmed_at) {
            console.warn("⚠️ User email not confirmed, signing out")
            await supabase.auth.signOut()
            throw new Error("Please verify your email before logging in. Check your inbox for the verification link.")
          }

          // Store user info in localStorage for quick access
          if (userProfile) {
            const userData = {
              id: data.user.id,
              email: data.user.email,
              username: userProfile.username,
              full_name: userProfile.full_name,
            }
            localStorage.setItem("currentUser", JSON.stringify(userData))
            console.log("💾 User data stored in localStorage:", userData)
          }

          console.log("🎉 Login successful, redirecting to main page")
          // Successful login - redirect to main page
          router.push("/")
        } catch (authError: any) {
          console.error("❌ Authentication process failed:", authError)
          throw authError
        }
      }
    } catch (error: any) {
      console.error("❌ Overall login error:", {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      })
      setError(error.message || "Failed to login. Please try again.")
    } finally {
      setLoading(false)
      console.log("🏁 Login attempt completed")
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
                <span className="bg-[#6D3B3B] px-2 text-white/60">or continue with email</span>
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
                disabled={loading}
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
                disabled={loading}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  className="border-white/50 data-[state=checked]:bg-white data-[state=checked]:text-[#5A0D16]"
                  disabled={loading}
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

        {/* Debug info in development */}
        {process.env.NODE_ENV === "development" && (
          <div className="mt-4 p-3 bg-black/20 rounded-lg text-xs text-white/70">
            <p>🔧 Debug Mode: Detailed logging enabled</p>
            <p>📊 Check browser console for authentication details</p>
            <p>🧪 Test credentials: MB / abc123</p>
          </div>
        )}
      </div>
    </div>
  )
}
