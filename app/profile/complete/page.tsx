"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { supabaseUrl, supabaseAnonKey } from "@/app/env"
import { Loader2, AlertCircle, CheckCircle, User, Mail, Phone, AtSign } from "lucide-react"

export default function ProfileCompletePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    telephone: "",
    username: "",
  })
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)

  // Initialize Supabase client
  const supabase = createClientComponentClient({
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
  })

  // Check if user is coming from LINE login
  useEffect(() => {
    const lineUserId = localStorage.getItem("lineUserId")
    const needsProfile = localStorage.getItem("lineUserNeedsProfile")

    if (!lineUserId || needsProfile !== "true") {
      // User is not coming from LINE login or doesn't need profile completion
      router.push("/login")
    }
  }, [router])

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Reset username availability when username changes
    if (name === "username") {
      setUsernameAvailable(null)
    }
  }

  // Check if username is available
  const checkUsername = async () => {
    if (!formData.username || formData.username.length < 3) return

    setCheckingUsername(true)
    try {
      const { data, error } = await supabase.rpc("check_username_exists", {
        username_to_check: formData.username,
      })

      if (error) throw error

      setUsernameAvailable(!data)
    } catch (error) {
      console.error("Error checking username:", error)
      setUsernameAvailable(false)
    } finally {
      setCheckingUsername(false)
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate form data
      if (!formData.full_name || !formData.email || !formData.username) {
        throw new Error("Please fill in all required fields")
      }

      // Validate email format
      if (!/\S+@\S+\.\S+/.test(formData.email)) {
        throw new Error("Please enter a valid email address")
      }

      // Check if username is available
      if (!usernameAvailable) {
        await checkUsername()
        if (!usernameAvailable) {
          throw new Error("Username is already taken")
        }
      }

      // Get LINE user data from localStorage
      const lineUserId = localStorage.getItem("lineUserId")
      const lineDisplayName = localStorage.getItem("lineDisplayName")
      const linePictureUrl = localStorage.getItem("linePictureUrl")

      if (!lineUserId) {
        throw new Error("LINE user data not found")
      }

      // Create a random email for Supabase Auth if not provided
      const authEmail = formData.email || `line_${lineUserId}@example.com`

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: authEmail,
        password: lineUserId, // Use LINE user ID as password
        options: {
          data: {
            full_name: formData.full_name,
            username: formData.username,
            line_user_id: lineUserId,
            avatar_url: linePictureUrl || "",
          },
        },
      })

      if (authError) throw authError

      // Create or update profile in profiles table
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: authData.user?.id,
        full_name: formData.full_name,
        email: formData.email,
        username: formData.username,
        telephone: formData.telephone,
        line_user_id: lineUserId,
        avatar_url: linePictureUrl || "",
        credits: 3, // Set initial credits to 3
        role: "user",
        email_verified: true, // Auto-verify since we're using LINE
      })

      if (profileError) throw profileError

      // Clear the "needs profile" flag
      localStorage.removeItem("lineUserNeedsProfile")

      setSuccess(true)

      // Redirect to home page after 2 seconds
      setTimeout(() => {
        router.push("/")
      }, 2000)
    } catch (error: any) {
      console.error("Error creating profile:", error)
      setError(error.message || "Failed to create profile")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#5A0D16] text-white">
      {/* Header */}
      <div className="p-4 border-b border-[#8B1F2D]/30">
        <h1 className="text-2xl font-semibold text-center">
          <span className="text-[#D4AF37]">INTA</span>ROOM PROFILE SETUP
        </h1>
      </div>

      {/* Main content */}
      <div className="flex-1 p-4">
        <div className="max-w-md mx-auto bg-white rounded-xl overflow-hidden shadow-md text-gray-800">
          <div className="p-6 bg-gray-100 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Complete Your Profile</h2>
            <p className="text-sm text-gray-600 mt-1">
              Please provide the following information to complete your registration
            </p>
          </div>

          {error && (
            <div className="m-6 bg-red-50 border-l-4 border-red-500 p-4 text-red-700 text-sm rounded-r-md flex items-start gap-2">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="m-6 bg-green-50 border-l-4 border-green-500 p-4 text-green-700 text-sm rounded-r-md flex items-start gap-2">
              <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Profile created successfully!</p>
                <p className="mt-1">Redirecting to home page...</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="space-y-3">
              <Label htmlFor="full_name" className="text-sm font-medium text-gray-700">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="pl-10 border-gray-300 py-6 text-base"
                  placeholder="Enter your full name"
                  required
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                Username <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  onBlur={checkUsername}
                  className="pl-10 border-gray-300 py-6 text-base"
                  placeholder="Choose a unique username"
                  required
                />
                {checkingUsername && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  </div>
                )}
                {usernameAvailable === true && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                )}
                {usernameAvailable === false && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                )}
              </div>
              {usernameAvailable === false && (
                <p className="text-xs text-red-500 mt-1">This username is already taken</p>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-10 border-gray-300 py-6 text-base"
                  placeholder="Enter your email address"
                  required
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="telephone" className="text-sm font-medium text-gray-700">
                Telephone
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="telephone"
                  name="telephone"
                  value={formData.telephone}
                  onChange={handleChange}
                  className="pl-10 border-gray-300 py-6 text-base"
                  placeholder="Enter your phone number"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-4 bg-[#FFF8E6] p-3 rounded-lg border border-[#F0E0B2]">
                <div className="text-[#D4AF37] bg-[#FAEDC1] p-1 rounded-full">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <p className="text-sm text-[#8B6E00]">
                  Your account will be created with <strong>3 credits</strong> to start booking rooms.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#5A0D16] hover:bg-[#4A0B12] text-white py-6 text-base font-medium"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating Profile...
                  </>
                ) : (
                  "Complete Registration"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
