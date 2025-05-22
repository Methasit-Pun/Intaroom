"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { getSupabaseClient } from "@/lib/supabase-browser"
import LiffScript from "./liff-script"

// Define the LIFF type
declare global {
  interface Window {
    liff: any
  }
}

type LiffContextType = {
  liff: any
  isLoggedIn: boolean
  profile: {
    userId: string
    displayName: string
    pictureUrl?: string
    email?: string
  } | null
  isReady: boolean
  isInClient: boolean
  error: Error | null
  login: () => void
  logout: () => void
}

const LiffContext = createContext<LiffContextType>({
  liff: null,
  isLoggedIn: false,
  profile: null,
  isReady: false,
  isInClient: false,
  error: null,
  login: () => {},
  logout: () => {},
})

export const useLiff = () => useContext(LiffContext)

type LiffProviderProps = {
  children: ReactNode
  liffId: string
  fallback?: ReactNode
}

export function LiffProvider({ children, liffId, fallback }: LiffProviderProps) {
  const [liff, setLiff] = useState<any>(null)
  const [isReady, setIsReady] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [profile, setProfile] = useState<LiffContextType["profile"]>(null)
  const [isInClient, setIsInClient] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [sdkLoaded, setSdkLoaded] = useState(false)

  // Initialize Supabase client
  const supabase = getSupabaseClient()

  // Handle LIFF SDK load
  const handleLiffLoad = () => {
    console.log("LIFF SDK load callback triggered")
    setSdkLoaded(true)
  }

  // Initialize LIFF after SDK is loaded
  useEffect(() => {
    if (!sdkLoaded || !window.liff) return

    const initLiff = async () => {
      try {
        // Use the global LIFF object
        const liffInstance = window.liff

        // Initialize LIFF with more options
        await liffInstance.init({
          liffId,
          withLoginOnExternalBrowser: true, // Allow login in external browser
        })
        console.log("LIFF initialized successfully")

        setLiff(liffInstance)
        setIsReady(true)
        setIsInClient(liffInstance.isInClient())
        setIsLoggedIn(liffInstance.isLoggedIn())

        // If user is logged in, get profile
        if (liffInstance.isLoggedIn()) {
          console.log("User is logged in with LINE")
          try {
            const lineProfile = await liffInstance.getProfile()
            console.log("LINE profile retrieved:", lineProfile)
            setProfile({
              userId: lineProfile.userId,
              displayName: lineProfile.displayName,
              pictureUrl: lineProfile.pictureUrl,
              email: liffInstance.getDecodedIDToken()?.email,
            })

            // Authenticate with backend
            await authenticateWithBackend(lineProfile)
          } catch (profileError) {
            console.error("Error getting LINE profile:", profileError)
            setError(profileError instanceof Error ? profileError : new Error("Failed to get LINE profile"))
          }
        } else {
          console.log("User is not logged in with LINE")
        }
      } catch (err) {
        console.error("LIFF initialization failed", err)
        setError(err instanceof Error ? err : new Error("Failed to initialize LIFF"))
      }
    }

    initLiff()
  }, [liffId, sdkLoaded])

  // Authenticate with backend
  const authenticateWithBackend = async (lineProfile: any) => {
    try {
      console.log("Authenticating with LINE profile:", lineProfile)

      // Store LINE user data in localStorage for immediate use
      localStorage.setItem("lineUserId", lineProfile.userId)
      localStorage.setItem("lineDisplayName", lineProfile.displayName)
      localStorage.setItem("linePictureUrl", lineProfile.pictureUrl || "")

      // Check if user exists in Supabase
      const { data: existingUser, error: userError } = await supabase
        .from("profiles")
        .select("*")
        .eq("line_user_id", lineProfile.userId)
        .single()

      if (userError && userError.code !== "PGRST116") {
        // Error other than "not found"
        console.error("Error checking user:", userError)
      }

      if (!existingUser) {
        // This is a new LINE user - redirect to profile completion page
        // We'll create a temporary session to track this user
        localStorage.setItem("lineUserNeedsProfile", "true")

        // Redirect to profile completion page
        window.location.href = "/profile/complete"
      } else {
        console.log("User already exists, signing in")

        // User exists, just update the session
        await supabase.auth
          .signInWithPassword({
            email: existingUser.email || `line_${lineProfile.userId}@example.com`,
            password: existingUser.line_user_id || "default_password",
          })
          .catch((err) => {
            console.log("Error signing in existing user, creating session anyway:", err)
            // Even if sign in fails, we'll continue with the LINE session
          })

        // Force redirect to main page after successful LINE login
        window.location.href = "/"
      }
    } catch (err) {
      console.error("Error authenticating with backend:", err)
    }
  }

  // Login function
  const login = () => {
    if (!liff) {
      console.error("LIFF not initialized")
      return
    }

    try {
      if (!liff.isLoggedIn()) {
        // Get the current URL for the redirect
        const redirectUri = window.location.href.split("?")[0] // Remove any query params
        console.log("Logging in with redirect URI:", redirectUri)

        liff.login({
          redirectUri: redirectUri,
        })
      }
    } catch (error) {
      console.error("Error during LINE login:", error)
    }
  }

  // Logout function
  const logout = async () => {
    if (!liff) return

    if (liff.isLoggedIn()) {
      // Logout from LIFF
      liff.logout()

      // Logout from Supabase
      await supabase.auth.signOut()

      // Reset state
      setIsLoggedIn(false)
      setProfile(null)

      // Reload page
      window.location.reload()
    }
  }

  const value = {
    liff,
    isLoggedIn,
    profile,
    isReady,
    isInClient,
    error,
    login,
    logout,
  }

  // Show fallback while loading or if there's an error
  if (!isReady && fallback) {
    return (
      <>
        <LiffScript onLoad={handleLiffLoad} onError={setError} />
        {fallback}
      </>
    )
  }

  return (
    <LiffContext.Provider value={value}>
      <LiffScript onLoad={handleLiffLoad} onError={setError} />
      {children}
    </LiffContext.Provider>
  )
}
