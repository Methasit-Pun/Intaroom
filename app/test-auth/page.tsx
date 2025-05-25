"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { supabaseUrl, supabaseAnonKey } from "@/app/env"
import { useLiff } from "@/components/liff-provider"
import { ArrowLeft, TestTube, Trash2, UserPlus, LogIn, Settings } from "lucide-react"
import { useRouter } from "next/navigation"

export default function TestAuthPage() {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [results, setResults] = useState<string[]>([])
  const { liff, isLoggedIn, profile, login, logout } = useLiff()

  const supabase = createClientComponentClient({
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
  })

  const addResult = (message: string) => {
    setResults((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const clearResults = () => {
    setResults([])
  }

  // Test 1: Check current authentication state
  const testCurrentState = async () => {
    setLoading("state")
    try {
      addResult("=== Testing Current State ===")

      // Check LIFF state
      addResult(`LIFF Ready: ${liff ? "Yes" : "No"}`)
      addResult(`LIFF Logged In: ${isLoggedIn}`)
      addResult(`LINE Profile: ${profile ? JSON.stringify(profile) : "None"}`)

      // Check Supabase session
      const { data: session } = await supabase.auth.getSession()
      addResult(`Supabase Session: ${session.session ? "Active" : "None"}`)

      if (session.session) {
        addResult(`Supabase User ID: ${session.session.user.id}`)
        addResult(`Supabase Email: ${session.session.user.email}`)
      }

      // Check profile in database
      if (session.session) {
        const { data: profileData, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.session.user.id)
          .single()

        if (error) {
          addResult(`Profile Error: ${error.message}`)
        } else {
          addResult(`Profile Found: ${profileData.username} (${profileData.full_name || "No name"})`)
          addResult(`Profile Complete: ${profileData.full_name && profileData.telephone ? "Yes" : "No"}`)
        }
      } else if (profile?.userId) {
        const { data: lineProfileData, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("line_user_id", profile.userId)
          .single()

        if (error) {
          addResult(`LINE Profile Error: ${error.message}`)
        } else {
          addResult(`LINE Profile Found: ${lineProfileData.username} (${lineProfileData.full_name || "No name"})`)
        }
      }

      addResult("=== State Check Complete ===")
    } catch (error: any) {
      addResult(`Error: ${error.message}`)
    } finally {
      setLoading(null)
    }
  }

  // Test 2: Simulate LINE login
  const testLineLogin = async () => {
    setLoading("login")
    try {
      addResult("=== Testing LINE Login ===")

      if (!liff) {
        addResult("LIFF not ready")
        return
      }

      if (isLoggedIn) {
        addResult("Already logged in with LINE")
        addResult(`Current profile: ${JSON.stringify(profile)}`)
      } else {
        addResult("Initiating LINE login...")
        login()
      }
    } catch (error: any) {
      addResult(`Login Error: ${error.message}`)
    } finally {
      setLoading(null)
    }
  }

  // Test 3: Test logout
  const testLogout = async () => {
    setLoading("logout")
    try {
      addResult("=== Testing Logout ===")
      await logout()
      addResult("Logout completed")
    } catch (error: any) {
      addResult(`Logout Error: ${error.message}`)
    } finally {
      setLoading(null)
    }
  }

  // Test 4: Create test user manually
  const testCreateUser = async () => {
    setLoading("create")
    try {
      addResult("=== Testing Manual User Creation ===")

      const testEmail = `test_${Date.now()}@test.com`
      const testPassword = "testpassword123"

      addResult(`Creating user with email: ${testEmail}`)

      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
          data: {
            full_name: "Test User",
            username: `test_${Date.now()}`,
          },
        },
      })

      if (error) {
        addResult(`Creation Error: ${error.message}`)
      } else {
        addResult(`User created successfully: ${data.user?.id}`)
        addResult("Check your email for verification link")
      }
    } catch (error: any) {
      addResult(`Error: ${error.message}`)
    } finally {
      setLoading(null)
    }
  }

  // Test 5: Clean up test data
  const testCleanup = async () => {
    setLoading("cleanup")
    try {
      addResult("=== Testing Cleanup ===")

      // Clear localStorage
      localStorage.clear()
      addResult("LocalStorage cleared")

      // Sign out from Supabase
      await supabase.auth.signOut()
      addResult("Supabase session cleared")

      addResult("Cleanup completed - refresh page to see changes")
    } catch (error: any) {
      addResult(`Cleanup Error: ${error.message}`)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#5A0D16] text-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => router.push("/")} className="text-white hover:bg-white/10">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          <h1 className="text-2xl font-bold">
            <span className="text-[#D4AF37]">INTA</span>ROOM Auth Testing
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Test Controls */}
          <Card className="bg-white text-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Test Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={testCurrentState} disabled={loading === "state"} className="w-full" variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                {loading === "state" ? "Checking..." : "Check Current State"}
              </Button>

              <Button
                onClick={testLineLogin}
                disabled={loading === "login"}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                <LogIn className="h-4 w-4 mr-2" />
                {loading === "login" ? "Logging in..." : "Test LINE Login"}
              </Button>

              <Button
                onClick={testCreateUser}
                disabled={loading === "create"}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {loading === "create" ? "Creating..." : "Create Test User"}
              </Button>

              <Button
                onClick={testLogout}
                disabled={loading === "logout"}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              >
                <LogIn className="h-4 w-4 mr-2" />
                {loading === "logout" ? "Logging out..." : "Test Logout"}
              </Button>

              <Button
                onClick={testCleanup}
                disabled={loading === "cleanup"}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {loading === "cleanup" ? "Cleaning..." : "Cleanup Test Data"}
              </Button>

              <Button onClick={clearResults} variant="outline" className="w-full">
                Clear Results
              </Button>
            </CardContent>
          </Card>

          {/* Current Status */}
          <Card className="bg-white text-gray-800">
            <CardHeader>
              <CardTitle>Current Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span>LIFF Ready:</span>
                <Badge variant={liff ? "default" : "secondary"}>{liff ? "Yes" : "No"}</Badge>
              </div>

              <div className="flex justify-between items-center">
                <span>LINE Logged In:</span>
                <Badge variant={isLoggedIn ? "default" : "secondary"}>{isLoggedIn ? "Yes" : "No"}</Badge>
              </div>

              {profile && (
                <div className="space-y-1">
                  <div className="text-sm font-medium">LINE Profile:</div>
                  <div className="text-xs bg-gray-100 p-2 rounded">
                    <div>ID: {profile.userId}</div>
                    <div>Name: {profile.displayName}</div>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <Button onClick={() => router.push("/profile")} className="w-full" variant="outline">
                  Go to Profile Page
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Test Results */}
          <Card className="bg-white text-gray-800 lg:col-span-2">
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-100 p-4 rounded-lg h-64 overflow-y-auto">
                {results.length === 0 ? (
                  <div className="text-gray-500 text-center">No test results yet. Run a test to see results here.</div>
                ) : (
                  <div className="space-y-1">
                    {results.map((result, index) => (
                      <div
                        key={index}
                        className={`text-xs font-mono ${
                          result.includes("Error")
                            ? "text-red-600"
                            : result.includes("===")
                              ? "text-blue-600 font-bold"
                              : "text-gray-700"
                        }`}
                      >
                        {result}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Testing Instructions */}
        <Card className="bg-white text-gray-800 mt-6">
          <CardHeader>
            <CardTitle>Testing Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Complete LINE Login Flow Test:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>First, run "Check Current State" to see the initial state</li>
                <li>Click "Test LINE Login" to initiate LINE authentication</li>
                <li>Complete the LINE login process in the popup/redirect</li>
                <li>After returning, check if you're redirected to profile setup</li>
                <li>Complete the profile setup with required information</li>
                <li>Verify you're redirected to the main page</li>
                <li>Test logout and login again to verify the flow</li>
              </ol>
            </div>

            <div>
              <h4 className="font-medium mb-2">What to Look For:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>LIFF initializes successfully</li>
                <li>LINE login creates or finds user in Supabase</li>
                <li>New users are redirected to profile setup</li>
                <li>Existing users with incomplete profiles go to setup</li>
                <li>Complete profiles redirect to main page</li>
                <li>User data persists across sessions</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
