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
          setProfile({
            userId: lineProfile.userId,
            displayName: lineProfile.displayName,
            pictureUrl: lineProfile.pictureUrl,
            email: liffInstance.getDecodedIDToken()?.email,
          })

          // Authenticate with backend
          await authenticateWithBackend(lineProfile)
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
        // Create a simple anonymous user with LINE data
        const randomEmail = `line_${lineProfile.userId}_${Math.random().toString(36).substring(2)}@example.com`
        const randomPassword = crypto.randomUUID()

        console.log("Creating new user with LINE data")

        const { data: authUser, error: authError } = await supabase.auth.signUp({
          email: randomEmail,
          password: randomPassword,
          options: {
            data: {
              full_name: lineProfile.displayName,
              line_user_id: lineProfile.userId,
              avatar_url: lineProfile.pictureUrl,
            },
          },
        })

        if (authError) {
          console.error("Error creating user:", authError)
        } else {
          console.log("User created successfully")
        }
      } else {
        console.log("User already exists, signing in")

        // User exists, just update the session
        await supabase.auth
          .signInWithPassword({
            email: existingUser.email,
            password: existingUser.line_user_id || "default_password",
          })
          .catch((err) => {
            console.log("Error signing in existing user, creating session anyway:", err)
            // Even if sign in fails, we'll continue with the LINE session
          })
      }

      // Force redirect to main page after successful LINE login
      window.location.href = "/"
    } catch (err) {
      console.error("Error authenticating with backend:", err)
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

  return <LiffContext.Provider value={value}>{children}</LiffContext.Provider>
}
