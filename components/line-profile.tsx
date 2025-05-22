"use client"

import { useLiff } from "@/components/liff-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function LineProfile() {
  const { profile, isLoggedIn } = useLiff()

  if (!isLoggedIn || !profile) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-8 w-8 border border-white/20">
        <AvatarImage src={profile.pictureUrl || "/placeholder.svg"} alt={profile.displayName} />
        <AvatarFallback>{profile.displayName.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="text-sm">
        <p className="font-medium truncate max-w-[120px]">{profile.displayName}</p>
      </div>
    </div>
  )
}
