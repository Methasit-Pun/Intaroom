"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, User, Phone, Mail, Coins, Save, Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { supabaseUrl, supabaseAnonKey } from "@/app/env"

interface ProfileData {
  id: string
  full_name: string
  email: string
  telephone: string | null
  credits: number
  username: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    full_name: "",
    telephone: "",
  })

  // Initialize Supabase client
  const supabase = createClientComponentClient({
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
  })

  // Fetch user profile data
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true)
      setError(null)

      try {
        // Get current user session
        const { data: sessionData } = await supabase.auth.getSession()

        if (!sessionData.session) {
          router.push("/login")
          return
        }

        const userId = sessionData.session.user.id

        // Fetch profile data
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, email, telephone, credits, username")
          .eq("id", userId)
          .single()

        if (error) throw error

        setProfile(data)
        setFormData({
          full_name: data.full_name || "",
          telephone: data.telephone || "",
        })
      } catch (error: any) {
        console.error("Error fetching profile:", error)
        setError(error.message || "Failed to load profile")
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [supabase, router])

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

    try {
      if (!profile) throw new Error("Profile not loaded")

      // Update profile in database
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          telephone: formData.telephone,
        })
        .eq("id", profile.id)

      if (error) throw error

      // Update local state
      setProfile((prev) => {
        if (!prev) return null
        return {
          ...prev,
          full_name: formData.full_name,
          telephone: formData.telephone,
        }
      })

      setSuccess(true)

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(false)
      }, 3000)
    } catch (error: any) {
      console.error("Error updating profile:", error)
      setError(error.message || "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  const handleBack = () => {
    router.push("/")
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#5A0D16] text-white">
      {/* Header */}
      <div className="p-4 border-b border-[#8B1F2D]/30 flex items-center">
        <Button variant="ghost" className="text-white hover:bg-white/10 mr-2 -ml-2" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-xl font-semibold flex-1 text-center">
          <span className="text-[#D4AF37]">INTA</span>ROOM PROFILE
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
              {/* Profile header */}
              <div className="p-6 bg-gray-100 border-b border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-[#5A0D16] flex items-center justify-center text-white text-3xl font-semibold">
                    {profile.full_name
                      ? profile.full_name.charAt(0).toUpperCase()
                      : profile.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold">{profile.username}</h2>
                    <div className="flex items-center gap-2 mt-2 bg-[#F8F3E6] px-3 py-1.5 rounded-full w-fit">
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
                    <p>Profile updated successfully!</p>
                  </div>
                )}

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      className="pl-10 border-gray-300 py-6 text-base"
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">Emergency Telephone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      name="telephone"
                      value={formData.telephone || ""}
                      onChange={handleChange}
                      className="pl-10 border-gray-300 py-6 text-base"
                      placeholder="Enter emergency contact number"
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

                <Button
                  type="submit"
                  className="w-full bg-[#5A0D16] hover:bg-[#4A0B12] text-white py-6 text-base font-medium"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-5 w-5" />
                      Save Changes
                    </>
                  )}
                </Button>
              </form>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
