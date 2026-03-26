"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  AdminDashboardSkeleton,
  ReservationsListSkeleton,
  AnalyticsDashboardSkeleton,
  ReservationCardSkeleton,
  TabsSkeleton
} from "@/components/admin/admin-skeletons"

export default function SkeletonDemoPage() {
  const [activeDemo, setActiveDemo] = useState<string>('full')
  const [enhancedMode, setEnhancedMode] = useState(true)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Demo Controls */}
      <div className="bg-white border-b p-4">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold mb-4">Admin Dashboard Skeleton Loading Demo</h1>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setActiveDemo('full')}
              variant={activeDemo === 'full' ? 'default' : 'outline'}
            >
              Full Dashboard
            </Button>
            <Button
              onClick={() => setActiveDemo('reservations')}
              variant={activeDemo === 'reservations' ? 'default' : 'outline'}
            >
              Reservations List
            </Button>
            <Button
              onClick={() => setActiveDemo('analytics')}
              variant={activeDemo === 'analytics' ? 'default' : 'outline'}
            >
              Analytics
            </Button>
            <Button
              onClick={() => setActiveDemo('tabs')}
              variant={activeDemo === 'tabs' ? 'default' : 'outline'}
            >
              Tabs
            </Button>
            <Button
              onClick={() => setActiveDemo('cards')}
              variant={activeDemo === 'cards' ? 'default' : 'outline'}
            >
              Reservation Cards
            </Button>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <Button
              onClick={() => setEnhancedMode(!enhancedMode)}
              variant={enhancedMode ? 'default' : 'outline'}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {enhancedMode ? '🎨 Enhanced Animations' : '⚡ Simple Animations'}
            </Button>
            <span className="text-sm text-gray-500">
              {enhancedMode ? 'Showing advanced shimmer, wave, and stagger effects' : 'Showing basic pulse animations'}
            </span>
          </div>
          <p className="text-gray-600 mt-2">
            These skeleton loading states show while data is being fetched from Supabase
          </p>
        </div>
      </div>

      {/* Demo Content */}
      <div className="container mx-auto p-4">
        {activeDemo === 'full' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Full Dashboard Skeleton</h2>
            <AdminDashboardSkeleton />
          </div>
        )}

        {activeDemo === 'reservations' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Reservations List Skeleton</h2>
            <ReservationsListSkeleton />
          </div>
        )}

        {activeDemo === 'analytics' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Analytics Dashboard Skeleton</h2>
            <AnalyticsDashboardSkeleton />
          </div>
        )}

        {activeDemo === 'tabs' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Tabs Skeleton</h2>
            <TabsSkeleton />
          </div>
        )}

        {activeDemo === 'cards' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Reservation Cards Skeleton</h2>
            <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
              {Array.from({ length: 3 }).map((_, index) => (
                <ReservationCardSkeleton key={index} />
              ))}
            </div>            <div className="mt-4 p-3 bg-blue-50 rounded">
              <p className="text-sm text-blue-700">
                <strong>Animation Features:</strong> Each card uses staggered entry with varying delays, 
                shimmer effects on text elements, wave animations on icons, and floating/glowing button effects.
              </p>
            </div>          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 border-t p-4 mt-8">
        <div className="container mx-auto">
          <h3 className="text-lg font-semibold mb-2">Skeleton Loading Benefits</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>Creates engaging visual feedback with sophisticated animations</li>
            <li>Improves perceived performance with shimmer and wave effects</li>
            <li>Reduces user anxiety with smooth, orchestrated loading sequences</li>
            <li>Provides realistic content previews with proper spacing and proportions</li>
            <li>Maintains layout stability preventing jarring content jumps</li>
            <li>Enhances brand perception with polished, professional animations</li>
            <li>Supports accessibility with reduced motion preferences</li>
          </ul>
          
          <div className="mt-4 p-4 bg-white rounded border">
            <h4 className="font-semibold">Enhanced Animation Features:</h4>
            <ul className="list-disc list-inside mt-2 text-sm text-gray-600">
              <li><strong>Shimmer Effects:</strong> Elegant light sweep animations across elements</li>
              <li><strong>Wave Animations:</strong> Smooth gradient wave patterns for visual appeal</li>
              <li><strong>Staggered Loading:</strong> Elements appear in sequence for natural flow</li>
              <li><strong>Slide Animations:</strong> Cards and sections slide in from different directions</li>
              <li><strong>Chart Simulations:</strong> Realistic chart loading with bars and axes</li>
              <li><strong>Fade Transitions:</strong> Smooth opacity changes for professional feel</li>
              <li><strong>Scale Effects:</strong> Subtle zoom animations for modern UI</li>
            </ul>
            
            <div className="mt-4 p-3 bg-gray-50 rounded">
              <h5 className="font-medium text-sm">Animation Timing:</h5>
              <div className="grid grid-cols-2 gap-4 mt-2 text-xs">
                <div>
                  <code className="bg-white px-1 rounded">slideUp</code> - 0.6s ease-out
                </div>
                <div>
                  <code className="bg-white px-1 rounded">shimmer</code> - 2.5s infinite
                </div>
                <div>
                  <code className="bg-white px-1 rounded">wave</code> - 2s infinite
                </div>
                <div>
                  <code className="bg-white px-1 rounded">fadeIn</code> - 0.5s ease-out
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}