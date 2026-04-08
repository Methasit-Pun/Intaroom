"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, User, Phone, Mail, Coins, Save, Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { supabaseUrl, supabaseAnonKey } from "@/app/env"
import { useLiff } from "@/components/liff-provider"
import { resetMonthlyCreditsIfBelowMinimum, validateTelephoneNumber } from "@/lib/user-validation"

interface ProfileData {
  id: string
  full_name: string
  email: string
  telephone: string | null
  credits: number
  username: string
  line_user_id?: string
  avatar_url?: string
}

export default function ProfilePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isSetupMode, setIsSetupMode] = useState(false)
  const [isNewUser, setIsNewUser] = useState(false)
  const [formData, setFormData] = useState({
    full_name: "",
    telephone: "",
  })
  const { profile: liffProfile } = useLiff()

  // Initialize Supabase client
  const supabase = createClientComponentClient({
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
  })

  // Check URL parameters
  useEffect(() => {
    const setup = searchParams.get("setup")
    const newUser = searchParams.get("new")
    const required = searchParams.get("required")
    const errorParam = searchParams.get("error")

    setIsSetupMode(setup === "true")
    setIsNewUser(newUser === "true")

    if (errorParam === "true") {
      setError("There was an issue setting up your account. Please complete your profile information.")
    }

    // If telephone is specifically required, show appropriate message
    if (required === "telephone") {
      setError("Please add your telephone number to continue making reservations.")
    }
  }, [searchParams])

  // Fetch user profile data
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true)
      setError(null)

      try {
        let userId: string | null = null
        let userEmail: string | null = null

        // Try to get user from Supabase session first
        const { data: sessionData } = await supabase.auth.getSession()
        if (sessionData.session) {
          userId = sessionData.session.user.id
          userEmail = sessionData.session.user.email ?? null
        }

        // If no Supabase session but we have LIFF profile, try to find user by LINE ID
        let profileAlreadyLoaded = false
        if (!userId && liffProfile) {
          const { data: lineUserData, error: lineUserError } = await supabase
            .from("profiles")
            .select("*")
            .eq("line_user_id", liffProfile.userId)
            .single()

          if (!lineUserError && lineUserData) {
            userId = lineUserData.id
            userEmail = lineUserData.email

            const credits = await resetMonthlyCreditsIfBelowMinimum(lineUserData.id, lineUserData.credits || 0)

            setProfile({
              ...lineUserData,
              credits,
            })
            setFormData({
              full_name: lineUserData.full_name || liffProfile.displayName || "",
              telephone: lineUserData.telephone || "",
            })
            profileAlreadyLoaded = true
          }
        }

        // If we have a user ID, fetch the full profile (skip if already loaded via LINE ID)
        if (userId && !profileAlreadyLoaded) {
          const { data, error } = await supabase
            .from("profiles")
            .select("id, full_name, email, telephone, credits, username, line_user_id, avatar_url")
            .eq("id", userId)
            .single()

          if (error) {
            console.error("Error fetching profile:", error)
            throw error
          }

          const credits = await resetMonthlyCreditsIfBelowMinimum(data.id, data.credits || 0)

          setProfile({
            ...data,
            credits,
          })
          setFormData({
            full_name: data.full_name || liffProfile?.displayName || "",
            telephone: data.telephone || "",
          })
        } else if (!userId) {
          // No user found, redirect to login
          router.push("/login")
          return
        }
      } catch (error: any) {
        console.error("Error fetching profile:", error)
        setError(error.message || "Failed to load profile")
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [supabase, router, liffProfile])

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    // Validate required fields for setup mode
    if (isSetupMode && (!formData.full_name.trim() || !formData.telephone.trim())) {
      setError("Please fill in all required fields")
      setSaving(false)
      return
    }

    // Validate telephone number if provided
    if (formData.telephone.trim() && !validateTelephoneNumber(formData.telephone.trim())) {
      setError("Please enter a valid telephone number (8-15 digits)")
      setSaving(false)
      return
    }

    // Check if telephone is required (from URL parameter)
    const required = searchParams.get("required")
    if (required === "telephone" && !formData.telephone.trim()) {
      setError("Telephone number is required to continue making reservations")
      setSaving(false)
      return
    }

    try {
      if (!profile) throw new Error("Profile not loaded")

      // Update profile in database
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name.trim(),
          telephone: formData.telephone.trim(),
        })
        .eq("id", profile.id)

      if (error) throw error

      // Update local state
      setProfile((prev) => {
        if (!prev) return null
        return {
          ...prev,
          full_name: formData.full_name.trim(),
          telephone: formData.telephone.trim(),
        }
      })

      setSuccess(true)

      // Handle redirection after successful update
      const returnUrl = searchParams.get("returnUrl")
      const required = searchParams.get("required")
      
      if (isSetupMode || required === "telephone") {
        setTimeout(() => {
          if (returnUrl) {
            // Redirect back to the original page
            router.push(returnUrl)
          } else {
            // Default redirect to main page
            router.push("/")
          }
        }, 2000)
      } else {
        // Clear success message after 3 seconds for regular updates
        setTimeout(() => {
          setSuccess(false)
        }, 3000)
      }
    } catch (error: any) {
      console.error("Error updating profile:", error)
      setError(error.message || "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  const handleBack = () => {
    if (isSetupMode) {
      // In setup mode, don't allow going back
      return
    }
    router.push("/")
  }

  const handleSkipSetup = () => {
    if (isSetupMode) {
      router.push("/")
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#5A0D16] text-white">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-[#8B1F2D]/30 flex items-center">
        {!isSetupMode && (
          <Button variant="ghost" className="text-white hover:bg-white/10 mr-2 -ml-2 p-2" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Back</span>
          </Button>
        )}
        <h1 className="text-lg sm:text-xl font-semibold flex-1 text-center">
          <span className="text-[#D4AF37]">INTA</span>ROOM {isSetupMode ? (isNewUser ? "WELCOME" : "SETUP") : "PROFILE"}
        </h1>
      </div>

      {/* Main content */}
      <div className="flex-1 p-3 sm:p-4 overflow-y-auto">
        <div className="max-w-md mx-auto bg-white rounded-xl overflow-hidden shadow-md text-gray-800">
          {loading ? (
            <div className="p-6 sm:p-8 flex justify-center items-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : error && !profile ? (
            <div className="p-4 sm:p-6 bg-red-50 border-l-4 border-red-500">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-red-800 text-sm sm:text-base">Error Loading Profile</h3>
                  <p className="text-xs sm:text-sm text-red-700 mt-1">{error}</p>
                  <Button
                    className="mt-3 bg-red-100 text-red-800 hover:bg-red-200 text-sm px-3 py-2"
                    onClick={() => window.location.reload()}
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          ) : profile ? (
            <>
              {/* Welcome message for new users */}
              {isSetupMode && (
                <div className="p-4 sm:p-6 bg-blue-50 border-b border-blue-200">
                  <h2 className="text-lg sm:text-xl font-semibold text-blue-800 mb-2">
                    {isNewUser ? "Welcome to IntaRoom!" : "Complete Your Profile"}
                  </h2>
                  <p className="text-xs sm:text-sm text-blue-700">
                    {isNewUser
                      ? "Please complete your profile to start making room reservations."
                      : "We need a bit more information to complete your account setup."}
                  </p>
                </div>
              )}

              {/* Profile header */}
              <div className="p-4 sm:p-6 bg-gray-100 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#5A0D16] flex items-center justify-center text-white text-2xl sm:text-3xl font-semibold overflow-hidden flex-shrink-0">
                    {profile.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profile.avatar_url || "/placeholder.svg"}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : profile.full_name ? (
                      profile.full_name.charAt(0).toUpperCase()
                    ) : (
                      profile.username.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="text-center sm:text-left min-w-0 flex-1">
                    <h2 className="text-xl sm:text-2xl font-semibold truncate">{profile.full_name || profile.username || "User"}</h2>
                    {profile.line_user_id && <p className="text-xs sm:text-sm text-gray-600 mb-2">Connected via LINE</p>}
                    <div className="flex items-center justify-center sm:justify-start gap-2 bg-[#F8F3E6] px-2 sm:px-3 py-1 sm:py-1.5 rounded-full w-fit mx-auto sm:mx-0">
                      <Coins className="h-4 w-4 sm:h-5 sm:w-5 text-[#D4AF37] flex-shrink-0" />
                      <span className="text-sm sm:text-base font-medium">{profile.credits} Credits</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile form */}
              <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {error && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-3 sm:p-4 text-red-700 text-xs sm:text-sm rounded-r-md flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 mt-0.5" />
                    <p className="min-w-0 flex-1">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="bg-green-50 border-l-4 border-green-500 p-3 sm:p-4 text-green-700 text-xs sm:text-sm rounded-r-md flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 mt-0.5" />
                    <p className="min-w-0 flex-1">
                      {isSetupMode
                        ? "Profile setup complete! Redirecting to main page..."
                        : "Profile updated successfully!"}
                    </p>
                  </div>
                )}

                <div className="space-y-2 sm:space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Full Name {isSetupMode && <span className="text-red-500">*</span>}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                    <Input
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      className="pl-10 border-gray-300 py-3 sm:py-6 text-sm sm:text-base"
                      placeholder="Enter your full name"
                      required={isSetupMode}
                    />
                  </div>
                </div>

                <div className="space-y-2 sm:space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Emergency Telephone {(isSetupMode || searchParams.get("required") === "telephone") && <span className="text-red-500">*</span>}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                    <Input
                      name="telephone"
                      value={formData.telephone || ""}
                      onChange={handleChange}
                      className="pl-10 border-gray-300 py-3 sm:py-6 text-sm sm:text-base"
                      placeholder="Enter emergency contact number (e.g., 081-234-5678)"
                      required={isSetupMode || searchParams.get("required") === "telephone"}
                    />
                  </div>
                  {searchParams.get("required") === "telephone" && (
                    <p className="text-xs text-gray-600 ml-1">
                      📱 Required for room reservations - we&apos;ll contact you about your bookings
                    </p>
                  )}
                </div>

                <div className="space-y-2 sm:space-y-3">
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 sm:top-4 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                    <Input value={profile.email} className="pl-10 border-gray-300 bg-gray-50 py-3 sm:py-6 text-sm sm:text-base" disabled />
                    <p className="text-xs text-gray-500 mt-1 ml-1">Email cannot be changed</p>
                  </div>
                </div>

                <div className="space-y-2 sm:space-y-3">
                  <label className="block text-sm font-medium text-gray-700">Intaroom Credits</label>
                  <div className="relative">
                    <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-[#D4AF37]" />
                    <div className="pl-10 border border-gray-300 rounded-md bg-gray-50 py-3 px-3 text-sm sm:text-base flex justify-between items-center">
                      <span>{profile.credits} credits</span>
                      <div className="bg-[#F8F3E6] px-2 py-1 rounded text-xs text-[#8B6E00] flex-shrink-0">1 credit = 1 hour</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    type="submit"
                    className="flex-1 bg-[#5A0D16] hover:bg-[#4A0B12] text-white py-3 sm:py-6 text-sm sm:text-base font-medium"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                        {isSetupMode ? "Setting up..." : "Saving..."}
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                        {isSetupMode ? "Complete Setup" : "Save Changes"}
                      </>
                    )}
                  </Button>

                  {isSetupMode && (
                    <Button
                      type="button"
                      variant="outline"
                      className="px-4 sm:px-6 py-3 sm:py-6 text-sm sm:text-base"
                      onClick={handleSkipSetup}
                      disabled={saving}
                    >
                      Skip for Now
                    </Button>
                  )}
                </div>
              </form>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
