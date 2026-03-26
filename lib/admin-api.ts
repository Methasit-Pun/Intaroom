// Optimized Admin API for better performance
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { supabaseUrl, supabaseAnonKey } from "@/app/env"

// Performance monitoring
export interface PerformanceMetrics {
  queryStartTime: number
  queryEndTime?: number
  queryDuration?: number
  queryCount: number
  cacheHit: boolean
  operation: string
}

let performanceMetrics: PerformanceMetrics[] = []

const logPerformance = (metrics: PerformanceMetrics) => {
  performanceMetrics.push(metrics)
  console.log(`📊 Performance: ${metrics.operation} - ${metrics.queryDuration}ms (${metrics.cacheHit ? 'CACHE HIT' : 'DB QUERY'})`)
}

export const getPerformanceReport = () => {
  const totalQueries = performanceMetrics.length
  const cacheHits = performanceMetrics.filter(m => m.cacheHit).length
  const avgDuration = performanceMetrics.reduce((sum, m) => sum + (m.queryDuration || 0), 0) / totalQueries
  
  return {
    totalQueries,
    cacheHits,
    cacheHitRate: (cacheHits / totalQueries * 100).toFixed(1),
    avgDuration: avgDuration.toFixed(1),
    metrics: performanceMetrics
  }
}

// Enhanced types with joined data
export interface EnhancedReservation {
  id: number
  booking_name: string
  room_id: number
  user_id: string
  date: string
  start_time: string
  end_time: string
  status: "Pending" | "Approved" | "Rejected"
  purpose: string
  confirmation_number: string
  contact_email?: string
  contact_phone?: string
  created_at: string
  attendees?: number
  // Joined data
  room_name: string
  room_capacity: number
  user_name: string
  user_email: string
  user_telephone?: string
}

export interface PaginationOptions {
  page: number
  pageSize: number
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
  status?: string
  search?: string
  dateFrom?: string
  dateTo?: string
}

// Optimized defaults for better performance
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 50  // Prevent excessive data loading

/**
 * Validate and normalize pagination options for optimal performance
 */
export function validatePaginationOptions(options: PaginationOptions): PaginationOptions {
  return {
    ...options,
    page: Math.max(1, options.page),
    pageSize: Math.min(MAX_PAGE_SIZE, Math.max(1, options.pageSize)),
  }
}

export interface AdminDashboardData {
  reservations: EnhancedReservation[]
  totalCount: number
  analytics: AnalyticsData
  users: UserData[]
}

export interface AnalyticsData {
  totalReservations: number
  pendingReservations: number
  approvedReservations: number
  rejectedReservations: number
  roomUsage: Array<{
    room_id: number
    room_name: string
    count: number
    percentage: number
  }>
  timeSlotUsage: Array<{
    hour: string
    count: number
    percentage: number
  }>
  dailyBookings: Array<{
    date: string
    count: number
    approved: number
    pending: number
    rejected: number
  }>
}

export interface UserData {
  id: string
  email: string
  full_name?: string
  telephone?: string
  is_banned?: boolean
  ban_reason?: string
  ban_until?: string
  total_reservations: number
  approved_reservations: number
  pending_reservations: number
  rejected_reservations: number
}

// Create singleton Supabase client
let supabaseClient: ReturnType<typeof createClientComponentClient> | null = null

function getSupabaseClient() {
  if (!supabaseClient) {
    console.log('🔧 Initializing Supabase client...')
    supabaseClient = createClientComponentClient({
      supabaseUrl,
      supabaseKey: supabaseAnonKey,
    })
    console.log('✅ Supabase client initialized')
  }
  return supabaseClient
}

/**
 * Test function to check database connectivity
 */
export async function testDatabaseConnection(): Promise<boolean> {
  const supabase = getSupabaseClient()
  
  try {
    console.log('🔍 Testing database connection...')
    
    // Try a simple query to test connectivity
    const { data, error } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true })

    if (error) {
      console.error('❌ Database connection test failed:', error)
      return false
    }

    console.log('✅ Database connection test successful')
    return true
  } catch (error) {
    console.error('❌ Database connection test error:', error)
    return false
  }
}

/**
 * Optimized function to fetch reservations with pagination and joins
 * Uses single query with joins instead of N+1 queries
 */
export async function fetchReservationsOptimized(options: PaginationOptions): Promise<{
  data: EnhancedReservation[]
  totalCount: number
}> {
  const supabase = getSupabaseClient()
  
  // Validate pagination options for performance
  const validOptions = validatePaginationOptions(options)
  const startIndex = (validOptions.page - 1) * validOptions.pageSize
  
  console.log('🔍 Fetching reservations with validated options:', validOptions)
  
  // First, get reservations with room data
  let reservationQuery = supabase
    .from("reservations")
    .select(`
      *,
      rooms(name, capacity)
    `, { count: 'exact' })

  // Apply filters
  if (options.status && options.status !== 'All') {
    reservationQuery = reservationQuery.eq('status', options.status)
  }

  if (options.dateFrom) {
    reservationQuery = reservationQuery.gte('date', options.dateFrom)
  }

  if (options.dateTo) {
    reservationQuery = reservationQuery.lte('date', options.dateTo)
  }

  if (options.search) {
    reservationQuery = reservationQuery.or(`
      booking_name.ilike.%${options.search}%,
      purpose.ilike.%${options.search}%,
      contact_email.ilike.%${options.search}%,
      contact_phone.ilike.%${options.search}%
    `)
  }

  // Apply sorting
  const sortBy = options.sortBy || 'created_at'
  const sortDirection = options.sortDirection || 'desc'
  reservationQuery = reservationQuery.order(sortBy, { ascending: sortDirection === 'asc' })

  // Apply pagination with validated page size (max 50 for performance)
  reservationQuery = reservationQuery.range(startIndex, startIndex + validOptions.pageSize - 1)

  const { data: reservations, error: reservationsError, count } = await reservationQuery

  if (reservationsError) {
    console.error('❌ Error fetching reservations:', reservationsError)
    throw new Error(`Failed to fetch reservations: ${reservationsError.message}`)
  }

  console.log(`📊 Found ${reservations?.length || 0} reservations, total count: ${count}`)

  if (!reservations || reservations.length === 0) {
    return {
      data: [],
      totalCount: count || 0
    }
  }

  // Get unique user IDs from reservations
  const userIds = [...new Set(reservations.map(r => r.user_id))]
  console.log(`🔍 Fetching user profiles for ${userIds.length} unique users`)
  
  // Fetch user profiles separately
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, email, telephone')
    .in('id', userIds)

  if (profilesError) {
    console.error('⚠️ Error fetching profiles:', profilesError)
    // Continue without user data rather than failing completely
  }

  console.log(`📊 Found ${profiles?.length || 0} user profiles`)

  // Create a lookup map for profiles
  const profilesMap = new Map()
  if (profiles) {
    profiles.forEach(profile => {
      profilesMap.set(profile.id, profile)
    })
  }

  // Transform data to match expected interface
  const enhancedData: EnhancedReservation[] = reservations.map((item: any) => {
    const userProfile = profilesMap.get(item.user_id)
    
    return {
      id: item.id,
      booking_name: item.booking_name,
      room_id: item.room_id,
      user_id: item.user_id,
      date: item.date,
      start_time: item.start_time,
      end_time: item.end_time,
      status: item.status,
      purpose: item.purpose,
      confirmation_number: item.confirmation_number,
      contact_email: item.contact_email,
      contact_phone: item.contact_phone,
      created_at: item.created_at,
      attendees: item.attendees,
      room_name: item.rooms?.name || `Room ${item.room_id}`,
      room_capacity: item.rooms?.capacity || 0,
      user_name: userProfile?.full_name || userProfile?.email || 'Unknown User',
      user_email: userProfile?.email || '',
      user_telephone: userProfile?.telephone,
    }
  })

  console.log('✅ Reservations processed successfully')
  return {
    data: enhancedData,
    totalCount: count || 0
  }
}

/**
 * Optimized analytics calculation using aggregation queries
 */
export async function fetchAnalyticsOptimized(timeFrame: 'day' | 'week' | 'month' = 'week'): Promise<AnalyticsData> {
  const supabase = getSupabaseClient()
  
  // Calculate date range
  const now = new Date()
  const startDate = new Date()
  
  switch (timeFrame) {
    case 'day':
      startDate.setDate(now.getDate() - 1)
      break
    case 'week':
      startDate.setDate(now.getDate() - 7)
      break
    case 'month':
      startDate.setMonth(now.getMonth() - 1)
      break
  }

  const startDateStr = startDate.toISOString().split('T')[0]
  const endDateStr = now.toISOString().split('T')[0]

  try {
    // Parallel queries for better performance
    const [
      statusCountsResult,
      roomUsageResult,
      timeSlotUsageResult,
      dailyBookingsResult
    ] = await Promise.all([
      // Status counts
      supabase
        .from('reservations')
        .select('status')
        .gte('date', startDateStr)
        .lte('date', endDateStr),

      // Room usage with names
      supabase
        .from('reservations')
        .select(`
          room_id,
          rooms(name)
        `)
        .gte('date', startDateStr)
        .lte('date', endDateStr),

      // Time slot usage
      supabase
        .from('reservations')
        .select('start_time, end_time, confirmation_number, date, room_id, user_id')
        .gte('date', startDateStr)
        .lte('date', endDateStr),

      // Daily bookings
      supabase
        .from('reservations')
        .select('date, status')
        .gte('date', startDateStr)
        .lte('date', endDateStr)
    ])

    // Process status counts
    const statusCounts = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0
    }

    if (statusCountsResult.data) {
      statusCounts.total = statusCountsResult.data.length
      statusCountsResult.data.forEach((item: any) => {
        switch (item.status) {
          case 'Pending':
            statusCounts.pending++
            break
          case 'Approved':
            statusCounts.approved++
            break
          case 'Rejected':
            statusCounts.rejected++
            break
        }
      })
    }

    // Process room usage
    const roomUsageMap = new Map<number, { name: string; count: number }>()
    if (roomUsageResult.data) {
      roomUsageResult.data.forEach((item: any) => {
        const roomId = item.room_id
        const roomName = item.rooms?.name || `Room ${roomId}`
        
        if (roomUsageMap.has(roomId)) {
          roomUsageMap.get(roomId)!.count++
        } else {
          roomUsageMap.set(roomId, { name: roomName, count: 1 })
        }
      })
    }

    const roomUsage = Array.from(roomUsageMap.entries()).map(([roomId, data]) => ({
      room_id: roomId,
      room_name: data.name,
      count: data.count,
      percentage: statusCounts.total > 0 ? (data.count / statusCounts.total) * 100 : 0
    }))

    // Process time slot usage
    const slotGroups = new Map<string, { start: string; end: string }>()
    if (timeSlotUsageResult.data) {
      timeSlotUsageResult.data.forEach((item: any) => {
        if (!item?.start_time || !item?.end_time) return
        const confMatch = item.confirmation_number?.match(/^(INR-\d{4,}(?:-\d{2}-\d{2})?)(-\d+)?$/)
        const baseConfirmation = confMatch ? confMatch[1] : (item.confirmation_number || '')
        const groupKey = `${baseConfirmation}-${item.date}-${item.room_id}-${item.user_id || 'unknown'}`
        const existing = slotGroups.get(groupKey)

        if (!existing) {
          slotGroups.set(groupKey, {
            start: item.start_time,
            end: item.end_time
          })
        } else {
          if (item.start_time < existing.start) {
            existing.start = item.start_time
          }
          if (item.end_time > existing.end) {
            existing.end = item.end_time
          }
        }
      })
    }

    const timeSlotMap = new Map<string, number>()
    const formatTime = (time?: string) => {
      if (!time) return 'N/A'
      return time.length >= 5 ? time.substring(0, 5) : time
    }

    slotGroups.forEach(({ start, end }) => {
      const label = `${formatTime(start)} - ${formatTime(end)}`
      timeSlotMap.set(label, (timeSlotMap.get(label) || 0) + 1)
    })

    const parseSlotStart = (slot: string) => {
      const numeric = Number.parseInt(slot, 10)
      return Number.isNaN(numeric) ? 0 : numeric
    }

    const timeSlotUsage = Array.from(timeSlotMap.entries())
      .map(([hour, count]) => ({
        hour,
        count,
        percentage: statusCounts.total > 0 ? (count / statusCounts.total) * 100 : 0
      }))
      .sort((a, b) => parseSlotStart(a.hour) - parseSlotStart(b.hour))

    // Process daily bookings
    const dailyBookingsMap = new Map<string, { count: number; approved: number; pending: number; rejected: number }>()
    if (dailyBookingsResult.data) {
      dailyBookingsResult.data.forEach((item: any) => {
        const date = item.date
        
        if (!dailyBookingsMap.has(date)) {
          dailyBookingsMap.set(date, { count: 0, approved: 0, pending: 0, rejected: 0 })
        }
        
        const dayData = dailyBookingsMap.get(date)!
        dayData.count++
        
        switch (item.status) {
          case 'Approved':
            dayData.approved++
            break
          case 'Pending':
            dayData.pending++
            break
          case 'Rejected':
            dayData.rejected++
            break
        }
      })
    }

    const dailyBookings = Array.from(dailyBookingsMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return {
      totalReservations: statusCounts.total,
      pendingReservations: statusCounts.pending,
      approvedReservations: statusCounts.approved,
      rejectedReservations: statusCounts.rejected,
      roomUsage,
      timeSlotUsage,
      dailyBookings
    }
  } catch (error) {
    console.error('Error fetching analytics:', error)
    throw new Error(`Failed to fetch analytics: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Optimized user data fetching with reservation counts
 */
export async function fetchUsersWithStats(): Promise<UserData[]> {
  const supabase = getSupabaseClient()

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      console.error('⚠️ Error checking Supabase session before fetching users:', sessionError)
    }

    if (!sessionData?.session) {
      console.warn('⚠️ No Supabase session detected, skipping fetchUsersWithStats to avoid slow failures')
      return []
    }

    console.log('🔍 Fetching users with stats...')
    
    // Fetch users first
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        telephone,
        is_banned,
        ban_reason,
        ban_until
      `)

    if (usersError) {
      console.error('❌ Error fetching users:', usersError)
      throw usersError
    }

    console.log(`📊 Found ${users?.length || 0} users`)

    if (!users || users.length === 0) {
      console.log('⚠️ No users found, returning empty array')
      return []
    }

    // Get user IDs
    const userIds = users.map(user => user.id)
    console.log(`🔍 Fetching reservations for ${userIds.length} users`)

    // Fetch reservation stats separately
    const { data: reservations, error: reservationsError } = await supabase
      .from('reservations')
      .select('user_id, status')
      .in('user_id', userIds)

    if (reservationsError) {
      console.error('⚠️ Error fetching reservation stats:', reservationsError)
      // Continue without reservation stats rather than failing
    }

    console.log(`📊 Found ${reservations?.length || 0} reservations`)

    // Create a map of user reservation stats
    const userStatsMap = new Map()
    if (reservations) {
      reservations.forEach(reservation => {
        const userId = reservation.user_id
        if (!userStatsMap.has(userId)) {
          userStatsMap.set(userId, {
            total: 0,
            approved: 0,
            pending: 0,
            rejected: 0
          })
        }
        
        const stats = userStatsMap.get(userId)
        stats.total++
        
        switch (reservation.status) {
          case 'Approved':
            stats.approved++
            break
          case 'Pending':
            stats.pending++
            break
          case 'Rejected':
            stats.rejected++
            break
        }
      })
    }

    const usersWithStats: UserData[] = users.map((user: any) => {
      const stats = userStatsMap.get(user.id) || {
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0
      }

      return {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        telephone: user.telephone,
        is_banned: user.is_banned,
        ban_reason: user.ban_reason,
        ban_until: user.ban_until,
        total_reservations: stats.total,
        approved_reservations: stats.approved,
        pending_reservations: stats.pending,
        rejected_reservations: stats.rejected,
      }
    })

    console.log('✅ Users with stats processed successfully')
    return usersWithStats
  } catch (error) {
    console.error('❌ Error fetching users with stats:', error)
    return []
  }
}

/**
 * Batch update reservation statuses
 */
export async function batchUpdateReservationStatus(
  ids: number[],
  status: 'Approved' | 'Rejected'
): Promise<void> {
  if (ids.length === 0) return

  const supabase = getSupabaseClient()

  try {
    const { error } = await supabase
      .from('reservations')
      .update({ status, updated_at: new Date().toISOString() })
      .in('id', ids)

    if (error) throw error
  } catch (error) {
    console.error('Error batch updating reservations:', error)
    throw new Error(`Failed to update reservations: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Enhanced cache management for dashboard data with performance tracking
 */
class AdminCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  private stats = { hits: 0, misses: 0, sets: 0 }
  
  set(key: string, data: any, ttl: number = 300000) { // 5 minutes default TTL
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
    this.stats.sets++
    console.log(`💾 Cache SET: ${key} (TTL: ${ttl}ms)`)
  }
  
  get(key: string): any | null {
    const cached = this.cache.get(key)
    if (!cached) {
      this.stats.misses++
      console.log(`❌ Cache MISS: ${key}`)
      return null
    }
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key)
      this.stats.misses++
      console.log(`⏰ Cache EXPIRED: ${key}`)
      return null
    }
    
    this.stats.hits++
    console.log(`✅ Cache HIT: ${key} (age: ${Date.now() - cached.timestamp}ms)`)
    return cached.data
  }
  
  clear() {
    this.cache.clear()
    this.stats = { hits: 0, misses: 0, sets: 0 }
    console.log('🗑️ Cache CLEARED')
  }
  
  delete(key: string) {
    const deleted = this.cache.delete(key)
    if (deleted) {
      console.log(`🗑️ Cache DELETE: ${key}`)
    }
  }

  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(1)
      : '0.0'
    
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      size: this.cache.size
    }
  }
}

export const adminCache = new AdminCache()

/**
 * Optimized function to fetch all dashboard data with caching and performance monitoring
 */
export async function fetchDashboardData(
  options: PaginationOptions,
  timeFrame: 'day' | 'week' | 'month' = 'week',
  useCache: boolean = true
): Promise<AdminDashboardData> {
  const startTime = Date.now()
  const cacheKey = `dashboard_${JSON.stringify(options)}_${timeFrame}`
  
  if (useCache) {
    const cached = adminCache.get(cacheKey)
    if (cached) {
      logPerformance({
        queryStartTime: startTime,
        queryEndTime: Date.now(),
        queryDuration: Date.now() - startTime,
        queryCount: 0,
        cacheHit: true,
        operation: 'fetchDashboardData'
      })
      return cached
    }
  }

  try {
    console.log('🔄 Fetching dashboard data with optimized queries...')
    
    // Parallel fetch for better performance
    const [reservationsResult, analytics, users] = await Promise.all([
      fetchReservationsOptimized(options),
      fetchAnalyticsOptimized(timeFrame),
      fetchUsersWithStats()
    ])

    const dashboardData: AdminDashboardData = {
      reservations: reservationsResult.data,
      totalCount: reservationsResult.totalCount,
      analytics,
      users
    }

    if (useCache) {
      adminCache.set(cacheKey, dashboardData)
    }

    const endTime = Date.now()
    const duration = endTime - startTime

    logPerformance({
      queryStartTime: startTime,
      queryEndTime: endTime,
      queryDuration: duration,
      queryCount: 3, // reservations + analytics + users
      cacheHit: false,
      operation: 'fetchDashboardData'
    })

    console.log(`✅ Dashboard data fetched successfully in ${duration}ms`)
    console.log('📊 Cache stats:', adminCache.getStats())

    return dashboardData
  } catch (error) {
    console.error('❌ Error in fetchDashboardData:', error)
    throw error
  }
}

/**
 * Invalidate cache when data changes
 */
export function invalidateCache(pattern?: string) {
  if (pattern) {
    // Clear specific cache entries matching pattern
    for (const key of adminCache['cache'].keys()) {
      if (key.includes(pattern)) {
        adminCache.delete(key)
      }
    }
  } else {
    adminCache.clear()
  }
}