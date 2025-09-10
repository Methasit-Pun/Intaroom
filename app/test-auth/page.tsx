"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function TestAuthPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to home page in production
    router.replace("/")
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Page Not Available</h1>
        <p className="text-gray-600">Redirecting to home page...</p>
      </div>
    </div>
  )
}
