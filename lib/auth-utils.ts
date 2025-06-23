// Add a utility file to help with authentication

/**
 * Utility functions for authentication
 */

// Function to check if a user is authenticated on the client side
export function isAuthenticated(): boolean {
  // Check for admin authentication
  if (typeof window !== "undefined" && localStorage.getItem("isAdmin") === "true") {
    return true
  }

  // For regular users, we'll need to rely on the session check in components
  return false
}

// Function to get the appropriate redirect path after login
export function getPostLoginRedirect(): string {
  // Check if we're in an admin session
  if (typeof window !== "undefined" && localStorage.getItem("isAdmin") === "true") {
    return "/admin"
  }

  // For regular users, go to the main app
  return "/"
}

// Function to handle logout
export async function handleLogout(supabase: any, router: any) {
  try {
    // Clear admin-related localStorage items
    if (typeof window !== "undefined") {
      localStorage.removeItem("isAdmin")
      localStorage.removeItem("adminEmail")
    }

    // Clear admin cookie
    document.cookie = "isAdmin=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"

    // Sign out from Supabase (for regular users)
    if (supabase) {
      await supabase.auth.signOut()
    }

    // Force navigation to login
    if (router) {
      router.push("/login")
    } else if (typeof window !== "undefined") {
      window.location.href = "/login"
    }

    return true
  } catch (error) {
    console.error("Error during logout:", error)
    return false
  }
}
