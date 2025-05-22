import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { supabaseUrl, supabaseAnonKey } from "@/app/env"
import type { SupabaseClient } from "@supabase/supabase-js"

// Create a singleton instance of the Supabase client
let supabaseInstance: SupabaseClient | null = null

export const getSupabaseClient = () => {
  if (!supabaseInstance) {
    supabaseInstance = createClientComponentClient({
      supabaseUrl,
      supabaseKey: supabaseAnonKey,
    })
  }
  return supabaseInstance
}
