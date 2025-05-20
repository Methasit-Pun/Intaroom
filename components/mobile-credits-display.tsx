"use client"

import { useState, useEffect } from "react"
import { Coins } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { supabaseUrl, supabaseAnonKey } from "@/app/env"

export default function MobileCreditsDisplay() {
  const [credits, setCredits] = useState(0)
  const [loading, setLoading] = useState(true)

  // Initialize Supabase client
  const supabase = createClientComponentClient({
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
  })

  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession()

        if (sessionData.session) {
          const { data } = await supabase
            .from("profiles")
            .select("credits")
            .eq("id", sessionData.session.user.id)
            .single()

          if (data) {
            setCredits(data.credits || 0)
          }
        }
      } catch (error) {
        console.error("Error fetching credits:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCredits()
  }, [supabase])

  if (loading) return null

  return (
    <div className="sm:hidden fixed bottom-4 right-4 z-10 flex items-center gap-1 px-3 py-2 bg-[#6D3B3B] rounded-full shadow-lg">
      <Coins className="h-4 w-4 text-[#D4AF37]" />
      <span className="text-sm font-medium text-white">{credits}</span>
    </div>
  )
}
