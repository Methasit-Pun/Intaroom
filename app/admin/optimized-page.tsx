"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
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
  RefreshCw,
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
import LogoutButton from "@/components/logout-button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Line, Bar, LineChart, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  fetchDashboardData,
  batchUpdateReservationStatus,
  invalidateCache,
  adminCache,
  type PaginationOptions,
  type AdminDashboardData,
  type EnhancedReservation,
  type UserData
} from "@/lib/admin-api"
import {
  formatTimeSlots,
  formatDateShort,
  formatDate,
  rejectOverlappingReservations,
  storeQRCodeForApprovedReservation,
  generateQRCodeText,
  type GroupedReservation,
  groupReservations
} from "@/lib/reservation-utils"
import { supabaseUrl, supabaseAnonKey } from "@/app/env"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import {
  AdminDashboardSkeleton,
  ReservationsListSkeleton,
  AnalyticsDashboardSkeleton,
  TabsSkeleton,
  ReservationCardSkeleton,
  TableSkeleton,
  InlineLoading
} from "@/components/admin/admin-skeletons"

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  pageSize: number
  totalItems: number
}

const Pagination: React.FC<PaginationProps> = ({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  pageSize, 
  totalItems 
}) => {
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t">
      <div className="text-sm text-gray-700">
        Showing {startItem} to {endItem} of {totalItems} results
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          Previous
        </Button>
        <span className="px-3 py-1 text-sm">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

export default function OptimizedAdminPage() {
  const router = useRouter()
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [currentTab, setCurrentTab] = useState("all")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [pageSize, setPageSize] = useState(20)
  const [currentPage, setCurrentPage] = useState(1)
  
  // Dialog states
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    reservationIds: number[] | null
    action: "approve" | "reject" | null
  }>({ open: false, reservationIds: null, action: null })
  
  const [banDialog, setBanDialog] = useState<{
    open: boolean
    userId: string | null
    userName: string | null
    type: "temporary" | "permanent" | null
  }>({ open: false, userId: null, userName: null, type: null })
  
  const [banReason, setBanReason] = useState("")
  
  // Data states
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [analyticsTimeFrame, setAnalyticsTimeFrame] = useState<"day" | "week" | "month">("week")
  const [refreshKey, setRefreshKey] = useState(0)

  // Memoized pagination options
  const paginationOptions = useMemo<PaginationOptions>(() => ({
    page: currentPage,
    pageSize: pageSize,
    sortBy: 'created_at',
    sortDirection: sortDirection,
    ...(statusFilter !== 'All' && { status: statusFilter }),
    ...(searchTerm.trim() && { search: searchTerm.trim() })
  }), [currentPage, pageSize, sortDirection, statusFilter, searchTerm])

  // Calculate total pages
  const totalPages = Math.ceil((dashboardData?.totalCount || 0) / pageSize)

  // Grouped reservations for compatibility with existing UI
  const groupedReservations = useMemo(() => {
    if (!dashboardData?.reservations) return []
    
    // Convert enhanced reservations back to the grouped format
    const reservationGroups = groupReservations(
      dashboardData.reservations.map(res => ({
        id: res.id,
        booking_name: res.booking_name,
        room_id: res.room_id,
        user_id: res.user_id,
        date: res.date,
        start_time: res.start_time,
        end_time: res.end_time,
        status: res.status,
        purpose: res.purpose,
        confirmation_number: res.confirmation_number,
        contact_email: res.contact_email,
        contact_phone: res.contact_phone,
        user_name: res.user_name,
        room_name: res.room_name,
        created_at: res.created_at,
        attendees: res.attendees
      })),
      sortDirection
    )
    
    return reservationGroups
  }, [dashboardData?.reservations, sortDirection])

  // Check admin authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAdmin = localStorage.getItem("isAdmin") === "true"
        if (!isAdmin) {
          router.push("/login")
          return
        }
      } catch (error) {
        console.error("Auth check error:", error)
        router.push("/login")
      }
    }
    checkAuth()
  }, [router])

  // Fetch dashboard data with debouncing
  const fetchData = useCallback(async (useCache = true) => {
    if (!paginationOptions) return
    
    setLoading(true)
    setError(null)

    try {
      console.log("🔄 Fetching optimized dashboard data...", paginationOptions)
      
      const data = await fetchDashboardData(
        paginationOptions,
        analyticsTimeFrame,
        useCache
      )
      
      setDashboardData(data)
      console.log("✅ Dashboard data loaded successfully")
    } catch (error) {
      console.error("❌ Error fetching dashboard data:", error)
      setError(error instanceof Error ? error.message : "Failed to load dashboard data")
    } finally {
      setLoading(false)
    }
  }, [paginationOptions, analyticsTimeFrame])

  // Initial load and refresh when dependencies change
  useEffect(() => {
    fetchData(true)
  }, [fetchData, refreshKey])

  // Reset to first page when search/filter changes
  useEffect(() => {
    if (currentPage > 1) {
      setCurrentPage(1)
    }
  }, [searchTerm, statusFilter, pageSize])

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    // Clear cache for new page to ensure fresh data
    invalidateCache('dashboard_')
  }

  // Handle refresh
  const handleRefresh = () => {
    invalidateCache()
    setRefreshKey(prev => prev + 1)
  }

  // Handle sort direction toggle
  const toggleSortDirection = () => {
    setSortDirection(current => current === "asc" ? "desc" : "asc")
    invalidateCache('dashboard_')
  }

  // Handle reservation actions
  const handleAction = (reservationIds: number[], action: "approve" | "reject") => {
    setConfirmDialog({ open: true, reservationIds, action })
  }

  const confirmAction = async () => {
    if (!confirmDialog.reservationIds || !confirmDialog.action) return

    setActionLoading(true)

    try {
      await batchUpdateReservationStatus(
        confirmDialog.reservationIds,
        confirmDialog.action === "approve" ? "Approved" : "Rejected"
      )

      // If approving, handle overlapping reservations and QR code generation
      if (confirmDialog.action === "approve") {
        try {
          const approvedReservation = groupedReservations.find(res => 
            res.ids.some(id => confirmDialog.reservationIds?.includes(id))
          )

          if (approvedReservation) {
            // Reject overlapping reservations
            const rejectionResult = await rejectOverlappingReservations(
              approvedReservation,
              supabaseUrl,
              supabaseAnonKey
            )
            
            if (rejectionResult.rejectedCount > 0) {
              console.log(`✅ Auto-rejected ${rejectionResult.rejectedCount} overlapping reservations`)
            }
            
            // Generate and store QR code
            await storeQRCodeForApprovedReservation(
              approvedReservation,
              supabaseUrl,
              supabaseAnonKey
            )
            
            console.log("✅ QR code generated successfully")
          }
        } catch (qrError) {
          console.error("⚠️ QR code generation failed:", qrError)
          // Don't fail the entire operation
        }
      }

      // Invalidate cache and refresh data
      invalidateCache()
      await fetchData(false)

      setConfirmDialog({ open: false, reservationIds: null, action: null })
    } catch (error) {
      console.error("❌ Failed to update reservation:", error)
      setError(error instanceof Error ? error.message : "Failed to update reservation")
    } finally {
      setActionLoading(false)
    }
  }

  // Handle user ban
  const handleBanUser = (userId: string, userName: string, type: "temporary" | "permanent") => {
    setBanDialog({ open: true, userId, userName, type })
    setBanReason("")
  }

  const confirmBanUser = async () => {
    if (!banDialog.userId || !banDialog.type) return

    setActionLoading(true)

    try {
      const supabase = createClientComponentClient({
        supabaseUrl,
        supabaseKey: supabaseAnonKey,
      })

      const banUntil = banDialog.type === "temporary"
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
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

      // Invalidate cache and refresh
      invalidateCache()
      await fetchData(false)

      setBanDialog({ open: false, userId: null, userName: null, type: null })
      setBanReason("")
    } catch (error) {
      console.error("Error banning user:", error)
      setError(error instanceof Error ? error.message : "Failed to ban user")
    } finally {
      setActionLoading(false)
    }
  }

  // Filter reservations for current tab
  const filteredReservations = useMemo(() => {
    return groupedReservations.filter(reservation => {
      switch (currentTab) {
        case "pending":
          return reservation.status === "Pending"
        case "approved":
          return reservation.status === "Approved"
        case "rejected":
          return reservation.status === "Rejected"
        default:
          return true
      }
    })
  }, [groupedReservations, currentTab])

  if (loading && !dashboardData) {
    return <AdminDashboardSkeleton />
  }

  if (error && !dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#5A0D16] text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Admin Dashboard (Optimized)</h1>
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              className="text-white border-white hover:bg-white hover:text-[#5A0D16]"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
          <LogoutButton />
        </div>
      </header>

      <div className="container mx-auto p-4">
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All Reservations</TabsTrigger>
            <TabsTrigger value="pending">Pending ({dashboardData?.analytics.pendingReservations || 0})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({dashboardData?.analytics.approvedReservations || 0})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({dashboardData?.analytics.rejectedReservations || 0})</TabsTrigger>
          </TabsList>

          {/* Main Content Tabs */}
          <TabsContent value="all" className="mt-6">
            {loading ? (
              <ReservationsListSkeleton />
            ) : (
              <ReservationsList
                reservations={filteredReservations}
                loading={loading}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                sortDirection={sortDirection}
                toggleSortDirection={toggleSortDirection}
                onAction={handleAction}
                onBanUser={handleBanUser}
                totalCount={dashboardData?.totalCount || 0}
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                setPageSize={setPageSize}
                onPageChange={handlePageChange}
              />
            )}
          </TabsContent>

          <TabsContent value="pending" className="mt-6">
            {loading ? (
              <ReservationsListSkeleton />
            ) : (
              <ReservationsList
                reservations={filteredReservations}
                loading={loading}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                sortDirection={sortDirection}
                toggleSortDirection={toggleSortDirection}
                onAction={handleAction}
                onBanUser={handleBanUser}
                totalCount={dashboardData?.totalCount || 0}
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                setPageSize={setPageSize}
                onPageChange={handlePageChange}
              />
            )}
          </TabsContent>

          <TabsContent value="approved" className="mt-6">
            {loading ? (
              <ReservationsListSkeleton />
            ) : (
              <ReservationsList
                reservations={filteredReservations}
                loading={loading}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                sortDirection={sortDirection}
                toggleSortDirection={toggleSortDirection}
                onAction={handleAction}
                onBanUser={handleBanUser}
                totalCount={dashboardData?.totalCount || 0}
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                setPageSize={setPageSize}
                onPageChange={handlePageChange}
              />
            )}
          </TabsContent>

          <TabsContent value="rejected" className="mt-6">
            {loading ? (
              <ReservationsListSkeleton />
            ) : (
              <ReservationsList
                reservations={filteredReservations}
                loading={loading}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                sortDirection={sortDirection}
                toggleSortDirection={toggleSortDirection}
                onAction={handleAction}
                onBanUser={handleBanUser}
                totalCount={dashboardData?.totalCount || 0}
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                setPageSize={setPageSize}
                onPageChange={handlePageChange}
              />
            )}
          </TabsContent>
        </Tabs>

        {/* Analytics Section */}
        <div className="mt-8">
          {loading ? (
            <AnalyticsDashboardSkeleton />
          ) : (
            <AnalyticsDashboard 
              analytics={dashboardData?.analytics}
              timeFrame={analyticsTimeFrame}
              setTimeFrame={setAnalyticsTimeFrame}
            />
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.action === "approve" ? "Approve" : "Reject"} Reservation
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {confirmDialog.action} this reservation?
              {confirmDialog.action === "approve" && 
                " This will generate a QR code and automatically reject any overlapping reservations."
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ open: false, reservationIds: null, action: null })}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              disabled={actionLoading}
              className={cn(
                confirmDialog.action === "approve" 
                  ? "bg-[#5A0D16] hover:bg-[#4A0B12]" 
                  : "bg-red-600 hover:bg-red-700"
              )}
            >
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {confirmDialog.action === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban User Dialog */}
      <Dialog open={banDialog.open} onOpenChange={(open) => setBanDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {banDialog.type === "temporary" ? "Temporary Ban" : "Permanent Ban"} User
            </DialogTitle>
            <DialogDescription>
              Ban user: {banDialog.userName}
              {banDialog.type === "temporary" && " for 30 days"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="ban-reason">Reason for ban</Label>
              <Textarea
                id="ban-reason"
                placeholder="Enter reason for ban..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBanDialog({ open: false, userId: null, userName: null, type: null })}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmBanUser}
              disabled={actionLoading || !banReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Ban User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Reservations List Component
interface ReservationsListProps {
  reservations: GroupedReservation[]
  loading: boolean
  searchTerm: string
  setSearchTerm: (term: string) => void
  statusFilter: string
  setStatusFilter: (filter: string) => void
  sortDirection: "asc" | "desc"
  toggleSortDirection: () => void
  onAction: (ids: number[], action: "approve" | "reject") => void
  onBanUser: (userId: string, userName: string, type: "temporary" | "permanent") => void
  totalCount: number
  currentPage: number
  totalPages: number
  pageSize: number
  setPageSize: (size: number) => void
  onPageChange: (page: number) => void
}

const ReservationsList: React.FC<ReservationsListProps> = ({
  reservations,
  loading,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  sortDirection,
  toggleSortDirection,
  onAction,
  onBanUser,
  totalCount,
  currentPage,
  totalPages,
  pageSize,
  setPageSize,
  onPageChange
}) => {
  return (
    <div className="bg-white rounded-lg shadow">
      {/* Filters and Controls */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search reservations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Status: {statusFilter}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setStatusFilter("All")}>All</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("Pending")}>Pending</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("Approved")}>Approved</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("Rejected")}>Rejected</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" onClick={toggleSortDirection}>
              <ArrowUpDown className="h-4 w-4 mr-2" />
              {sortDirection === "desc" ? "Newest First" : "Oldest First"}
            </Button>

            <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20 (Recommended)</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && reservations.length === 0 && (
        <div className="divide-y divide-gray-200">
          {Array.from({ length: 20 }).map((_, index) => (
            <ReservationCardSkeleton key={index} />
          ))}
        </div>
      )}

      {/* Partial Loading State (when refreshing with existing data) */}
      {loading && reservations.length > 0 && (
        <div className="p-4 bg-blue-50 border-b">
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Updating reservations...</span>
          </div>
        </div>
      )}

      {/* Reservations List */}
      {!loading && reservations.length > 0 && (
        <>
          <div className="divide-y divide-gray-200">
            {reservations.map((reservation) => (
              <ReservationCard
                key={`${reservation.confirmation_number}-${reservation.date}-${reservation.room_id}`}
                reservation={reservation}
                onAction={onAction}
                onBanUser={onBanUser}
                isProcessing={loading}
              />
            ))}
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            pageSize={pageSize}
            totalItems={totalCount}
          />
        </>
      )}

      {/* Empty State */}
      {!loading && reservations.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          <p>No reservations found matching your criteria</p>
        </div>
      )}
    </div>
  )
}

// Individual Reservation Card Component
interface ReservationCardProps {
  reservation: GroupedReservation
  onAction: (ids: number[], action: "approve" | "reject") => void
  onBanUser: (userId: string, userName: string, type: "temporary" | "permanent") => void
  isProcessing?: boolean
}

const ReservationCard: React.FC<ReservationCardProps> = ({ 
  reservation, 
  onAction, 
  onBanUser,
  isProcessing = false 
}) => {
  if (isProcessing) {
    return <ReservationCardSkeleton />
  }
  return (
    <div className="p-4">
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
  )
}

// Analytics Dashboard Component
interface AnalyticsDashboardProps {
  analytics: AdminDashboardData['analytics'] | undefined
  timeFrame: "day" | "week" | "month"
  setTimeFrame: (timeFrame: "day" | "week" | "month") => void
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ analytics, timeFrame, setTimeFrame }) => {
  if (!analytics) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Analytics Dashboard</CardTitle>
          <Select value={timeFrame} onValueChange={setTimeFrame}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Last Day</SelectItem>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-gray-50 rounded">
            <div className="text-2xl font-bold text-blue-600">{analytics.totalReservations}</div>
            <div className="text-sm text-gray-600">Total Reservations</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded">
            <div className="text-2xl font-bold text-yellow-600">{analytics.pendingReservations}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded">
            <div className="text-2xl font-bold text-green-600">{analytics.approvedReservations}</div>
            <div className="text-sm text-gray-600">Approved</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded">
            <div className="text-2xl font-bold text-red-600">{analytics.rejectedReservations}</div>
            <div className="text-sm text-gray-600">Rejected</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Room Usage Chart */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Room Usage</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.roomUsage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="room_name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#5A0D16" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Time Slot Usage Chart */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Time Slot Usage</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.timeSlotUsage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#5A0D16" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Bookings Trend */}
        {analytics.dailyBookings.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Daily Bookings Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.dailyBookings}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#5A0D16" strokeWidth={2} name="Total" />
                <Line type="monotone" dataKey="approved" stroke="#10B981" strokeWidth={2} name="Approved" />
                <Line type="monotone" dataKey="pending" stroke="#F59E0B" strokeWidth={2} name="Pending" />
                <Line type="monotone" dataKey="rejected" stroke="#EF4444" strokeWidth={2} name="Rejected" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}