import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// Enhanced skeleton with wave animation
const WaveSkeleton = ({ className, delay = 0, ...props }: React.HTMLAttributes<HTMLDivElement> & { delay?: number }) => (
  <div
    className={cn(
      "relative overflow-hidden rounded-md",
      "bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%]",
      "animate-[wave_2s_ease-in-out_infinite]",
      className
    )}
    style={{ 
      animationDelay: `${delay}ms`,
      backgroundPosition: '-200% 0'
    }}
    {...props}
  />
)

// Pulsing skeleton with custom timing
const PulseSkeleton = ({ className, duration = "1.5s", ...props }: React.HTMLAttributes<HTMLDivElement> & { duration?: string }) => (
  <div
    className={cn("rounded-md bg-gray-300 animate-pulse", className)}
    style={{
      animationDuration: duration,
      animationTimingFunction: 'cubic-bezier(0.4, 0, 0.6, 1)'
    }}
    {...props}
  />
)

// Shimmer skeleton with gradient
const ShimmerSkeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "relative overflow-hidden rounded-md bg-gray-300",
      "before:absolute before:inset-0 before:-translate-x-full",
      "before:animate-[shimmer_2.5s_infinite] before:bg-gradient-to-r",
      "before:from-transparent before:via-white/90 before:to-transparent",
      "after:absolute after:inset-0 after:animate-pulse after:bg-gray-200/50",
      className
    )}
    {...props}
  />
)

// Breathing skeleton with scale animation
const BreathingSkeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "rounded-md bg-gray-200 animate-[breathe_3s_ease-in-out_infinite]",
      className
    )}
    {...props}
  />
)

// Floating skeleton with subtle movement
const FloatingSkeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "rounded-md bg-gray-300 animate-[float_4s_ease-in-out_infinite]",
      className
    )}
    {...props}
  />
)

// Glowing skeleton with shadow animation
const GlowingSkeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "rounded-md bg-gray-200 animate-[glow_2s_ease-in-out_infinite]",
      className
    )}
    {...props}
  />
)

// Skeleton for reservation card with enhanced animations
export function ReservationCardSkeleton({ index = 0 }: { index?: number }) {
  const baseDelay = index * 100
  
  return (
    <div className="p-4 border-b border-gray-200 animate-[slideUp_0.6s_ease-out] opacity-0 animate-fill-forwards"
         style={{ animationDelay: `${baseDelay}ms` }}>
      {/* Header with user and status */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <WaveSkeleton className="h-4 w-4 rounded-full" delay={baseDelay} />
          <ShimmerSkeleton className="h-4 w-32" />
        </div>
        <PulseSkeleton className="h-6 w-16 rounded-full" duration="2s" />
      </div>

      {/* Details */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2">
          <WaveSkeleton className="h-4 w-4 rounded" delay={baseDelay + 50} />
          <ShimmerSkeleton className="h-4 w-24" />
        </div>
        <div className="flex items-center gap-2">
          <WaveSkeleton className="h-4 w-4 rounded" delay={baseDelay + 100} />
          <ShimmerSkeleton className="h-4 w-28" />
        </div>
        <div className="flex items-center gap-2">
          <WaveSkeleton className="h-4 w-4 rounded" delay={baseDelay + 150} />
          <ShimmerSkeleton className="h-4 w-36" />
        </div>
        <div className="space-y-1">
          <ShimmerSkeleton className="h-4 w-40" />
          <PulseSkeleton className="h-3 w-48" duration="1.8s" />
        </div>
        <div className="flex items-center gap-2">
          <WaveSkeleton className="h-3 w-3 rounded-full" delay={baseDelay + 200} />
          <ShimmerSkeleton className="h-3 w-44" />
        </div>
        <div className="flex items-center gap-2">
          <WaveSkeleton className="h-3 w-3 rounded-full" delay={baseDelay + 250} />
          <ShimmerSkeleton className="h-3 w-32" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <FloatingSkeleton className="h-8 w-20 rounded" />
        <GlowingSkeleton className="h-8 w-20 rounded" />
        <PulseSkeleton className="h-8 w-28 rounded" duration="2.6s" />
      </div>
    </div>
  )
}

// Skeleton for reservations list with staggered animations
export function ReservationsListSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow animate-[fadeIn_0.5s_ease-out]">
      {/* Filters and Controls */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <ShimmerSkeleton className="h-10 w-full rounded-md" />
          </div>
          <div className="flex gap-2">
            <PulseSkeleton className="h-10 w-32 rounded" duration="1.5s" />
            <PulseSkeleton className="h-10 w-36 rounded" duration="1.7s" />
            <PulseSkeleton className="h-10 w-24 rounded" duration="1.9s" />
          </div>
        </div>
      </div>

      {/* Reservation Cards */}
      <div className="divide-y divide-gray-200">
        {Array.from({ length: 5 }).map((_, index) => (
          <ReservationCardSkeleton key={index} index={index} />
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t animate-[slideUp_0.8s_ease-out_0.5s] opacity-0 animate-fill-forwards">
        <ShimmerSkeleton className="h-4 w-48" />
        <div className="flex gap-2">
          <WaveSkeleton className="h-8 w-20 rounded" delay={600} />
          <WaveSkeleton className="h-8 w-24 rounded" delay={700} />
          <WaveSkeleton className="h-8 w-16 rounded" delay={800} />
        </div>
      </div>
    </div>
  )
}

// Skeleton for analytics cards with breathing animation
export function AnalyticsCardSkeleton() {
  return (
    <div className="text-center p-4 bg-gray-50 rounded transform transition-all duration-500 hover:scale-105">
      <BreathingSkeleton className="h-8 w-16 mx-auto mb-2 rounded" />
      <ShimmerSkeleton className="h-4 w-24 mx-auto rounded" />
    </div>
  )
}

// Skeleton for chart with gradient animation
export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="w-full relative overflow-hidden rounded-lg bg-gray-100" style={{ height }}>
      <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200
                     animate-[chartLoad_3s_ease-in-out_infinite] bg-[length:200%_100%]" />
      <div className="absolute inset-4 bg-gradient-to-t from-gray-300/50 to-transparent
                     animate-[chartBars_2s_ease-in-out_infinite_alternate]" />
      <div className="absolute bottom-4 left-4 right-4 h-1 bg-gray-400 rounded-full
                     animate-[chartAxis_1.5s_ease-in-out_infinite]" />
      <div className="absolute top-4 bottom-4 left-4 w-1 bg-gray-400 rounded-full
                     animate-[chartAxis_1.5s_ease-in-out_infinite_0.5s]" />
      {/* Animated data points */}
      <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
      <div className="absolute top-1/3 left-1/2 w-2 h-2 bg-gray-400 rounded-full animate-pulse"
           style={{ animationDelay: '0.5s' }} />
      <div className="absolute top-1/2 right-1/4 w-2 h-2 bg-gray-400 rounded-full animate-pulse"
           style={{ animationDelay: '1s' }} />
    </div>
  )
}

// Skeleton for analytics dashboard with complex animations
export function AnalyticsDashboardSkeleton() {
  return (
    <Card className="animate-[fadeIn_0.6s_ease-out]">
      <CardHeader>
        <div className="flex justify-between items-center">
          <ShimmerSkeleton className="h-6 w-40" />
          <PulseSkeleton className="h-10 w-32 rounded" duration="2s" />
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="animate-[slideUp_0.6s_ease-out] opacity-0 animate-fill-forwards"
                 style={{ animationDelay: `${index * 100}ms` }}>
              <AnalyticsCardSkeleton />
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="animate-[slideLeft_0.8s_ease-out_0.3s] opacity-0 animate-fill-forwards">
            <ShimmerSkeleton className="h-6 w-32 mb-4" />
            <ChartSkeleton />
          </div>
          <div className="animate-[slideRight_0.8s_ease-out_0.5s] opacity-0 animate-fill-forwards">
            <ShimmerSkeleton className="h-6 w-36 mb-4" />
            <ChartSkeleton />
          </div>
        </div>

        {/* Daily Bookings Trend */}
        <div className="mt-6 animate-[slideUp_0.8s_ease-out_0.7s] opacity-0 animate-fill-forwards">
          <ShimmerSkeleton className="h-6 w-40 mb-4" />
          <ChartSkeleton />
        </div>
      </CardContent>
    </Card>
  )
}

// Skeleton for tabs with staggered animations
export function TabsSkeleton() {
  return (
    <div className="w-full animate-[fadeIn_0.5s_ease-out]">
      {/* Tab triggers */}
      <div className="grid grid-cols-4 h-10 bg-muted rounded-md p-1 mb-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="animate-[slideDown_0.6s_ease-out] opacity-0 animate-fill-forwards"
               style={{ animationDelay: `${index * 100}ms` }}>
            <WaveSkeleton className="h-8 rounded-sm" delay={index * 150} />
          </div>
        ))}
      </div>
      
      {/* Tab content */}
      <div className="animate-[slideUp_0.8s_ease-out_0.5s] opacity-0 animate-fill-forwards">
        <ReservationsListSkeleton />
      </div>
    </div>
  )
}

// Skeleton for header with sliding animations
export function HeaderSkeleton() {
  return (
    <header className="bg-[#5A0D16] text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="animate-[slideRight_0.6s_ease-out] opacity-0 animate-fill-forwards">
            <div className="h-8 w-64 bg-white/20 rounded relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent
                           animate-[shimmer_3s_infinite] -translate-x-full" />
            </div>
          </div>
          <div className="animate-[slideRight_0.6s_ease-out_0.2s] opacity-0 animate-fill-forwards">
            <FloatingSkeleton className="h-8 w-20 bg-white/20" />
          </div>
        </div>
        <div className="animate-[slideLeft_0.6s_ease-out_0.4s] opacity-0 animate-fill-forwards">
          <GlowingSkeleton className="h-8 w-16 bg-white/20" />
        </div>
      </div>
    </header>
  )
}

// Full page skeleton with orchestrated animations
export function AdminDashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderSkeleton />
      
      <div className="container mx-auto p-4">
        <div className="animate-[zoomIn_0.8s_ease-out_0.6s] opacity-0 animate-fill-forwards">
          <TabsSkeleton />
        </div>
        
        <div className="mt-8 animate-[slideUp_1s_ease-out_1s] opacity-0 animate-fill-forwards">
          <AnalyticsDashboardSkeleton />
        </div>
      </div>
    </div>
  )
}

// Simple loading skeleton (basic pulse)
const SimpleSkeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("rounded-md bg-gray-300 animate-pulse", className)}
    {...props}
  />
)

// Loading states for different sections
export function LoadingSection({ 
  title, 
  children 
}: { 
  title: string
  children?: React.ReactNode 
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-5 w-32" />
      </div>
      {children}
    </div>
  )
}

// Inline loading for buttons and small elements
export function InlineLoading({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Skeleton className="h-4 w-4 rounded-full" />
      <span className="text-gray-500">Loading...</span>
    </div>
  )
}

// Table skeleton for desktop view
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="hidden lg:block animate-[fadeIn_0.5s_ease-out]">
      <table className="min-w-full bg-white">
        <thead className="bg-gray-50">
          <tr>
            {Array.from({ length: 8 }).map((_, index) => (
              <th key={index} className="px-6 py-3">
                <ShimmerSkeleton className="h-4 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className="animate-[slideUp_0.6s_ease-out] opacity-0 animate-fill-forwards"
                style={{ animationDelay: `${rowIndex * 100}ms` }}>
              {Array.from({ length: 8 }).map((_, cellIndex) => (
                <td key={cellIndex} className="px-6 py-4">
                  {cellIndex % 3 === 0 ? (
                    <WaveSkeleton className="h-4 w-16" delay={cellIndex * 50} />
                  ) : cellIndex % 3 === 1 ? (
                    <PulseSkeleton className="h-4 w-16" />
                  ) : (
                    <ShimmerSkeleton className="h-4 w-16" />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}