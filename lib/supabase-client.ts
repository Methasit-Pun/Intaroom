// Create or update this file to implement a singleton pattern for the Supabase client

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { supabaseUrl, supabaseAnonKey } from "@/app/env"
import type { Database } from "./database.types"

// Store the client instance
let supabaseClient: ReturnType<typeof createClientComponentClient<Database>> | null = null

// Function to get the Supabase client (singleton pattern)
export function getSupabaseClient() {
  if (!supabaseClient) {
    // Add console logging to debug initialization
    console.log("Initializing new Supabase client")

    // Ensure we have the required values
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing Supabase URL or Anon Key", {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseAnonKey,
      })
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
        },
      },
    })
  }
  return supabaseClient
}

// Add a function to reset the client (useful for debugging)
export function resetSupabaseClient() {
  supabaseClient = null
  return getSupabaseClient()
}

// Update the isUserAuthenticated function to handle refresh token errors
export async function isUserAuthenticated() {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      console.error("Error checking authentication:", error)

      // If we get a refresh token error, clear the session to prevent repeated errors
      if (error.message?.includes("refresh_token_not_found") || (error as any)?.code === "refresh_token_not_found") {
        console.log("Refresh token not found, clearing session")
        await supabase.auth.signOut()
        return false
      }

      return false
    }

    return !!data.session
  } catch (error) {
    console.error("Exception checking authentication:", error)

    // If there's an exception, try to sign out to clear any invalid session data
    try {
      const supabase = getSupabaseClient()
      await supabase.auth.signOut()
    } catch (e) {
      console.error("Failed to sign out after error:", e)
    }

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
    }

    return true // Error was handled
  }

  return false // Error wasn't handled
}
