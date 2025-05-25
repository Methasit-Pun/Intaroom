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

        // If user is logged in, get profile and handle authentication
        if (liffInstance.isLoggedIn()) {
          console.log("User is logged in with LINE")
          const lineProfile = await liffInstance.getProfile()
          console.log("LINE profile:", lineProfile)

          setProfile({
            userId: lineProfile.userId,
            displayName: lineProfile.displayName,
            pictureUrl: lineProfile.pictureUrl,
            email: liffInstance.getDecodedIDToken()?.email,
          })

          // Handle Supabase authentication
          await handleSupabaseAuth(lineProfile)
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

  // Handle Supabase authentication
  const handleSupabaseAuth = async (lineProfile: any) => {
    try {
      console.log("Handling Supabase authentication for LINE user:", lineProfile.userId)

      // Check if user exists in Supabase
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
        console.log("Existing user found:", existingUser)

        // Sign in existing user
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: existingUser.email,
          password: `line_${lineProfile.userId}`, // Use LINE user ID as password
        })

        if (signInError) {
          console.error("Error signing in existing user:", signInError)
          // If sign in fails, we'll still redirect to profile to update info
        }

        // Check if user has completed their profile
        if (!existingUser.full_name || !existingUser.telephone) {
          console.log("User profile incomplete, redirecting to profile page")
          window.location.href = "/profile?setup=true"
        } else {
          console.log("User profile complete, redirecting to main page")
          window.location.href = "/"
        }
      } else {
        console.log("New user, creating account")

        // Create new user
        const userEmail = `line_${lineProfile.userId}@lineuser.local`
        const userPassword = `line_${lineProfile.userId}`

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: userEmail,
          password: userPassword,
          options: {
            data: {
              line_user_id: lineProfile.userId,
              display_name: lineProfile.displayName,
              avatar_url: lineProfile.pictureUrl,
            },
          },
        })

        if (authError) {
          console.error("Error creating user:", authError)
          throw authError
        }

        if (authData.user) {
          console.log("New user created:", authData.user.id)

          // Create profile record
          const { error: profileError } = await supabase.from("profiles").insert({
            id: authData.user.id,
            email: userEmail,
            line_user_id: lineProfile.userId,
            username: `line_${lineProfile.userId}`,
            full_name: lineProfile.displayName,
            avatar_url: lineProfile.pictureUrl,
            role: "user",
            email_verified: true,
            credits: 100,
          })

          if (profileError) {
            console.error("Error creating profile:", profileError)
            // Continue anyway, the trigger should handle profile creation
          }

          // Redirect to profile setup
          console.log("Redirecting new user to profile setup")
          window.location.href = "/profile?setup=true&new=true"
        }
      }
    } catch (err) {
      console.error("Error in Supabase authentication:", err)
      // Redirect to profile page anyway so user can try to complete setup
      window.location.href = "/profile?setup=true&error=true"
    }
  }

  // Login function
  const login = () => {
    if (!liff) return

    if (!liff.isLoggedIn()) {
      console.log("Initiating LINE login")
      liff.login({ redirectUri: window.location.href })
    }
  }

  // Logout function
  const logout = async () => {
    if (!liff) return

    try {
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
