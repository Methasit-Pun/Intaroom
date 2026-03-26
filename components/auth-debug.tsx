"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { supabaseUrl, supabaseAnonKey } from "@/app/env"
import { useLiff } from "@/components/liff-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Eye, EyeOff } from "lucide-react"

export default function AuthDebug() {
  const [isVisible, setIsVisible] = useState(false)
  const [supabaseSession, setSupabaseSession] = useState<any>(null)
  const [profileData, setProfileData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const { liff, isLoggedIn, profile, isReady, error } = useLiff()

  const supabase = createClientComponentClient({
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
  })

  const refreshData = async () => {
    setLoading(true)
    try {
      console.log("🔄 Refreshing auth debug data...")
      
      // Get Supabase session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      setSupabaseSession(sessionData.session)
      
      if (sessionError) {
        console.error("❌ Session error:", sessionError)
      }

      // Get profile data if we have a session
      if (sessionData.session) {
        console.log("📊 Getting profile for session user:", sessionData.session.user.id)
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", sessionData.session.user.id)
          .single()
        setProfileData(profileData)
      } else if (profile?.userId) {
        console.log("📊 Getting profile for LINE user:", profile.userId)
        // Try to get profile by LINE user ID
        const { data: lineProfileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("line_user_id", profile.userId)
          .single()
        setProfileData(lineProfileData)
      }
    } catch (error) {
      console.error("❌ Error refreshing debug data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isVisible) {
      refreshData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, isLoggedIn, profile])

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsVisible(true)}
          variant="outline"
          size="sm"
          className="bg-blue-500 text-white border-blue-600 hover:bg-blue-600"
        >
          <Eye className="h-4 w-4 mr-1" />
          Debug
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-96 overflow-y-auto">
      <Card className="bg-white shadow-lg border-2 border-blue-500">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Auth Debug Panel</CardTitle>
            <div className="flex gap-1">
              <Button onClick={refreshData} variant="outline" size="sm" disabled={loading} className="h-6 w-6 p-0">
                <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              </Button>
              <Button onClick={() => setIsVisible(false)} variant="outline" size="sm" className="h-6 w-6 p-0">
                <EyeOff className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          {/* LIFF Status */}
          <div>
            <h4 className="font-medium mb-1">LIFF Status</h4>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Ready:</span>
                <Badge variant={isReady ? "default" : "secondary"}>{isReady ? "Yes" : "No"}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Logged In:</span>
                <Badge variant={isLoggedIn ? "default" : "secondary"}>{isLoggedIn ? "Yes" : "No"}</Badge>
              </div>
              {error && <div className="text-red-600 text-xs">Error: {error.message}</div>}
            </div>
          </div>

          {/* LINE Profile */}
          {profile && (
            <div>
              <h4 className="font-medium mb-1">LINE Profile</h4>
              <div className="bg-gray-50 p-2 rounded text-xs">
                <div>
                  <strong>User ID:</strong> {profile.userId}
                </div>
                <div>
                  <strong>Display Name:</strong> {profile.displayName}
                </div>
                {profile.email && (
                  <div>
                    <strong>Email:</strong> {profile.email}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Supabase Session */}
          <div>
            <h4 className="font-medium mb-1">Supabase Session</h4>
            <div className="flex justify-between">
              <span>Active:</span>
              <Badge variant={supabaseSession ? "default" : "secondary"}>{supabaseSession ? "Yes" : "No"}</Badge>
            </div>
            {supabaseSession && (
              <div className="bg-gray-50 p-2 rounded text-xs mt-1">
                <div>
                  <strong>User ID:</strong> {supabaseSession.user.id}
                </div>
                <div>
                  <strong>Email:</strong> {supabaseSession.user.email}
                </div>
                <div>
                  <strong>Verified:</strong> {supabaseSession.user.email_confirmed_at ? "Yes" : "No"}
                </div>
              </div>
            )}
          </div>

          {/* Profile Data */}
          {profileData && (
            <div>
              <h4 className="font-medium mb-1">Profile Data</h4>
              <div className="bg-gray-50 p-2 rounded text-xs">
                <div>
                  <strong>Username:</strong> {profileData.username}
                </div>
                <div>
                  <strong>Full Name:</strong> {profileData.full_name || "Not set"}
                </div>
                <div>
                  <strong>Telephone:</strong> {profileData.telephone || "Not set"}
                </div>
                <div>
                  <strong>Credits:</strong> {profileData.credits}
                </div>
                <div>
                  <strong>LINE ID:</strong> {profileData.line_user_id || "Not linked"}
                </div>
                <div>
                  <strong>Role:</strong> {profileData.role}
                </div>
              </div>
            </div>
          )}

          {/* Current URL */}
          <div>
            <h4 className="font-medium mb-1">Current URL</h4>
            <div className="bg-gray-50 p-2 rounded text-xs break-all">
              {typeof window !== "undefined" ? window.location.href : "N/A"}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
