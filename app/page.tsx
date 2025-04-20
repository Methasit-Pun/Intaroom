import RoomReservation from "@/components/room-reservation"
import { Suspense } from "react"

export default function Home() {
  return (
    <main className="min-h-screen">
      <Suspense fallback={<div>Loading...</div>}>
        <RoomReservation />
      </Suspense>
    </main>
  )
}
