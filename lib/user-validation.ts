/**
 * Utility functions for user validation and profile checks
 */

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { supabaseUrl, supabaseAnonKey } from "@/app/env"

export interface UserProfile {
  id: string
  full_name: string | null
  email: string
  telephone: string | null
  credits: number
  username: string | null
}

/**
 * Check if user has completed required profile information (telephone number)
 * @param userId - The user ID to check
 * @returns Promise<{hasPhone: boolean, profile: UserProfile | null, error: string | null}>
 */
export async function checkUserTelephoneRequired(userId: string): Promise<{
  hasPhone: boolean
  profile: UserProfile | null
  error: string | null
}> {
  try {
    const supabase = createClientComponentClient({
      supabaseUrl,
      supabaseKey: supabaseAnonKey,
    })

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, telephone, credits, username")
      .eq("id", userId)
      .single()

    if (error) {
      console.error("Error fetching user profile:", error)
      return {
        hasPhone: false,
        profile: null,
        error: "Failed to fetch user profile"
      }
    }

    if (!profile) {
      return {
        hasPhone: false,
        profile: null,
        error: "User profile not found"
      }
    }

    // Check if telephone is provided and not empty
    const hasValidPhone = profile.telephone && profile.telephone.trim().length > 0

    return {
      hasPhone: !!hasValidPhone,
      profile: profile as UserProfile,
      error: null
    }
  } catch (error) {
    console.error("Error in checkUserTelephoneRequired:", error)
    return {
      hasPhone: false,
      profile: null,
      error: "An unexpected error occurred"
    }
  }
}

/**
 * Redirect user to profile page with telephone requirement message
 * @param router - Next.js router instance
 * @param returnUrl - URL to return to after completing profile
 */
export function redirectToTelephoneSetup(router: any, returnUrl?: string) {
  const params = new URLSearchParams()
  params.set("setup", "true")
  params.set("required", "telephone")
  
  if (returnUrl) {
    params.set("returnUrl", returnUrl)
  }
  
  router.push(`/profile?${params.toString()}`)
}

/**
 * Validate telephone number format
 * @param telephone - The telephone number to validate
 * @returns boolean indicating if the telephone number is valid
 */
export function validateTelephoneNumber(telephone: string): boolean {
  if (!telephone || telephone.trim().length === 0) {
    return false
  }

  // Remove all non-digit characters for validation
  const digitsOnly = telephone.replace(/\D/g, "")
  
  // Check if it's a valid length (8-15 digits is generally acceptable)
  // Thai phone numbers are typically 9-10 digits (including area code)
  if (digitsOnly.length < 8 || digitsOnly.length > 15) {
    return false
  }

  return true
}

/**
 * Format telephone number for display
 * @param telephone - The telephone number to format
 * @returns Formatted telephone number string
 */
export function formatTelephoneNumber(telephone: string): string {
  if (!telephone) return ""
  
  // Remove all non-digit characters
  const digitsOnly = telephone.replace(/\D/g, "")
  
  // Format Thai phone numbers (10 digits: XXX-XXX-XXXX)
  if (digitsOnly.length === 10) {
    return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`
  }
  
  // Format international numbers (add spaces every 3-4 digits)
  if (digitsOnly.length > 10) {
    return digitsOnly.replace(/(\d{3})(\d{3})(\d{4})(.*)/, "$1-$2-$3-$4")
  }
  
  // For shorter numbers, just return the digits
  return digitsOnly
}