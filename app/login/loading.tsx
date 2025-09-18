export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#5A0D16]">
      <div className="text-center">
        {/* Spinner */}
        <div className="relative mx-auto mb-6">
          <div className="w-16 h-16 border-4 border-[#E8E1D9]/20 border-t-[#E8E1D9] rounded-full animate-spin"></div>
        </div>
        
        {/* Loading text */}
        <h2 className="text-xl font-semibold text-white mb-2">
          Loading...
        </h2>
        <p className="text-white/70 text-sm">
          Please wait a moment
        </p>
      </div>
    </div>
  )
}
