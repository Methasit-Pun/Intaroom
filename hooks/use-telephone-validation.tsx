/**
 * Custom React hook for telephone requirement validation
 */

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { supabaseUrl, supabaseAnonKey } from "@/app/env"
import { checkUserTelephoneRequired, redirectToTelephoneSetup } from "@/lib/user-validation"

interface UseTelephoneValidationOptions {
  redirectOnMissing?: boolean
  returnUrl?: string
}

interface UseTelephoneValidationReturn {
  isLoading: boolean
  hasPhone: boolean
  error: string | null
  checkTelephone: () => Promise<boolean>
  redirectToSetup: () => void
}

/**
 * Hook to validate user's telephone number requirement
 * @param options Configuration options
 * @returns Validation state and utility functions
 */
export function useTelephoneValidation(
  options: UseTelephoneValidationOptions = {}
): UseTelephoneValidationReturn {
  const { redirectOnMissing = false, returnUrl } = options
  
  const [isLoading, setIsLoading] = useState(false)
  const [hasPhone, setHasPhone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClientComponentClient({
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
  })

  // Check telephone requirement for current user
  const checkTelephone = async (): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        setError("User not authenticated")
        setHasPhone(false)
        return false
      }

      const { hasPhone: userHasPhone, error: validationError } = await checkUserTelephoneRequired(
        session.user.id
      )

      if (validationError) {
        setError(validationError)
        setHasPhone(false)
        return false
      }

      setHasPhone(userHasPhone)
      setCurrentUserId(session.user.id)

      // Auto-redirect if missing and option is enabled
      if (!userHasPhone && redirectOnMissing) {
        redirectToSetup()
      }

      return userHasPhone
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to check telephone requirement"
      setError(errorMessage)
      setHasPhone(false)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Redirect to telephone setup
  const redirectToSetup = () => {
    const currentUrl = returnUrl || (typeof window !== "undefined" ? window.location.pathname + window.location.search : "")
    redirectToTelephoneSetup(router, currentUrl)
  }

  // Auto-check on mount if user changes
  useEffect(() => {
    const checkUserSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      // Only auto-check if we have a user and it's different from current
      if (session?.user && session.user.id !== currentUserId) {
        await checkTelephone()
      }
    }

    checkUserSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, supabase])

  return {
    isLoading,
    hasPhone,
    error,
    checkTelephone,
    redirectToSetup,
  }
}

/**
 * Hook that enforces telephone requirement before allowing actions
 * Automatically redirects if telephone is missing
 */
export function useRequireTelephone(returnUrl?: string) {
  return useTelephoneValidation({
    redirectOnMissing: true,
    returnUrl,
  })
}

/**
 * Hook for manual telephone validation without auto-redirect
 */
export function useCheckTelephone() {
  return useTelephoneValidation({
    redirectOnMissing: false,
  })
}