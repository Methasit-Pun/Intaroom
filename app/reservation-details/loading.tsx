import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen bg-[#5A0D16] text-white">
      <div className="p-4 border-b border-[#8B1F2D]/30 flex justify-between items-center">
        <div className="w-24"></div>
        <h1 className="text-xl font-semibold text-center flex-1">
          <span className="text-[#D4AF37]">Reservation</span> Details
        </h1>
        <div className="w-24"></div>
      </div>
      <div className="flex-1 flex justify-center items-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-white mb-4" />
          <p className="text-white/80">Loading reservation details...</p>
        </div>
      </div>
    </div>
  )
}
