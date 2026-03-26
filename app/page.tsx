"use client"

import RoomReservation from "@/components/room-reservation"
import AuthWrapper from "@/components/auth-wrapper"
import { LiffProvider } from "@/components/liff-provider"
import { liffId } from "@/app/env"

export default function Home() {
  return (
    <LiffProvider liffId={liffId}>
      <main className="min-h-screen">
        <AuthWrapper>
          <RoomReservation />
        </AuthWrapper>
      </main>
    </LiffProvider>
  )
}
