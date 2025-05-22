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

        setLiff(liffInstance)
        setIsReady(true)
        setIsInClient(liffInstance.isInClient())
        setIsLoggedIn(liffInstance.isLoggedIn())

        // If user is logged in, get profile
        if (liffInstance.isLoggedIn()) {
          const lineProfile = await liffInstance.getProfile()
          setProfile({
            userId: lineProfile.userId,
            displayName: lineProfile.displayName,
            pictureUrl: lineProfile.pictureUrl,
            email: liffInstance.getDecodedIDToken()?.email,
          })

          // Authenticate with backend
          await authenticateWithBackend(lineProfile)
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
      // Check if user exists in Supabase
      const { data: existingUser, error: userError } = await supabase
        .from("profiles")
        .select("*")
        .eq("line_user_id", lineProfile.userId)
        .single()

      if (userError && userError.code !== "PGRST116") {
        // Error other than "not found"
        console.error("Error checking user:", userError)
        return
      }

      if (!existingUser) {
        // User doesn't exist, create a new user
        const { data: authUser, error: authError } = await supabase.auth.signUp({
          email: `line_${lineProfile.userId}@example.com`, // Generate a placeholder email
          password: crypto.randomUUID(), // Generate a random password
          options: {
            data: {
              full_name: lineProfile.displayName,
              line_user_id: lineProfile.userId,
            },
          },
        })

        if (authError) {
          console.error("Error creating user:", authError)
          return
        }

        // Update profile with LINE info
        await supabase
          .from("profiles")
          .update({
            full_name: lineProfile.displayName,
            line_user_id: lineProfile.userId,
            avatar_url: lineProfile.pictureUrl,
          })
          .eq("id", authUser.user?.id)
      } else {
        // User exists, sign in
        const { data: authUser, error: signInError } = await supabase.auth.signInWithPassword({
          email: existingUser.email,
          password: existingUser.line_user_id, // Use LINE user ID as password
        })

        if (signInError) {
          console.error("Error signing in:", signInError)
        }
      }
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
