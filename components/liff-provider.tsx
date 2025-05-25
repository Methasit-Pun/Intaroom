"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { supabaseUrl, supabaseAnonKey } from "@/app/env"

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
}

export function LiffProvider({ children, liffId }: LiffProviderProps) {
  const [liff, setLiff] = useState<any>(null)
  const [isReady, setIsReady] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [profile, setProfile] = useState<LiffContextType["profile"]>(null)
  const [isInClient, setIsInClient] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Initialize Supabase client
  const supabase = createClientComponentClient({
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
  })

  // Initialize LIFF
  useEffect(() => {
    const initLiff = async () => {
      try {
        // Import LIFF dynamically
        const liffModule = await import("@line/liff")
        const liffInstance = liffModule.default

        // Initialize LIFF
        await liffInstance.init({ liffId })
        console.log("LIFF initialized successfully")

        setLiff(liffInstance)
        setIsReady(true)
        setIsInClient(liffInstance.isInClient())
        setIsLoggedIn(liffInstance.isLoggedIn())

        // If user is logged in, get profile
        if (liffInstance.isLoggedIn()) {
          console.log("User is logged in with LINE")
          const lineProfile = await liffInstance.getProfile()
          console.log("Authenticating with LINE profile:", lineProfile)

          setProfile({
            userId: lineProfile.userId,
            displayName: lineProfile.displayName,
            pictureUrl: lineProfile.pictureUrl,
            email: liffInstance.getDecodedIDToken()?.email,
          })

          // Store LINE user data in localStorage immediately
          localStorage.setItem("lineUserId", lineProfile.userId)
          localStorage.setItem("lineDisplayName", lineProfile.displayName)
          localStorage.setItem("linePictureUrl", lineProfile.pictureUrl || "")
          localStorage.setItem("isLineLoggedIn", "true")

          // Authenticate with backend (non-blocking)
          authenticateWithBackend(lineProfile).catch(console.error)

          // Redirect to main page immediately
          if (window.location.pathname === "/login") {
            console.log("Redirecting to main page...")
            window.location.href = "/"
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
  }, [liffId])

  // Authenticate with backend (improved with retry logic)
  const authenticateWithBackend = async (lineProfile: any, retryCount = 0) => {
    const maxRetries = 3
    const retryDelay = 1000 * Math.pow(2, retryCount) // Exponential backoff

    try {
      console.log(`Authenticating with backend (attempt ${retryCount + 1})`)

      // First, check if user already exists
      const { data: existingUser, error: userError } = await supabase
        .from("profiles")
        .select("*")
        .eq("line_user_id", lineProfile.userId)
        .single()

      if (userError && userError.code !== "PGRST116") {
        console.error("Error checking user:", userError)
        throw userError
      }

      if (existingUser) {
        console.log("User already exists in database:", existingUser)
        // User exists, just update localStorage with existing data
        localStorage.setItem("userEmail", existingUser.email)
        localStorage.setItem("userCredits", existingUser.credits?.toString() || "100")
        return
      }

      // User doesn't exist, create new user
      console.log("Creating new user with LINE data")

      // Generate a unique email and password
      const timestamp = Date.now()
      const randomSuffix = Math.random().toString(36).substring(2, 8)
      const uniqueEmail = `line_${lineProfile.userId}_${timestamp}_${randomSuffix}@lineuser.local`
      const password = `line_${lineProfile.userId}_${timestamp}`

      const { data: authUser, error: authError } = await supabase.auth.signUp({
        email: uniqueEmail,
        password: password,
        options: {
          data: {
            full_name: lineProfile.displayName,
            line_user_id: lineProfile.userId,
            avatar_url: lineProfile.pictureUrl,
            username: `line_${lineProfile.userId}`,
          },
        },
      })

      if (authError) {
        console.error("Error creating user:", authError)

        // If it's a rate limit error, retry with exponential backoff
        if (authError.message.includes("429") || authError.message.includes("rate") || retryCount < maxRetries) {
          console.log(`Retrying in ${retryDelay}ms...`)
          setTimeout(() => {
            authenticateWithBackend(lineProfile, retryCount + 1)
          }, retryDelay)
          return
        }

        throw authError
      }

      if (authUser.user) {
        console.log("User created successfully:", authUser.user.id)

        // Store user data in localStorage
        localStorage.setItem("userEmail", uniqueEmail)
        localStorage.setItem("userCredits", "100")

        // Try to update the profile with additional LINE data
        try {
          await supabase
            .from("profiles")
            .update({
              full_name: lineProfile.displayName,
              line_user_id: lineProfile.userId,
              avatar_url: lineProfile.pictureUrl,
              credits: 100,
            })
            .eq("id", authUser.user.id)
        } catch (updateError) {
          console.error("Error updating profile, but user was created:", updateError)
          // Don't throw here, user creation was successful
        }
      }
    } catch (err) {
      console.error("Error authenticating with backend:", err)

      // Even if backend auth fails, we can still use LINE login
      // Store minimal data for app functionality
      localStorage.setItem("userCredits", "100")

      if (retryCount < maxRetries) {
        console.log(`Retrying authentication in ${retryDelay}ms...`)
        setTimeout(() => {
          authenticateWithBackend(lineProfile, retryCount + 1)
        }, retryDelay)
      }
    }
  }

  // Login function
  const login = () => {
    if (!liff) return

    if (!liff.isLoggedIn()) {
      liff.login({ redirectUri: window.location.href })
    }
  }

  // Logout function
  const logout = async () => {
    if (!liff) return

    try {
      // Clear localStorage
      localStorage.removeItem("lineUserId")
      localStorage.removeItem("lineDisplayName")
      localStorage.removeItem("linePictureUrl")
      localStorage.removeItem("isLineLoggedIn")
      localStorage.removeItem("userEmail")
      localStorage.removeItem("userCredits")

      // Logout from LIFF
      if (liff.isLoggedIn()) {
        liff.logout()
      }

      // Logout from Supabase
      await supabase.auth.signOut()

      // Reset state
      setIsLoggedIn(false)
      setProfile(null)

      // Redirect to login page
      window.location.href = "/login"
    } catch (error) {
      console.error("Error during logout:", error)
      // Force reload as fallback
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

  return <LiffContext.Provider value={value}>{children}</LiffContext.Provider>
}
