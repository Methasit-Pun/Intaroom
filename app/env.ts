// These are baked into the client bundle at build time. Don't throw at module
// evaluation — Next.js evaluates SSR modules during build even for client components,
// and real secrets aren't available in CI. Errors surface at runtime if values are missing.
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
export const liffId = process.env.NEXT_PUBLIC_LIFF_ID || ""
