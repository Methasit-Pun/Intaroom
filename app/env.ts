const _supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
if (!_supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL")
export const supabaseUrl: string = _supabaseUrl

const _supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!_supabaseAnonKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY")
export const supabaseAnonKey: string = _supabaseAnonKey

// Add your LINE LIFF ID here (set NEXT_PUBLIC_LIFF_ID in .env.local)
export const liffId = process.env.NEXT_PUBLIC_LIFF_ID || ""
