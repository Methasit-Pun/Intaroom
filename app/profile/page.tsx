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
    const errorParam = searchParams.get("error")

    setIsSetupMode(setup === "true")
    setIsNewUser(newUser === "true")

    if (errorParam === "true") {
      setError("There was an issue setting up your account. Please complete your profile information.")
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
          userEmail = sessionData.session.user.email
        }

        // If no Supabase session but we have LIFF profile, try to find user by LINE ID
        if (!userId && liffProfile) {
          const { data: lineUserData, error: lineUserError } = await supabase
            .from("profiles")
            .select("*")
            .eq("line_user_id", liffProfile.userId)
            .single()

          if (!lineUserError && lineUserData) {
            userId = lineUserData.id
            userEmail = lineUserData.email
            setProfile(lineUserData)
          }
        }

        // If we have a user ID, fetch the full profile
        if (userId) {
          const { data, error } = await supabase
            .from("profiles")
            .select("id, full_name, email, telephone, credits, username, line_user_id, avatar_url")
            .eq("id", userId)
            .single()

          if (error) {
            console.error("Error fetching profile:", error)
            throw error
          }

          setProfile(data)
          setFormData({
            full_name: data.full_name || liffProfile?.displayName || "",
            telephone: data.telephone || "",
          })
        } else {
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

      // If this was setup mode, redirect to main page after a short delay
      if (isSetupMode) {
        setTimeout(() => {
          router.push("/")
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
      <div className="p-4 border-b border-[#8B1F2D]/30 flex items-center">
        {!isSetupMode && (
          <Button variant="ghost" className="text-white hover:bg-white/10 mr-2 -ml-2" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}
        <h1 className="text-xl font-semibold flex-1 text-center">
          <span className="text-[#D4AF37]">INTA</span>ROOM {isSetupMode ? (isNewUser ? "WELCOME" : "SETUP") : "PROFILE"}
        </h1>
      </div>

      {/* Main content */}
      <div className="flex-1 p-4">
        <div className="max-w-md mx-auto bg-white rounded-xl overflow-hidden shadow-md text-gray-800">
          {loading ? (
            <div className="p-8 flex justify-center items-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : error && !profile ? (
            <div className="p-6 bg-red-50 border-l-4 border-red-500">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <h3 className="font-medium text-red-800">Error Loading Profile</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                  <Button
                    className="mt-3 bg-red-100 text-red-800 hover:bg-red-200"
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
                <div className="p-6 bg-blue-50 border-b border-blue-200">
                  <h2 className="text-xl font-semibold text-blue-800 mb-2">
                    {isNewUser ? "Welcome to IntaRoom!" : "Complete Your Profile"}
                  </h2>
                  <p className="text-sm text-blue-700">
                    {isNewUser
                      ? "Please complete your profile to start making room reservations."
                      : "We need a bit more information to complete your account setup."}
                  </p>
                </div>
              )}

              {/* Profile header */}
              <div className="p-6 bg-gray-100 border-b border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-[#5A0D16] flex items-center justify-center text-white text-3xl font-semibold overflow-hidden">
                    {profile.avatar_url ? (
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
                  <div>
                    <h2 className="text-2xl font-semibold">{profile.full_name || profile.username || "User"}</h2>
                    {profile.line_user_id && <p className="text-sm text-gray-600 mb-2">Connected via LINE</p>}
                    <div className="flex items-center gap-2 bg-[#F8F3E6] px-3 py-1.5 rounded-full w-fit">
                      <Coins className="h-5 w-5 text-[#D4AF37]" />
                      <span className="font-medium">{profile.credits} Intaroom Credits</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {error && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700 text-sm rounded-r-md flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <p>{error}</p>
                  </div>
                )}

                {success && (
                  <div className="bg-green-50 border-l-4 border-green-500 p-4 text-green-700 text-sm rounded-r-md flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <p>
                      {isSetupMode
                        ? "Profile setup complete! Redirecting to main page..."
                        : "Profile updated successfully!"}
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Full Name {isSetupMode && <span className="text-red-500">*</span>}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      className="pl-10 border-gray-300 py-6 text-base"
                      placeholder="Enter your full name"
                      required={isSetupMode}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Emergency Telephone {isSetupMode && <span className="text-red-500">*</span>}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      name="telephone"
                      value={formData.telephone || ""}
                      onChange={handleChange}
                      className="pl-10 border-gray-300 py-6 text-base"
                      placeholder="Enter emergency contact number"
                      required={isSetupMode}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input value={profile.email} className="pl-10 border-gray-300 bg-gray-50 py-6 text-base" disabled />
                    <p className="text-xs text-gray-500 mt-1 ml-1">Email cannot be changed</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">Intaroom Credits</label>
                  <div className="relative">
                    <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#D4AF37]" />
                    <div className="pl-10 border border-gray-300 rounded-md bg-gray-50 py-3 px-3 text-base flex justify-between items-center">
                      <span>{profile.credits} credits</span>
                      <div className="bg-[#F8F3E6] px-2 py-1 rounded text-xs text-[#8B6E00]">1 credit = 1 hour</div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="submit"
                    className="flex-1 bg-[#5A0D16] hover:bg-[#4A0B12] text-white py-6 text-base font-medium"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        {isSetupMode ? "Setting up..." : "Saving..."}
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-5 w-5" />
                        {isSetupMode ? "Complete Setup" : "Save Changes"}
                      </>
                    )}
                  </Button>

                  {isSetupMode && (
                    <Button
                      type="button"
                      variant="outline"
                      className="px-6 py-6 text-base"
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
