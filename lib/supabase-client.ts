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
