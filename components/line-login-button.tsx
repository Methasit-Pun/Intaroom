"use client"

import { Button } from "@/components/ui/button"
import { useLiff } from "@/components/liff-provider"
import { Loader2 } from "lucide-react"
import { useState } from "react"

export default function LineLoginButton() {
  const { login, isReady, isLoggedIn } = useLiff()
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  // Add error state
  const [loginError, setLoginError] = useState<string | null>(null)

  // Update the handleLogin function
  const handleLogin = () => {
    if (isReady && !isLoggedIn) {
      setIsLoggingIn(true)
      setLoginError(null)
      try {
        console.log("Initiating LINE login")
        login()

        // Set a timeout to detect if login doesn't redirect
        setTimeout(() => {
          if (isLoggingIn) {
            setLoginError("Login request timed out. Please try again.")
            setIsLoggingIn(false)
          }
        }, 10000) // 10 second timeout
      } catch (error) {
        console.error("Error during LINE login:", error)
        setLoginError(error instanceof Error ? error.message : "Failed to connect to LINE")
        setIsLoggingIn(false)
      }
    }
  }

  // Add error message display to the return JSX after the button:
  return (
    <>
      <Button
        onClick={handleLogin}
        disabled={!isReady || isLoggedIn || isLoggingIn}
        className="w-full py-3 rounded-full bg-[#06C755] hover:bg-[#05B74B] text-white font-medium transition-colors text-lg h-12"
      >
        {isLoggingIn ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Connecting to LINE...
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-6 w-6 mr-2" fill="currentColor">
              <path d="M19.952 12.992c0-3.584-3.6-6.496-8.032-6.496-4.432 0-8.032 2.912-8.032 6.496 0 3.232 2.864 5.952 6.72 6.464.288.064.672.192.768.448.08.192.064.512.032.704 0 0-.096.576-.112.704-.032.192-.16.752.656.416.816-.352 4.384-2.592 5.984-4.432 1.104-1.216 1.632-2.464 1.632-3.84v-.464zm-11.2 1.856h-1.76c-.256 0-.464-.208-.464-.464v-2.72c0-.256.208-.464.464-.464s.464.208.464.464v2.256h1.296c.256 0 .464.208.464.464s-.208.464-.464.464zm1.296-.464c0 .256-.208.464-.464.464s-.464-.208-.464-.464v-2.72c0-.256.208-.464.464-.464s.464.208.464.464v2.72zm3.072 0c0 .192-.112.368-.288.432-.064.032-.128.032-.192.032-.128 0-.256-.064-.336-.16l-1.808-2.448v2.144c0 .256-.208.464-.464.464s-.464-.208-.464-.464v-2.72c0-.192.112-.368.288-.432.064-.032.128-.032.192-.032.128 0 .256.064.336.16l1.808 2.448v-2.144c0-.256.208-.464.464-.464s.464.208.464.464v2.72zm2.368.464h-1.76c-.256 0-.464-.208-.464-.464v-2.72c0-.256.208-.464.464-.464s.464.208.464.464v2.256h1.296c.256 0 .464.208.464.464s-.208.464-.464.464z" />
            </svg>
            Login with LINE
          </>
        )}
      </Button>
      {loginError && (
        <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded-md text-red-700 text-sm">
          <p>{loginError}</p>
          <p className="mt-1 text-xs">Please make sure you have a LINE account and try again.</p>
        </div>
      )}
      {!isReady && (
        <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded-md text-yellow-700 text-xs">
          LINE login is initializing. Please wait...
        </div>
      )}
    </>
  )
}
