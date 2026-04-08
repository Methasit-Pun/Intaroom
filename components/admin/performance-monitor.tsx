"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Clock, Database, Zap, RefreshCw } from "lucide-react"
import { adminCache, getPerformanceReport, type PerformanceMetrics } from "@/lib/admin-api"

interface PerformanceMonitorProps {
  className?: string
}

export function PerformanceMonitor({ className }: PerformanceMonitorProps) {
  const [stats, setStats] = useState({
    hits: 0,
    misses: 0,
    sets: 0,
    hitRate: '0.0%',
    size: 0
  })
  
  const [performanceReport, setPerformanceReport] = useState<{
    totalQueries: number
    cacheHits: number
    cacheHitRate: string
    avgDuration: string
    metrics: PerformanceMetrics[]
  }>({
    totalQueries: 0,
    cacheHits: 0,
    cacheHitRate: '0.0',
    avgDuration: '0.0',
    metrics: []
  })

  const updateStats = () => {
    const cacheStats = adminCache.getStats()
    const perfReport = getPerformanceReport()
    setStats(cacheStats)
    setPerformanceReport(perfReport)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    updateStats()
    
    // Auto-refresh stats every 5 seconds
    const interval = setInterval(updateStats, 5000)
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (hitRate: string) => {
    const rate = parseFloat(hitRate)
    if (rate >= 80) return "bg-green-100 text-green-800"
    if (rate >= 60) return "bg-yellow-100 text-yellow-800"
    return "bg-red-100 text-red-800"
  }

  const getPerformanceColor = (avgDuration: string) => {
    const duration = parseFloat(avgDuration)
    if (duration <= 500) return "bg-green-100 text-green-800"
    if (duration <= 1000) return "bg-yellow-100 text-yellow-800"
    return "bg-red-100 text-red-800"
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Performance Monitor
          </CardTitle>
          <Button variant="outline" size="sm" onClick={updateStats}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cache Performance */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.hits}</div>
            <div className="text-xs text-gray-600">Cache Hits</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.misses}</div>
            <div className="text-xs text-gray-600">Cache Misses</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.size}</div>
            <div className="text-xs text-gray-600">Cache Size</div>
          </div>
          <div className="text-center">
            <Badge className={getStatusColor(stats.hitRate)}>
              {stats.hitRate}
            </Badge>
            <div className="text-xs text-gray-600 mt-1">Hit Rate</div>
          </div>
        </div>

        {/* Query Performance */}
        <div className="pt-3 border-t">
          <div className="flex items-center gap-2 mb-3">
            <Database className="h-4 w-4" />
            <span className="font-medium">Query Performance</span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-lg font-semibold">{performanceReport.totalQueries}</div>
              <div className="text-xs text-gray-600">Total Queries</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">{performanceReport.cacheHits}</div>
              <div className="text-xs text-gray-600">From Cache</div>
            </div>
            <div className="text-center">
              <Badge className={getPerformanceColor(performanceReport.avgDuration)}>
                {performanceReport.avgDuration}ms
              </Badge>
              <div className="text-xs text-gray-600 mt-1">Avg Duration</div>
            </div>
          </div>
        </div>

        {/* Performance Tips */}
        <div className="pt-3 border-t">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4" />
            <span className="font-medium text-sm">Performance Tips</span>
          </div>
          
          <div className="space-y-1 text-xs text-gray-600">
            {parseFloat(stats.hitRate) < 60 && (
              <div className="text-amber-600">• Low cache hit rate - consider longer TTL</div>
            )}
            {parseFloat(performanceReport.avgDuration) > 1000 && (
              <div className="text-red-600">• Slow queries detected - check database indexes</div>
            )}
            {stats.size > 50 && (
              <div className="text-blue-600">• Large cache size - consider periodic cleanup</div>
            )}
            {parseFloat(stats.hitRate) >= 80 && parseFloat(performanceReport.avgDuration) <= 500 && (
              <div className="text-green-600">• ✅ Excellent performance! Using optimized 20 items/page</div>
            )}
            <div className="text-blue-600">• 💡 20 items per page provides optimal loading speed</div>
          </div>
        </div>

        {/* Optimization Status */}
        <div className="pt-3 border-t">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4" />
            <span className="font-medium text-sm">Optimizations Active</span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-xs">
              ✅ Single Query JOINs  
            </Badge>
            <Badge variant="secondary" className="text-xs">
              ✅ 20 Items/Page (Optimized)
            </Badge>
            <Badge variant="secondary" className="text-xs">
              ✅ Server-side Pagination
            </Badge>
            <Badge variant="secondary" className="text-xs">
              ✅ Parallel Analytics
            </Badge>
            <Badge variant="secondary" className="text-xs">
              ✅ Intelligent Caching
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}