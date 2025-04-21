// Create a proper singleton pattern for the Supabase client

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { supabaseUrl, supabaseAnonKey } from "@/app/env"
import type { Database } from "./database.types"

// Global variable to store the client instance
let supabaseInstance: ReturnType<typeof createClientComponentClient<Database>> | null = null

// Global variable to track initialization status
let isInitializing = false

// Auth state cache with expiration
const authCache = {
  isAuthenticated: null as boolean | null,
  lastChecked: 0,
  userId: null as string | null,
  expiresAt: 0,
}

/**
 * Creates a singleton Supabase client
 * This ensures we only have one instance throughout the application
 */
export function getSupabaseClient() {
  // If we already have an instance, return it
  if (supabaseInstance) {
    return supabaseInstance
  }

  // If we're already initializing, wait for it to complete
  if (isInitializing) {
    console.log("Supabase client initialization already in progress, waiting...")

    // Return a temporary client that will be replaced on next call
    // This is a workaround for concurrent initialization
    return createClientComponentClient<Database>({
      supabaseUrl,
      supabaseKey: supabaseAnonKey,
      options: {
        auth: {
          storageKey: "supabase.auth.temp.token",
          persistSession: true,
        },
      },
    })
  }

  // Set initializing flag
  isInitializing = true
  console.log("Creating Supabase client singleton...")

  try {
    // Create the client with a unique storage key
    supabaseInstance = createClientComponentClient<Database>({
      supabaseUrl,
      supabaseKey: supabaseAnonKey,
      options: {
        auth: {
          storageKey: "supabase.auth.main.token",
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      },
    })

    // Test the connection
    supabaseInstance.auth.getSession().then(
      () => console.log("✅ Supabase client initialized successfully"),
      (error) => console.error("❌ Supabase initialization test failed:", error),
    )

    return supabaseInstance
  } catch (error) {
    console.error("Error creating Supabase client:", error)
    throw error
  } finally {
    isInitializing = false
  }
}

/**
 * Fast check if user is authenticated using localStorage
 * This avoids making API calls for simple auth checks
 */
export function isAuthenticatedFast(): boolean {
  // Check localStorage first for faster response
  if (typeof window !== "undefined") {
    // Admin check
    if (localStorage.getItem("isAdmin") === "true") {
      return true
    }

    // User check
    if (localStorage.getItem("userLoggedIn") === "true") {
      return true
    }
  }

  // Not authenticated based on localStorage
  return false
}

/**
 * Check if user is authenticated with Supabase
 * Uses caching to reduce API calls
 */
export async function isUserAuthenticated(): Promise<boolean> {
  try {
    // Check if we have a valid cached result
    const now = Date.now()
    if (authCache.isAuthenticated !== null && now < authCache.expiresAt) {
      return authCache.isAuthenticated
    }

    // Fast check first
    if (isAuthenticatedFast()) {
      // Update cache
      authCache.isAuthenticated = true
      authCache.lastChecked = now
      authCache.expiresAt = now + 5 * 60 * 1000 // 5 minutes
      return true
    }

    // If not authenticated by fast check, verify with Supabase
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      console.error("Auth session error:", error)

      // Clear cache and return false
      authCache.isAuthenticated = false
      authCache.lastChecked = now
      authCache.userId = null
      authCache.expiresAt = now + 60 * 1000 // 1 minute for errors

      return false
    }

    const isAuth = !!data.session

    // Update cache
    authCache.isAuthenticated = isAuth
    authCache.lastChecked = now
    authCache.userId = data.session?.user?.id || null
    authCache.expiresAt = now + 5 * 60 * 1000 // 5 minutes

    // Also update localStorage for even faster checks
    if (typeof window !== "undefined" && isAuth) {
      localStorage.setItem("userLoggedIn", "true")
    }

    return isAuth
  } catch (error) {
    console.error("Error checking authentication:", error)
    return false
  }
}

/**
 * Set authentication state directly
 * This avoids unnecessary API calls
 */
export function setAuthState(isAuthenticated: boolean, userId: string | null = null) {
  const now = Date.now()

  // Update cache
  authCache.isAuthenticated = isAuthenticated
  authCache.lastChecked = now
  authCache.userId = userId
  authCache.expiresAt = now + 5 * 60 * 1000 // 5 minutes

  // Update localStorage
  if (typeof window !== "undefined") {
    if (isAuthenticated) {
      localStorage.setItem("userLoggedIn", "true")
    } else {
      localStorage.removeItem("userLoggedIn")
    }
  }
}

/**
 * Clear authentication state
 * Used during logout
 */
export function clearAuthState() {
  // Clear cache
  authCache.isAuthenticated = false
  authCache.lastChecked = Date.now()
  authCache.userId = null
  authCache.expiresAt = 0

  // Clear localStorage
  if (typeof window !== "undefined") {
    localStorage.removeItem("userLoggedIn")
    localStorage.removeItem("isAdmin")
    localStorage.removeItem("adminEmail")
  }
}
