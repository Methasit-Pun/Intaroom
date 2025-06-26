"use client"

import { useLiff } from "@/components/liff-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useEffect, useState } from "react"

export default function LineProfile() {
  const { profile, isLoggedIn } = useLiff()
  const [localProfile, setLocalProfile] = useState<{
    displayName: string
    pictureUrl?: string
  } | null>(null)

  useEffect(() => {
    // If LIFF profile is not available, try to get from localStorage
    if (!profile) {
      const lineUserId = localStorage.getItem("lineUserId")
      const lineDisplayName = localStorage.getItem("lineDisplayName")
      const linePictureUrl = localStorage.getItem("linePictureUrl")

      if (lineUserId && lineDisplayName) {
        setLocalProfile({
          displayName: lineDisplayName,
          pictureUrl: linePictureUrl || undefined,
        })
      }
    }
  }, [profile])

  // Use LIFF profile or localStorage profile
  const displayProfile = profile || localProfile

  if (!isLoggedIn && !displayProfile) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-8 w-8 border border-white/20">
        <AvatarImage
          src={displayProfile?.pictureUrl || "/placeholder.svg"}
          alt={displayProfile?.displayName || "User"}
        />
        <AvatarFallback>{displayProfile?.displayName?.charAt(0) || "U"}</AvatarFallback>
      </Avatar>
      <div className="text-sm">
        <p className="font-medium truncate max-w-[120px]">{displayProfile?.displayName || "User"}</p>
      </div>
    </div>
  )
}
