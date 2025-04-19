import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { supabaseUrl, supabaseAnonKey } from "@/app/env"
import type { Database } from "./database.types"

// Store the client instance
let supabaseClient: ReturnType<typeof createClientComponentClient<Database>> | null = null

// Function to get the Supabase client (singleton pattern)
export function getSupabaseClient() {
  if (!supabaseClient) {
    // Ensure we have the required values
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing Supabase URL or Anon Key")
      throw new Error("Database configuration is missing. Please contact support.")
    }

    supabaseClient = createClientComponentClient<Database>({
      supabaseUrl,
      supabaseKey: supabaseAnonKey,
      options: {
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

// Reset the client (useful for debugging)
export function resetSupabaseClient() {
  supabaseClient = null
  return getSupabaseClient()
}

// Check if user is authenticated with error handling
export async function isUserAuthenticated() {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      console.error("Error checking authentication:", error)
      return false
    }

    return !!data.session
  } catch (error) {
    console.error("Exception checking authentication:", error)
    return false
  }
}

// Simple cache implementation
const cache: Record<string, { data: any; timestamp: number }> = {}
const CACHE_TTL = 60000 // 1 minute cache TTL

// Function to get data with caching
export async function getCachedData<T>(key: string, fetchFn: () => Promise<T>, ttl = CACHE_TTL): Promise<T> {
  // Check if we have a valid cached value
  const cachedItem = cache[key]
  const now = Date.now()

  if (cachedItem && now - cachedItem.timestamp < ttl) {
    return cachedItem.data
  }

  // If not cached or expired, fetch fresh data
  const data = await fetchFn()

  // Cache the result
  cache[key] = {
    data,
    timestamp: now,
  }

  return data
}

// Clear cache
export function clearCache(key?: string) {
  if (key) {
    delete cache[key]
  } else {
    Object.keys(cache).forEach((k) => delete cache[k])
  }
}
