// Create or update this file to implement a singleton pattern for the Supabase client

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { supabaseUrl, supabaseAnonKey } from "@/app/env"
import type { Database } from "./database.types"

// Store the client instance
let supabaseClient: ReturnType<typeof createClientComponentClient<Database>> | null = null

// Add a flag to track initialization status
let isInitializing = false

// Add a cache for authentication state
const authCache: {
  isAuthenticated: boolean | null
  lastChecked: number
  userId: string | null
} = {
  isAuthenticated: null,
  lastChecked: 0,
  userId: null,
}

// Function to get the Supabase client (singleton pattern)
export function getSupabaseClient() {
  if (!supabaseClient && !isInitializing) {
    // Set initializing flag to prevent concurrent initialization
    isInitializing = true

    // Add console logging to debug initialization
    console.log("Initializing new Supabase client (should happen only once)")

    // Ensure we have the required values
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing Supabase URL or Anon Key", {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseAnonKey,
      })
      isInitializing = false
      throw new Error("Database configuration is missing. Please contact support.")
    }

    supabaseClient = createClientComponentClient<Database>({
      supabaseUrl,
      supabaseKey: supabaseAnonKey,
      options: {
        // Add additional options to help with auth persistence
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          // Add storage option to ensure consistent storage mechanism
          storage: {
            getItem: (key) => {
              if (typeof window === "undefined") return null
              return window.localStorage.getItem(key)
            },
            setItem: (key, value) => {
              if (typeof window === "undefined") return
              window.localStorage.setItem(key, value)
            },
            removeItem: (key) => {
              if (typeof window === "undefined") return
              window.localStorage.removeItem(key)
            },
          },
        },
      },
    })

    // Reset initializing flag
    isInitializing = false
  }

  return supabaseClient
}

// Add a function to reset the client (useful for debugging)
export function resetSupabaseClient() {
  supabaseClient = null
  authCache.isAuthenticated = null
  authCache.lastChecked = 0
  authCache.userId = null
  return getSupabaseClient()
}

// Update the isUserAuthenticated function to use caching
export async function isUserAuthenticated() {
  try {
    // Check cache first (valid for 5 minutes)
    const now = Date.now()
    const cacheAge = now - authCache.lastChecked

    if (authCache.isAuthenticated !== null && cacheAge < 5 * 60 * 1000) {
      console.log("Using cached authentication state:", authCache.isAuthenticated)
      return authCache.isAuthenticated
    }

    // If we have a localStorage flag for admin, use that
    if (typeof window !== "undefined" && localStorage.getItem("isAdmin") === "true") {
      console.log("Admin authentication from localStorage")
      authCache.isAuthenticated = true
      authCache.lastChecked = now
      return true
    }

    // If we have a localStorage flag for user login, use that
    if (typeof window !== "undefined" && localStorage.getItem("userLoggedIn") === "true") {
      console.log("User authentication from localStorage")
      authCache.isAuthenticated = true
      authCache.lastChecked = now
      return true
    }

    // Otherwise check with Supabase
    const supabase = getSupabaseClient()
    console.log("Checking if user is authenticated with Supabase...")
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      console.error("Error checking authentication:", error)

      // If we get a refresh token error, clear the session to prevent repeated errors
      if (error.message?.includes("refresh_token_not_found") || (error as any)?.code === "refresh_token_not_found") {
        console.log("Refresh token not found, clearing session")
        await supabase.auth.signOut()
        authCache.isAuthenticated = false
        authCache.lastChecked = now
        authCache.userId = null
        return false
      }

      authCache.isAuthenticated = false
      authCache.lastChecked = now
      return false
    }

    const isAuth = !!data.session
    console.log("Authentication check result:", isAuth)

    // Update cache
    authCache.isAuthenticated = isAuth
    authCache.lastChecked = now
    authCache.userId = data.session?.user?.id || null

    return isAuth
  } catch (error) {
    console.error("Exception checking authentication:", error)

    // If there's an exception, try to sign out to clear any invalid session data
    try {
      const supabase = getSupabaseClient()
      await supabase.auth.signOut()
    } catch (e) {
      console.error("Failed to sign out after error:", e)
    }

    // Update cache
    authCache.isAuthenticated = false
    authCache.lastChecked = Date.now()
    authCache.userId = null

    return false
  }
}

// Add a function to handle auth errors gracefully
export async function handleAuthError(error: any) {
  console.error("Auth error:", error)

  // Check if it's a refresh token error
  if (
    error?.message?.includes("refresh_token_not_found") ||
    error?.code === "refresh_token_not_found" ||
    error?.__isAuthError
  ) {
    console.log("Handling auth error by signing out")
    try {
      const supabase = getSupabaseClient()
      await supabase.auth.signOut()
    } catch (e) {
      console.error("Failed to sign out after auth error:", e)
    }

    // Clear any local storage items related to auth
    if (typeof window !== "undefined") {
      localStorage.removeItem("supabase.auth.token")
      localStorage.removeItem("supabase.auth.expires_at")
      localStorage.removeItem("userLoggedIn")
    }

    // Update cache
    authCache.isAuthenticated = false
    authCache.lastChecked = Date.now()
    authCache.userId = null

    return true // Error was handled
  }

  return false // Error wasn't handled
}

// Add a function to set authentication state directly (to avoid unnecessary checks)
export function setAuthState(isAuthenticated: boolean, userId: string | null = null) {
  authCache.isAuthenticated = isAuthenticated
  authCache.lastChecked = Date.now()
  authCache.userId = userId

  // Also set localStorage flag for faster checks
  if (typeof window !== "undefined") {
    if (isAuthenticated) {
      localStorage.setItem("userLoggedIn", "true")
    } else {
      localStorage.removeItem("userLoggedIn")
    }
  }
}
