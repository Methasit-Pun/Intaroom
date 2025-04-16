import { getSupabaseClient } from "./supabase-client"

export async function checkSupabaseConnection() {
  try {
    const supabase = getSupabaseClient()

    // Try to get the session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

    // Try a simple query to check database access
    const { data: roomsData, error: roomsError } = await supabase.from("rooms").select("id, name").limit(1)

    return {
      success: !sessionError && !roomsError,
      sessionStatus: {
        hasSession: !!sessionData.session,
        error: sessionError?.message,
      },
      databaseStatus: {
        canQuery: !!roomsData,
        error: roomsError?.message,
      },
    }
  } catch (error) {
    console.error("Supabase connection check failed:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
