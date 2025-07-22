import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen bg-[#5A0D16] text-white">
      <div className="p-4 border-b border-[#8B1F2D]/30">
        <h1 className="text-xl font-semibold text-center">
          <span className="text-[#D4AF37]">INTANIA</span> RESERVATION DETAILS
        </h1>
      </div>
      <div className="flex-1 flex justify-center items-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-white mx-auto mb-4" />
          <p className="text-white/70">Loading reservation details...</p>
        </div>
      </div>
    </div>
  )
}
