import RoomReservation from "@/components/room-reservation"
import MobileCreditsDisplay from "@/components/mobile-credits-display"

export default function Home() {
  return (
    <main className="min-h-screen">
      <RoomReservation />
      <MobileCreditsDisplay />
    </main>
  )
}
