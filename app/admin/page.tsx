"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  Filter,
  CheckCircle,
  XCircle,
  ChevronDown,
  Calendar,
  Clock,
  User,
  Home,
  Loader2,
  Ban,
  ArrowUpDown,
  Mail,
  Phone,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { supabaseUrl, supabaseAnonKey } from "@/app/env"
import LogoutButton from "@/components/logout-button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Line, Bar, LineChart, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  type Reservation,
  type GroupedReservation,
  groupReservations,
  generateQRCodeText,
  storeQRCodeForApprovedReservation,
  updateReservationStatus,
  formatTimeSlots,
  formatDateShort,
  formatDate,
  rejectOverlappingReservations,
} from "@/lib/reservation-utils"

// Type for user data
interface UserType {
  id: string
  email: string
  full_name?: string
  phone?: string
  is_banned?: boolean
  ban_reason?: string
  ban_until?: string
}

// Type for room usage analytics
interface RoomUsage {
  room_id: number
  room_name: string
  count: number
  dates: { date: string; count: number }[]
}

// Type for time slot analytics
interface TimeSlotUsage {
  hour: string
  count: number
}

export default function AdminPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [currentTab, setCurrentTab] = useState("all")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    ids: number[] | null
    action: "approve" | "reject" | "cancel" | null
    userId?: string
    creditCount?: number
  }>({ open: false, ids: null, action: null })
  const [banDialog, setBanDialog] = useState<{
    open: boolean
    userId: string | null
    userName: string | null
    type: "temporary" | "permanent" | null
  }>({ open: false, userId: null, userName: null, type: null })
  const [banReason, setBanReason] = useState("")
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [groupedReservations, setGroupedReservations] = useState<GroupedReservation[]>([])
  const [users, setUsers] = useState<UserType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [analyticsTimeFrame, setAnalyticsTimeFrame] = useState<"day" | "week" | "month">("week")

  // Initialize Supabase client
  const supabase = useMemo(
    () => createClientComponentClient({ supabaseUrl, supabaseKey: supabaseAnonKey }),
    []
  )

  // Fetch reservations from Supabase
  const fetchReservations = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Query 1: reservations + room name joined in one shot
      const { data: reservationsData, error: reservationsError } = await supabase
        .from("reservations")
        .select("*, rooms(name)")
        .order("date", { ascending: false })

      if (reservationsError) throw reservationsError

      if (!reservationsData || reservationsData.length === 0) {
        setReservations([])
        return
      }

      // Query 2: batch fetch all profiles in a single .in() query (no N+1)
      const uniqueUserIds = [...new Set(reservationsData.map((r) => r.user_id).filter(Boolean))]
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .in("id", uniqueUserIds)

      const profileMap = new Map((profilesData || []).map((p) => [p.id, p]))

      const enhancedReservations = reservationsData.map((reservation) => {
        const profile = profileMap.get(reservation.user_id)
        const room = reservation.rooms as { name: string } | null
        return {
          ...reservation,
          room_name: room?.name || `Room ${reservation.room_id}`,
          user_name: profile?.full_name || profile?.email || "Unknown User",
          contact_email: profile?.email || reservation.contact_email,
          contact_phone: profile?.phone || reservation.contact_phone,
        }
      })

      setReservations(enhancedReservations)
    } catch (error: any) {
      console.error("Error fetching reservations:", error)
      setError(error.message || "Failed to load reservations")
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Fetch users from Supabase
  const fetchUsers = useCallback(async () => {
    try {
      const { data: profilesData, error: profilesError } = await supabase.from("profiles").select("*")

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError)
        throw profilesError
      }

      setUsers(profilesData || [])
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }, [supabase])

  // Check if user is authenticated as admin
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if admin is logged in via localStorage
        const isAdmin = localStorage.getItem("isAdmin") === "true"

        if (!isAdmin) {
          // If not admin, redirect to login
          router.push("/login")
          return
        }

        // If admin, fetch reservations and users
        fetchReservations()
        fetchUsers()
      } catch (error) {
        console.error("Auth check error:", error)
      }
    }
     

    checkAuth()
  }, [router, fetchReservations, fetchUsers])


  // Group reservations by confirmation number base AND date AND room
  useEffect(() => {
    if (reservations.length > 0) {
      const grouped = groupReservations(reservations, sortDirection)
      setGroupedReservations(grouped)
    }
  }, [reservations, sortDirection])

  // Derive analytics data directly — no extra render cycle needed
  const analyticsData = useMemo(() => {
    const now = new Date()
    const startDate = new Date()

    if (analyticsTimeFrame === "day") {
      startDate.setDate(now.getDate() - 1)
    } else if (analyticsTimeFrame === "week") {
      startDate.setDate(now.getDate() - 7)
    } else if (analyticsTimeFrame === "month") {
      startDate.setMonth(now.getMonth() - 1)
    }

    const filteredReservations = reservations.filter((res) => {
      const resDate = new Date(res.date)
      return resDate >= startDate && resDate <= now
    })

    const roomUsageMap = new Map<number, { name: string; count: number; dates: Map<string, number> }>()

    filteredReservations.forEach((res) => {
      if (!roomUsageMap.has(res.room_id)) {
        roomUsageMap.set(res.room_id, {
          name: res.room_name || `Room ${res.room_id}`,
          count: 1,
          dates: new Map([[res.date, 1]]),
        })
      } else {
        const roomData = roomUsageMap.get(res.room_id)!
        roomData.count++
        roomData.dates.set(res.date, (roomData.dates.get(res.date) ?? 0) + 1)
      }
    })

    const roomUsage = Array.from(roomUsageMap.entries()).map(([id, data]) => ({
      room_id: id,
      room_name: data.name,
      count: data.count,
      dates: Array.from(data.dates.entries()).map(([date, count]) => ({ date, count })),
    }))

    const timeSlotMap = new Map<string, number>()
    filteredReservations.forEach((res) => {
      const timeKey = `${res.start_time.split(":")[0]}:00`
      timeSlotMap.set(timeKey, (timeSlotMap.get(timeKey) ?? 0) + 1)
    })

    const timeSlotUsage = Array.from(timeSlotMap.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => Number.parseInt(a.hour) - Number.parseInt(b.hour))

    return {
      roomUsage,
      timeSlotUsage,
      totalReservations: filteredReservations.length,
      pendingReservations: filteredReservations.filter((r) => r.status === "Pending").length,
      approvedReservations: filteredReservations.filter((r) => r.status === "Approved").length,
      rejectedReservations: filteredReservations.filter((r) => r.status === "Rejected").length,
    }
  }, [reservations, analyticsTimeFrame])

  // Analytics and other functions remain here since they're admin-specific

  // Returns true if the reservation is still within the cancellable window:
  // future dates (any time) OR past dates within 7 days from today
  const canCancelReservation = (date: string): boolean => {
    const reservationDate = new Date(date)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 7)
    cutoff.setHours(0, 0, 0, 0)
    return reservationDate >= cutoff
  }

  // Handle toggle sort direction
  const toggleSortDirection = () => {
    setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
  }

  // Filter reservations based on search term and status filter
  const filteredReservations = useMemo(
    () =>
      groupedReservations.filter((reservation) => {
        const matchesSearch =
          reservation.booking_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          reservation.room_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          reservation.date.includes(searchTerm) ||
          reservation.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          reservation.contact_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          reservation.contact_phone?.includes(searchTerm) ||
          reservation.purpose.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesStatus = statusFilter === "All" || reservation.status === statusFilter

        const matchesTab =
          currentTab === "all" ||
          (currentTab === "pending" && reservation.status === "Pending") ||
          (currentTab === "approved" && (reservation.status === "Approved" || reservation.status === "Cancelled")) ||
          (currentTab === "rejected" && reservation.status === "Rejected") ||
          currentTab === "analytics"

        return matchesSearch && matchesStatus && matchesTab
      }),
    [groupedReservations, searchTerm, statusFilter, currentTab],
  )

  // Handle approve/reject actions
  const handleAction = (ids: number[], action: "approve" | "reject") => {
    setConfirmDialog({ open: true, ids, action })
  }

  // Handle cancel (approved → Cancelled + credit refund)
  const handleCancel = (ids: number[], userId: string, date: string) => {
    if (!canCancelReservation(date)) return // guard — should not be reachable via UI
    setConfirmDialog({ open: true, ids, action: "cancel", userId, creditCount: ids.length })
  }

  const confirmAction = async () => {
    if (!confirmDialog.ids || !confirmDialog.action) return

    setActionLoading(true)

    try {
      // Find the reservation being approved to get its details for QR code generation
      let approvedReservation: GroupedReservation | null = null
      if (confirmDialog.action === "approve") {
        approvedReservation = groupedReservations.find(res => 
          res.ids.some(id => confirmDialog.ids?.includes(id))
        ) || null
      }

      const newStatus =
        confirmDialog.action === "approve" ? "Approved" :
        confirmDialog.action === "cancel" ? "Cancelled" : "Rejected"

      // Update reservation status using utility function
      await updateReservationStatus(
        confirmDialog.ids,
        newStatus,
        supabaseUrl,
        supabaseAnonKey
      )

      // Refund credits when cancelling an approved reservation
      if (confirmDialog.action === "cancel" && confirmDialog.userId && confirmDialog.creditCount) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("credits")
          .eq("id", confirmDialog.userId)
          .single()
        if (profile) {
          await supabase
            .from("profiles")
            .update({ credits: profile.credits + confirmDialog.creditCount })
            .eq("id", confirmDialog.userId)
        }
      }

      // If approving, automatically reject overlapping reservations and generate QR code
      if (confirmDialog.action === "approve" && approvedReservation && newStatus === "Approved") {
        try {
          // First, reject any overlapping pending reservations
          const rejectionResult = await rejectOverlappingReservations(
            approvedReservation,
            supabaseUrl,
            supabaseAnonKey
          )
          
          if (rejectionResult.rejectedCount > 0) {
            console.log(`✅ Auto-rejected ${rejectionResult.rejectedCount} overlapping reservations: ${rejectionResult.rejectedIds.join(", ")}`)
          }
          
          // Generate QR code text for the approved reservation
          const qrCodeText = generateQRCodeText(approvedReservation)
          
          // Store the QR code for all reservation IDs in the group
          await storeQRCodeForApprovedReservation(
            approvedReservation,
            supabaseUrl,
            supabaseAnonKey
          )
          
          console.log(`✅ QR code generated and stored for reservation group: ${approvedReservation.confirmation_number}`)
        } catch (qrError) {
          console.error("❌ Failed to process approval (overlapping rejection or QR generation):", qrError)
          // Don't throw here - approval should still succeed even if overlapping rejection or QR fails
        }
      }

      // Refresh the reservations list
      await fetchReservations()

      // Close the dialog
      setConfirmDialog({ open: false, ids: null, action: null })
    } catch (error: any) {
      console.error("❌ ADMIN ERROR: Failed to update reservation:", error)
      setError(error.message || "Failed to update reservation")
    } finally {
      setActionLoading(false)
    }
  }

  // Handle ban user action
  const handleBanUser = (userId: string, userName: string, type: "temporary" | "permanent") => {
    setBanDialog({
      open: true,
      userId,
      userName,
      type,
    })
    setBanReason("")
  }

  const confirmBanUser = async () => {
    if (!banDialog.userId || !banDialog.type) return

    setActionLoading(true)

    try {
      const banUntil =
        banDialog.type === "temporary"
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 1 month
          : null

      const { error } = await supabase
        .from("profiles")
        .update({
          is_banned: true,
          ban_reason: banReason,
          ban_until: banUntil,
        })
        .eq("id", banDialog.userId)

      if (error) throw error

      // Refresh users list
      await fetchUsers()

      // Close dialog
      setBanDialog({ open: false, userId: null, userName: null, type: null })
      setBanReason("")
    } catch (error: any) {
      console.error("Error banning user:", error)
      setError(error.message || "Failed to ban user")
    } finally {
      setActionLoading(false)
    }
  }



  return (
    <div className="flex flex-col min-h-screen bg-[#5A0D16] text-white">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-[#8B1F2D]/30 flex justify-between items-center sticky top-0 z-50 bg-[#5A0D16]">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open("/admin/calendar", "_blank")}
            className="text-white hover:bg-white/10 flex items-center space-x-1 text-xs sm:text-sm"
          >
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Calendar</span>
          </Button>
        </div>
        <h1 className="text-base sm:text-xl font-semibold text-center flex-1">
          <span className="text-[#D4AF37]">INTANIA</span> 
          <span className="hidden sm:inline"> ADMIN DASHBOARD</span>
          <span className="sm:hidden"> ADMIN</span>
        </h1>
        <LogoutButton variant="ghost" className="text-white hover:bg-white/10 text-sm sm:text-base" />
      </div>

      {/* Main content */}
      <div className="flex-1 p-2 sm:p-4">
        {error && (
          <div className="max-w-6xl mx-auto mb-4 bg-red-500/20 border border-red-500 text-white p-3 rounded-lg text-sm sm:text-base">
            {error}
            <Button variant="link" className="text-white underline ml-2" onClick={fetchReservations}>
              Try Again
            </Button>
          </div>
        )}

        <div className="bg-gray-200 rounded-xl overflow-hidden shadow-md text-gray-800 max-w-[1800px] mx-auto">
          {/* Tabs */}
          <Tabs defaultValue="all" className="w-full" onValueChange={setCurrentTab}>
            <div className="bg-gray-300 p-2 sm:p-3">
              <TabsList className="grid grid-cols-5 bg-gray-100 w-full">
                <TabsTrigger 
                  value="all" 
                  className="data-[state=active]:bg-[#5A0D16] data-[state=active]:text-white text-xs sm:text-sm p-1 sm:p-2"
                >
                  All
                </TabsTrigger>
                <TabsTrigger
                  value="pending"
                  className="data-[state=active]:bg-[#5A0D16] data-[state=active]:text-white text-xs sm:text-sm p-1 sm:p-2"
                >
                  Pending
                </TabsTrigger>
                <TabsTrigger
                  value="approved"
                  className="data-[state=active]:bg-[#5A0D16] data-[state=active]:text-white text-xs sm:text-sm p-1 sm:p-2"
                >
                  Approved
                </TabsTrigger>
                <TabsTrigger
                  value="rejected"
                  className="data-[state=active]:bg-[#5A0D16] data-[state=active]:text-white text-xs sm:text-sm p-1 sm:p-2"
                >
                  Rejected
                </TabsTrigger>
                <TabsTrigger
                  value="analytics"
                  className="data-[state=active]:bg-[#5A0D16] data-[state=active]:text-white text-xs sm:text-sm p-1 sm:p-2"
                >
                  Analytics
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="m-0">
              <ReservationTable
                reservations={filteredReservations}
                onAction={handleAction}
                onCancel={handleCancel}
                canCancel={canCancelReservation}
                onBanUser={handleBanUser}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                sortDirection={sortDirection}
                toggleSortDirection={toggleSortDirection}
                loading={loading}
                formatDate={formatDateShort}
                formatTimeSlots={formatTimeSlots}
              />
            </TabsContent>

            <TabsContent value="pending" className="m-0">
              <ReservationTable
                reservations={filteredReservations}
                onAction={handleAction}
                onCancel={handleCancel}
                canCancel={canCancelReservation}
                onBanUser={handleBanUser}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                statusFilter="Pending"
                setStatusFilter={setStatusFilter}
                sortDirection={sortDirection}
                toggleSortDirection={toggleSortDirection}
                loading={loading}
                formatDate={formatDateShort}
                formatTimeSlots={formatTimeSlots}
              />
            </TabsContent>

            <TabsContent value="approved" className="m-0">
              <ReservationTable
                reservations={filteredReservations}
                onAction={handleAction}
                onCancel={handleCancel}
                canCancel={canCancelReservation}
                onBanUser={handleBanUser}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                statusFilter="Approved"
                setStatusFilter={setStatusFilter}
                sortDirection={sortDirection}
                toggleSortDirection={toggleSortDirection}
                loading={loading}
                formatDate={formatDateShort}
                formatTimeSlots={formatTimeSlots}
              />
            </TabsContent>

            <TabsContent value="rejected" className="m-0">
              <ReservationTable
                reservations={filteredReservations}
                onAction={handleAction}
                onCancel={handleCancel}
                canCancel={canCancelReservation}
                onBanUser={handleBanUser}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                statusFilter="Rejected"
                setStatusFilter={setStatusFilter}
                sortDirection={sortDirection}
                toggleSortDirection={toggleSortDirection}
                loading={loading}
                formatDate={formatDateShort}
                formatTimeSlots={formatTimeSlots}
              />
            </TabsContent>

            <TabsContent value="analytics" className="m-0 p-3 sm:p-6 bg-gray-100">
              <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h2 className="text-lg sm:text-xl font-semibold">Room Usage Analytics</h2>
                <Select
                  value={analyticsTimeFrame}
                  onValueChange={(value) => setAnalyticsTimeFrame(value as "day" | "week" | "month")}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Select time frame" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Last 24 Hours</SelectItem>
                    <SelectItem value="week">Last Week</SelectItem>
                    <SelectItem value="month">Last Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Analytics Dashboard - Mobile responsive grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium">Total Reservations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg sm:text-2xl font-bold">{analyticsData.totalReservations}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium text-yellow-700">Pending</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg sm:text-2xl font-bold">{analyticsData.pendingReservations}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium text-green-700">Approved</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg sm:text-2xl font-bold">{analyticsData.approvedReservations}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium text-red-700">Rejected</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg sm:text-2xl font-bold">{analyticsData.rejectedReservations}</div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                {/* Room Usage Chart */}
                <Card className="w-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm sm:text-base">Room Usage</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Number of reservations per room</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[250px] sm:h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData.roomUsage} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="room_name" 
                          angle={-45} 
                          textAnchor="end" 
                          height={70} 
                          fontSize={12}
                          interval={0}
                        />
                        <YAxis fontSize={12} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#5A0D16" name="Reservations" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Time Slot Usage Chart */}
                <Card className="w-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm sm:text-base">Popular Time Slots</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Most frequently reserved time slots</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[250px] sm:h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={analyticsData.timeSlotUsage}
                        margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip />
                        <Line type="monotone" dataKey="count" stroke="#D4AF37" strokeWidth={2} name="Reservations" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Room Details Table */}
                <Card className="w-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm sm:text-base">Room Usage Details</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Detailed breakdown of room reservations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2 text-xs sm:text-sm">Room</th>
                            <th className="text-left p-2 text-xs sm:text-sm">Total</th>
                            <th className="text-left p-2 text-xs sm:text-sm hidden sm:table-cell">Most Reserved Day</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analyticsData.roomUsage.map((room) => {
                            // Find most popular day
                            let mostPopularDay = { date: "", count: 0 }
                            room.dates.forEach((day) => {
                              if (day.count > mostPopularDay.count) {
                                mostPopularDay = day
                              }
                            })

                            return (
                              <tr key={room.room_id} className="border-b hover:bg-gray-50">
                                <td className="p-2 text-xs sm:text-sm">{room.room_name}</td>
                                <td className="p-2 text-xs sm:text-sm">{room.count}</td>
                                <td className="p-2 text-xs sm:text-sm hidden sm:table-cell">
                                  {mostPopularDay.date ? formatDate(mostPopularDay.date) : "N/A"}
                                  {mostPopularDay.count > 0 && ` (${mostPopularDay.count})`}
                                </td>
                              </tr>
                            )
                          })}
                          {analyticsData.roomUsage.length === 0 && (
                            <tr>
                              <td colSpan={3} className="p-4 text-center text-gray-500 text-xs sm:text-sm">
                                No data available
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* User Management Section */}
                <Card className="w-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm sm:text-base">User Management</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">View and manage user accounts</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <Input 
                        placeholder="Search users..." 
                        className="w-full text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2 text-xs sm:text-sm">User</th>
                            <th className="text-left p-2">Email</th>
                            <th className="text-left p-2">Phone</th>
                            <th className="text-left p-2">Status</th>
                            <th className="text-left p-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users
                            .filter((user) => {
                              if (!searchTerm) return true
                              const searchLower = searchTerm.toLowerCase()
                              return (
                                user.full_name?.toLowerCase().includes(searchLower) ||
                                user.email.toLowerCase().includes(searchLower) ||
                                user.phone?.includes(searchTerm)
                              )
                            })
                            .map((user) => (
                            <tr key={user.id} className="border-b hover:bg-gray-50">
                              <td className="p-2">{user.full_name || "N/A"}</td>
                              <td className="p-2">{user.email}</td>
                              <td className="p-2">{user.phone || "N/A"}</td>
                              <td className="p-2">
                                {user.is_banned ? (
                                  <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                                    Banned {user.ban_until ? `until ${formatDate(user.ban_until)}` : "permanently"}
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                                    Active
                                  </span>
                                )}
                              </td>
                              <td className="p-2">
                                {!user.is_banned && (
                                  <div className="flex gap-2 flex-wrap">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-yellow-600 border-yellow-600 hover:bg-yellow-50"
                                      onClick={() => handleBanUser(user.id, user.full_name || user.email, "temporary")}
                                    >
                                      <Ban className="h-3 w-3 mr-1" />
                                      1-Month Ban
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-red-600 border-red-600 hover:bg-red-50"
                                      onClick={() => handleBanUser(user.id, user.full_name || user.email, "permanent")}
                                    >
                                      <Ban className="h-3 w-3 mr-1" />
                                      Permanent Ban
                                    </Button>
                                  </div>
                                )}
                                {user.is_banned && <span className="text-sm text-gray-500 italic">Already banned</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}>
        <DialogContent className="bg-white text-gray-800">
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.action === "approve" ? "Approve Reservation" :
               confirmDialog.action === "cancel" ? "Cancel Approved Reservation" :
               "Reject Reservation"}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.action === "approve" && "Are you sure you want to approve this reservation?"}
              {confirmDialog.action === "reject" && "Are you sure you want to reject this reservation? This action cannot be undone."}
              {confirmDialog.action === "cancel" && (
                <>
                  Are you sure you want to cancel this approved reservation?
                  <br />
                  <span className="text-orange-600 font-medium">
                    {confirmDialog.creditCount} credit{confirmDialog.creditCount !== 1 ? "s" : ""} will be refunded to the user.
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ open: false, ids: null, action: null })}
              disabled={actionLoading}
            >
              Go Back
            </Button>
            <Button
              className={cn(
                confirmDialog.action === "approve" ? "bg-[#5A0D16] hover:bg-[#4A0B12]" :
                confirmDialog.action === "cancel" ? "bg-orange-600 hover:bg-orange-700" :
                "bg-red-600 hover:bg-red-700",
                "text-white",
              )}
              onClick={confirmAction}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : confirmDialog.action === "approve" ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </>
              ) : confirmDialog.action === "cancel" ? (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Cancel Reservation
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban User Dialog */}
      <Dialog open={banDialog.open} onOpenChange={(open) => setBanDialog((prev) => ({ ...prev, open }))}>
        <DialogContent className="bg-white text-gray-800 max-w-md">
          <DialogHeader>
            <DialogTitle>{banDialog.type === "temporary" ? "Temporary Ban (1 Month)" : "Permanent Ban"}</DialogTitle>
            <DialogDescription>
              You are about to {banDialog.type === "temporary" ? "temporarily ban" : "permanently ban"} user:{" "}
              <strong>{banDialog.userName}</strong>
              {banDialog.type === "temporary" ? " for 1 month." : "."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div className="space-y-2">
              <Label htmlFor="ban-reason">Reason for ban (required)</Label>
              <Textarea
                id="ban-reason"
                placeholder="Please provide a reason for this ban..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setBanDialog({ open: false, userId: null, userName: null, type: null })}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={confirmBanUser}
              disabled={actionLoading || !banReason.trim()}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Ban className="h-4 w-4 mr-2" />
                  Confirm Ban
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )

interface ReservationTableProps {
  reservations: GroupedReservation[]
  onAction: (ids: number[], action: "approve" | "reject") => void
  onCancel: (ids: number[], userId: string, date: string) => void
  canCancel: (date: string) => boolean
  onBanUser: (userId: string, userName: string, type: "temporary" | "permanent") => void
  searchTerm: string
  setSearchTerm: (term: string) => void
  statusFilter: string
  setStatusFilter: (filter: string) => void
  sortDirection: "asc" | "desc"
  toggleSortDirection: () => void
  loading: boolean
  formatDate: (date: string) => string
  formatTimeSlots: (timeSlots: { start_time: string; end_time: string }[]) => string
}

function ReservationTable({
  reservations,
  onAction,
  onCancel,
  canCancel,
  onBanUser,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  sortDirection,
  toggleSortDirection,
  loading,
  formatDate,
  formatTimeSlots,
}: ReservationTableProps) {
  return (
    <div>
      {/* Search and Filter */}
      <div className="p-3 sm:p-4 bg-gray-100 border-b border-gray-300 flex flex-col gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search by name, room, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-white border-gray-300 text-sm"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" className="bg-white border-gray-300 flex gap-1 text-sm" onClick={toggleSortDirection}>
            <ArrowUpDown className="h-4 w-4" />
            <span className="hidden sm:inline">{sortDirection === "asc" ? "Oldest First" : "Newest First"}</span>
            <span className="sm:hidden">{sortDirection === "asc" ? "Oldest" : "Newest"}</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex gap-2 bg-white border-gray-300 text-sm">
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Status: {statusFilter}</span>
                <span className="sm:hidden">{statusFilter}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setStatusFilter("All")}>All</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("Pending")}>Pending</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("Approved")}>Approved</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("Rejected")}>Rejected</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("Cancelled")}>Cancelled</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : (
          <>
            {/* Desktop/Tablet Table View */}
            <div className="hidden md:block">
              <table className="w-full table-fixed">
                <thead className="bg-gray-300 text-left">
                  <tr>
                    <th className="p-3 font-medium w-[18%] text-sm">User</th>
                    <th className="p-3 font-medium w-[12%] text-sm">Room</th>
                    <th className="p-3 font-medium w-[15%] text-sm">Date & Time</th>
                    <th className="p-3 font-medium w-[20%] text-sm">Purpose</th>
                    <th className="p-3 font-medium w-[10%] text-sm">Status</th>
                    <th className="p-3 font-medium w-[25%] text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reservations.length > 0 ? (
                    reservations.map((reservation) => (
                      <tr key={`${reservation.confirmation_number}-${reservation.date}-${reservation.room_id}`} className="hover:bg-gray-50">
                        <td className="p-3">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                              <span className="truncate font-medium text-sm">{reservation.user_name}</span>
                            </div>
                            <div className="pl-6 flex flex-col gap-1 text-xs text-gray-500">
                              {reservation.contact_email && (
                                <div className="flex items-center gap-1">
                                  <Mail className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{reservation.contact_email}</span>
                                </div>
                              )}
                              {reservation.contact_phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{reservation.contact_phone}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Home className="h-4 w-4 text-gray-500 flex-shrink-0" />
                            <span className="truncate text-sm">{reservation.room_name}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-gray-500 flex-shrink-0" />
                              <span className="truncate text-sm">{formatDate(reservation.date)}</span>
                            </div>
                            <div className="flex items-start gap-1 text-sm text-gray-600">
                              <Clock className="h-3 w-3 flex-shrink-0 mt-0.5" />
                              <span className="break-words">{formatTimeSlots(reservation.time_slots)}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col">
                            <div className="font-medium truncate text-sm">{reservation.booking_name}</div>
                            <div className="text-xs text-gray-500 line-clamp-2">
                              {reservation.purpose || "No purpose specified"}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <span
                            className={cn(
                              "px-2 py-1 rounded-full text-xs font-medium inline-block",
                              reservation.status === "Pending" && "bg-yellow-100 text-yellow-800",
                              reservation.status === "Approved" && "bg-green-100 text-green-800",
                              reservation.status === "Rejected" && "bg-red-100 text-red-800",
                              reservation.status === "Cancelled" && "bg-orange-100 text-orange-800",
                            )}
                          >
                            {reservation.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-2">
                            {reservation.status === "Pending" && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-[#5A0D16] hover:bg-[#4A0B12] text-white text-xs"
                                  onClick={() => onAction(reservation.ids, "approve")}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-red-600 hover:bg-red-700 text-white text-xs"
                                  onClick={() => onAction(reservation.ids, "reject")}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}
                            {reservation.status === "Approved" && canCancel(reservation.date) && (
                              <Button
                                size="sm"
                                className="bg-orange-600 hover:bg-orange-700 text-white text-xs"
                                onClick={() => onCancel(reservation.ids, reservation.user_id, reservation.date)}
                              >
                                <AlertTriangle className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                            )}
                            {reservation.status === "Approved" && !canCancel(reservation.date) && (
                              <span className="text-xs text-gray-400 italic">Past 7-day window</span>
                            )}
                            {(reservation.status === "Rejected" || reservation.status === "Cancelled") && (
                              <span className="text-sm text-gray-500 italic">No actions available</span>
                            )}

                            {/* User Actions */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="outline" className="text-xs">
                                  User Actions
                                  <ChevronDown className="h-4 w-4 ml-1" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() =>
                                    onBanUser(reservation.user_id, reservation.user_name || "User", "temporary")
                                  }
                                >
                                  <Ban className="h-4 w-4 mr-2" /> 1-Month Ban
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    onBanUser(reservation.user_id, reservation.user_name || "User", "permanent")
                                  }
                                >
                                  <Ban className="h-4 w-4 mr-2" /> Permanent Ban
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-gray-500">
                        No reservations found matching your criteria
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden bg-white">
              {reservations.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {reservations.map((reservation) => (
                    <div key={`${reservation.confirmation_number}-${reservation.date}-${reservation.room_id}`} className="p-4">
                      {/* Header with user and status */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                          <span className="font-medium text-sm">{reservation.user_name}</span>
                        </div>
                        <span
                          className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium",
                            reservation.status === "Pending" && "bg-yellow-100 text-yellow-800",
                            reservation.status === "Approved" && "bg-green-100 text-green-800",
                            reservation.status === "Rejected" && "bg-red-100 text-red-800",
                            reservation.status === "Cancelled" && "bg-orange-100 text-orange-800",
                          )}
                        >
                          {reservation.status}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="space-y-2 mb-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Home className="h-4 w-4 text-gray-500 flex-shrink-0" />
                          <span>{reservation.room_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
                          <span>{formatDate(reservation.date)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-gray-500 flex-shrink-0" />
                          <span>{formatTimeSlots(reservation.time_slots)}</span>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">{reservation.booking_name}</span>
                          {reservation.purpose && (
                            <div className="text-xs text-gray-500 mt-1">{reservation.purpose}</div>
                          )}
                        </div>
                        {reservation.contact_email && (
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{reservation.contact_email}</span>
                          </div>
                        )}
                        {reservation.contact_phone && (
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Phone className="h-3 w-3 flex-shrink-0" />
                            <span>{reservation.contact_phone}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        {reservation.status === "Pending" && (
                          <>
                            <Button
                              size="sm"
                              className="bg-[#5A0D16] hover:bg-[#4A0B12] text-white text-xs flex-1"
                              onClick={() => onAction(reservation.ids, "approve")}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              className="bg-red-600 hover:bg-red-700 text-white text-xs flex-1"
                              onClick={() => onAction(reservation.ids, "reject")}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                        {reservation.status === "Approved" && canCancel(reservation.date) && (
                          <Button
                            size="sm"
                            className="bg-orange-600 hover:bg-orange-700 text-white text-xs flex-1"
                            onClick={() => onCancel(reservation.ids, reservation.user_id, reservation.date)}
                          >
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            Cancel Reservation
                          </Button>
                        )}
                        {reservation.status === "Approved" && !canCancel(reservation.date) && (
                          <span className="text-xs text-gray-400 italic">Past 7-day window</span>
                        )}
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" className="text-xs">
                              User Actions
                              <ChevronDown className="h-4 w-4 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                onBanUser(reservation.user_id, reservation.user_name || "User", "temporary")
                              }
                            >
                              <Ban className="h-4 w-4 mr-2" /> 1-Month Ban
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                onBanUser(reservation.user_id, reservation.user_name || "User", "permanent")
                              }
                            >
                              <Ban className="h-4 w-4 mr-2" /> Permanent Ban
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  No reservations found matching your criteria
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
}
