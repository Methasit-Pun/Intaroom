"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import Link from "next/link"
import { supabaseUrl, supabaseAnonKey } from "@/app/env"

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [username, setUsername] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usernameStatus, setUsernameStatus] = useState<{valid: boolean, message: string} | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)

  // Initialize Supabase client with explicit URL and key
  const supabase = createClientComponentClient({
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
  })
  
  // Function to check username availability
  const checkUsernameAvailability = async (username: string) => {
    if (username.length < 3) {
      setUsernameStatus({ valid: false, message: 'Username must be at least 3 characters' })
      return
    }
    
    setCheckingUsername(true)
    try {
      const { data, error } = await supabase
        .rpc('validate_username', { username_to_validate: username })
      
      if (error) {
        console.error('Error validating username:', error)
        setUsernameStatus(null)
      } else {
        setUsernameStatus(data as { valid: boolean, message: string })
      }
    } catch (err) {
      console.error('Failed to check username:', err)
      setUsernameStatus(null)
    } finally {
      setCheckingUsername(false)
    }
  }
  
  // Use debounce to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      if (username && username.length >= 3) {
        checkUsernameAvailability(username)
      }
    }, 500)
    
    return () => clearTimeout(timer)
  }, [username])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)

    try {
      // Check if username is valid
      if (username) {
        const { data, error } = await supabase
          .rpc('validate_username', { username_to_validate: username })
        
        if (error || (data && !data.valid)) {
          setError(data ? data.message : "Username validation failed. Please try again.")
          setLoading(false)
          return
        }
      }
      
      // Sign up with email and password
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `https://intaroomv2.vercel.app/auth/callback`,
          data: {
            full_name: fullName,
            username: username,
            // Include any additional fields you want to capture
          },
        },
      })

      if (error) throw error

      if (data.user) {
        // Wait a bit for the database trigger to create the profile
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        console.log("Registration successful, redirecting to success page")
        // Redirect to success page immediately
        router.push("/register-success")
      } else {
        throw new Error("Registration failed. Please try again.")
      }
    } catch (error: any) {
      setError(error.message || "Failed to register")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#5A0D16] px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md mx-auto p-6 rounded-3xl bg-[#6D3B3B]">
        <h1 className="text-2xl font-semibold text-white text-center mb-6">Register</h1>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-white p-3 rounded-lg mb-4 text-sm">{error}</div>
        )}

        <form onSubmit={handleRegister}>
          <div className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 rounded-full bg-transparent border border-white/30 text-white placeholder:text-white/70 focus:outline-none focus:border-white/50"
                required
              />
            </div>

            <div>
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full px-4 py-3 rounded-full bg-transparent border ${
                  usernameStatus 
                    ? usernameStatus.valid 
                      ? 'border-green-500' 
                      : 'border-red-500' 
                    : 'border-white/30'
                } text-white placeholder:text-white/70 focus:outline-none focus:border-white/50`}
                required
              />
              <div className="flex items-center mt-1 ml-2">
                {checkingUsername && (
                  <div className="animate-spin h-3 w-3 border-2 border-white/50 rounded-full border-t-transparent mr-1"></div>
                )}
                {usernameStatus && (
                  <p className={`text-xs ${
                    usernameStatus.valid ? 'text-green-500' : 'text-red-400'
                  }`}>
                    {usernameStatus.message}
                  </p>
                )}
                {!checkingUsername && !usernameStatus && (
                  <p className="text-xs text-white/70">Choose a unique username for login</p>
                )}
              </div>
            </div>

            <div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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

            <div>
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-full bg-transparent border border-white/30 text-white placeholder:text-white/70 focus:outline-none focus:border-white/50"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-full bg-[#E8E1D9] hover:bg-[#D8D1C9] text-[#5A0D16] font-medium transition-colors"
            >
              {loading ? "Registering..." : "Register"}
            </button>
          </div>
        </form>

        <div className="mt-4 text-center text-sm text-white">
          Already have an account?{" "}
          <Link href="/login" className="hover:underline">
            Login
          </Link>
        </div>
      </div>
    </div>
  )
}

