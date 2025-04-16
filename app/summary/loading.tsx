export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen bg-[#5A0D16] text-white">
      <div className="p-4 border-b border-[#8B1F2D]/30">
        <h1 className="text-2xl font-semibold text-center">
          <span className="text-[#D4AF37]">INTANIA</span> ROOM RESERVATION
        </h1>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    </div>
  )
}
