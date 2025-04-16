"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, Filter, CheckCircle, XCircle, ChevronDown, Calendar, Clock, User, Home, Loader2 } from "lucide-react"
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

// Update the Supabase client initialization to use the singleton pattern
import { getSupabaseClient } from "@/lib/supabase-client"

// Type for reservation data
interface Reservation {
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
  user_name?: string
  room_name?: string
}

// Type for grouped reservation data
interface GroupedReservation {
  ids: number[]
  booking_name: string
  room_id: number
  user_id: string
  date: string
  time_slots: { start_time: string; end_time: string }[]
  status: "Pending" | "Approved" | "Rejected"
  purpose: string
  confirmation_number: string
  contact_email?: string
  contact_phone?: string
  user_name?: string
  room_name?: string
}

export default function AdminPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [currentTab, setCurrentTab] = useState("all")
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    ids: number[] | null
    action: "approve" | "reject" | null
  }>({ open: false, ids: null, action: null })
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [groupedReservations, setGroupedReservations] = useState<GroupedReservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Initialize Supabase client
  // const supabase = createClientComponentClient({
  //   supabaseUrl,
  //   supabaseKey: supabaseAnonKey,
  // })
  const supabase = getSupabaseClient()

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

        // If admin, fetch reservations
        fetchReservations()
      } catch (error) {
        console.error("Auth check error:", error)
      }
    }

    checkAuth()
  }, [router])

  // Group reservations by confirmation number base AND date
  useEffect(() => {
    if (reservations.length > 0) {
      const grouped: { [key: string]: GroupedReservation } = {}

      reservations.forEach((reservation) => {
        // Extract the base confirmation number (before the dash or the whole if no dash)
        const baseConfirmation = reservation.confirmation_number.split("-")[0]

        // Create a unique key combining the confirmation base and date
        const groupKey = `${baseConfirmation}-${reservation.date}`

        if (!grouped[groupKey]) {
          grouped[groupKey] = {
            ids: [reservation.id],
            booking_name: reservation.booking_name,
            room_id: reservation.room_id,
            user_id: reservation.user_id,
            date: reservation.date,
            time_slots: [{ start_time: reservation.start_time, end_time: reservation.end_time }],
            status: reservation.status,
            purpose: reservation.purpose,
            confirmation_number: baseConfirmation,
            contact_email: reservation.contact_email,
            contact_phone: reservation.contact_phone,
            user_name: reservation.user_name,
            room_name: reservation.room_name,
          }
        } else {
          grouped[groupKey].ids.push(reservation.id)
          grouped[groupKey].time_slots.push({
            start_time: reservation.start_time,
            end_time: reservation.end_time,
          })

          // If any reservation in the group is pending, mark the whole group as pending
          if (reservation.status === "Pending" && grouped[groupKey].status !== "Pending") {
            grouped[groupKey].status = "Pending"
          }
          // If all are approved but one is rejected, mark as rejected
          else if (reservation.status === "Rejected" && grouped[groupKey].status === "Approved") {
            grouped[groupKey].status = "Rejected"
          }
        }
      })

      // Sort time slots chronologically for each group
      Object.values(grouped).forEach((group) => {
        group.time_slots.sort((a, b) => {
          return a.start_time.localeCompare(b.start_time)
        })
      })

      setGroupedReservations(Object.values(grouped))
    }
  }, [reservations])

  // Fetch reservations from Supabase
  const fetchReservations = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log("Fetching reservations...")

      // Create a new Supabase client for this request
      const supabase = createClientComponentClient({
        supabaseUrl,
        supabaseKey: supabaseAnonKey,
      })

      // Fetch all reservations
      const { data: reservationsData, error: reservationsError } = await supabase
        .from("reservations")
        .select("*")
        .order("date", { ascending: false })

      if (reservationsError) {
        console.error("Error fetching reservations:", reservationsError)
        throw reservationsError
      }

      console.log("Fetched reservations:", reservationsData)

      // Fetch room names and user names
      const enhancedReservations = await Promise.all(
        (reservationsData || []).map(async (reservation) => {
          try {
            // Get room name
            const { data: roomData } = await supabase
              .from("rooms")
              .select("name")
              .eq("id", reservation.room_id)
              .single()

            // Get user name
            const { data: userData } = await supabase
              .from("profiles")
              .select("full_name, email")
              .eq("id", reservation.user_id)
              .single()

            return {
              ...reservation,
              room_name: roomData?.name || `Room ${reservation.room_id}`,
              user_name: userData?.full_name || userData?.email || "Unknown User",
            }
          } catch (error) {
            console.error("Error fetching related data:", error)
            return {
              ...reservation,
              room_name: `Room ${reservation.room_id}`,
              user_name: "Unknown User",
            }
          }
        }),
      )

      console.log("Enhanced reservations:", enhancedReservations)
      setReservations(enhancedReservations)
    } catch (error: any) {
      console.error("Error fetching reservations:", error)
      setError(error.message || "Failed to load reservations")
    } finally {
      setLoading(false)
    }
  }

  // Filter reservations based on search term and status filter
  const filteredReservations = groupedReservations.filter((reservation) => {
    const matchesSearch =
      reservation.booking_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.room_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.date.includes(searchTerm) ||
      reservation.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.purpose.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "All" || reservation.status === statusFilter

    const matchesTab =
      currentTab === "all" ||
      (currentTab === "pending" && reservation.status === "Pending") ||
      (currentTab === "approved" && reservation.status === "Approved") ||
      (currentTab === "rejected" && reservation.status === "Rejected")

    return matchesSearch && matchesStatus && matchesTab
  })

  // Handle approve/reject actions
  const handleAction = (ids: number[], action: "approve" | "reject") => {
    setConfirmDialog({ open: true, ids, action })
  }

  const confirmAction = async () => {
    if (!confirmDialog.ids || !confirmDialog.action) return

    setActionLoading(true)

    try {
      // Create a new Supabase client for this request
      const supabase = createClientComponentClient({
        supabaseUrl,
        supabaseKey: supabaseAnonKey,
      })

      // Update all reservations in the group
      for (const id of confirmDialog.ids) {
        const { error } = await supabase
          .from("reservations")
          .update({
            status: confirmDialog.action === "approve" ? "Approved" : "Rejected",
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)

        if (error) throw error
      }

      // Refresh the reservations list
      await fetchReservations()

      // Close the dialog
      setConfirmDialog({ open: false, ids: null, action: null })
    } catch (error: any) {
      console.error("Error updating reservation:", error)
      setError(error.message || "Failed to update reservation")
    } finally {
      setActionLoading(false)
    }
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
  }

  // Format time slots for display
  const formatTimeSlots = (timeSlots: { start_time: string; end_time: string }[]) => {
    if (!timeSlots.length) return "N/A"

    // If there's only one time slot, just show start and end time
    if (timeSlots.length === 1) {
      return `${timeSlots[0].start_time.substring(0, 5)} - ${timeSlots[0].end_time.substring(0, 5)}`
    }

    // For consecutive time slots, find the earliest start time and latest end time
    const sortedSlots = [...timeSlots].sort((a, b) => a.start_time.localeCompare(b.start_time))

    // Check if slots are consecutive
    let isConsecutive = true
    for (let i = 0; i < sortedSlots.length - 1; i++) {
      const currentEndHour = Number.parseInt(sortedSlots[i].end_time.split(":")[0])
      const nextStartHour = Number.parseInt(sortedSlots[i + 1].start_time.split(":")[0])
      if (currentEndHour !== nextStartHour) {
        isConsecutive = false
        break
      }
    }

    if (isConsecutive) {
      // If consecutive, show as a range
      return `${sortedSlots[0].start_time.substring(0, 5)} - ${sortedSlots[sortedSlots.length - 1].end_time.substring(0, 5)}`
    } else {
      // If not consecutive, list all slots
      return sortedSlots
        .map((slot) => `${slot.start_time.substring(0, 5)} - ${slot.end_time.substring(0, 5)}`)
        .join(", ")
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#5A0D16] text-white">
      {/* Header */}
      <div className="p-4 border-b border-[#8B1F2D]/30 flex justify-between items-center">
        <div className="w-24"></div>
        <h1 className="text-xl font-semibold text-center flex-1">
          <span className="text-[#D4AF37]">INTANIA</span> ADMIN DASHBOARD
        </h1>
        <LogoutButton variant="ghost" className="text-white hover:bg-white/10" />
      </div>

      {/* Main content */}
      <div className="flex-1 p-4 md:p-6 lg:p-8">
        {error && (
          <div className="max-w-7xl mx-auto mb-4 bg-red-500/20 border border-red-500 text-white p-3 rounded-lg">
            {error}
            <Button variant="link" className="text-white underline ml-2" onClick={fetchReservations}>
              Try Again
            </Button>
          </div>
        )}

        <div className="bg-gray-200 rounded-xl overflow-hidden shadow-md text-gray-800 max-w-7xl mx-auto">
          {/* Tabs */}
          <Tabs defaultValue="all" className="w-full" onValueChange={setCurrentTab}>
            <div className="bg-gray-300 p-3">
              <TabsList className="grid grid-cols-4 bg-gray-100">
                <TabsTrigger value="all" className="data-[state=active]:bg-[#5A0D16] data-[state=active]:text-white">
                  All
                </TabsTrigger>
                <TabsTrigger
                  value="pending"
                  className="data-[state=active]:bg-[#5A0D16] data-[state=active]:text-white"
                >
                  Pending
                </TabsTrigger>
                <TabsTrigger
                  value="approved"
                  className="data-[state=active]:bg-[#5A0D16] data-[state=active]:text-white"
                >
                  Approved
                </TabsTrigger>
                <TabsTrigger
                  value="rejected"
                  className="data-[state=active]:bg-[#5A0D16] data-[state=active]:text-white"
                >
                  Rejected
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="m-0">
              <ReservationTable
                reservations={filteredReservations}
                onAction={handleAction}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                loading={loading}
                formatDate={formatDate}
                formatTimeSlots={formatTimeSlots}
              />
            </TabsContent>

            <TabsContent value="pending" className="m-0">
              <ReservationTable
                reservations={filteredReservations}
                onAction={handleAction}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                statusFilter="Pending"
                setStatusFilter={setStatusFilter}
                loading={loading}
                formatDate={formatDate}
                formatTimeSlots={formatTimeSlots}
              />
            </TabsContent>

            <TabsContent value="approved" className="m-0">
              <ReservationTable
                reservations={filteredReservations}
                onAction={handleAction}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                statusFilter="Approved"
                setStatusFilter={setStatusFilter}
                loading={loading}
                formatDate={formatDate}
                formatTimeSlots={formatTimeSlots}
              />
            </TabsContent>

            <TabsContent value="rejected" className="m-0">
              <ReservationTable
                reservations={filteredReservations}
                onAction={handleAction}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                statusFilter="Rejected"
                setStatusFilter={setStatusFilter}
                loading={loading}
                formatDate={formatDate}
                formatTimeSlots={formatTimeSlots}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}>
        <DialogContent className="bg-white text-gray-800">
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.action === "approve" ? "Approve Reservation" : "Reject Reservation"}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {confirmDialog.action === "approve" ? "approve" : "reject"} this reservation?
              {confirmDialog.action === "reject" && " This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ open: false, ids: null, action: null })}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              className={cn(
                confirmDialog.action === "approve" ? "bg-[#5A0D16] hover:bg-[#4A0B12]" : "bg-red-600 hover:bg-red-700",
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
                "Approve"
              ) : (
                "Reject"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface ReservationTableProps {
  reservations: GroupedReservation[]
  onAction: (ids: number[], action: "approve" | "reject") => void
  searchTerm: string
  setSearchTerm: (term: string) => void
  statusFilter: string
  setStatusFilter: (filter: string) => void
  loading: boolean
  formatDate: (date: string) => string
  formatTimeSlots: (timeSlots: { start_time: string; end_time: string }[]) => string
}

function ReservationTable({
  reservations,
  onAction,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  loading,
  formatDate,
  formatTimeSlots,
}: ReservationTableProps) {
  return (
    <div>
      {/* Search and Filter */}
      <div className="p-4 bg-gray-100 border-b border-gray-300 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search by name, room, or purpose..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-white border-gray-300"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex gap-2 bg-white border-gray-300">
              <Filter className="h-4 w-4" />
              Status: {statusFilter}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setStatusFilter("All")}>All</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("Pending")}>Pending</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("Approved")}>Approved</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("Rejected")}>Rejected</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="overflow-x-auto w-full">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-300 text-left">
              <tr>
                <th className="p-3 font-medium w-[18%]">User</th>
                <th className="p-3 font-medium w-[15%]">Room</th>
                <th className="p-3 font-medium w-[22%]">Date & Time</th>
                <th className="p-3 font-medium w-[20%]">Purpose</th>
                <th className="p-3 font-medium w-[10%]">Status</th>
                <th className="p-3 font-medium w-[15%]">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reservations.length > 0 ? (
                reservations.map((reservation) => (
                  <tr key={`${reservation.confirmation_number}-${reservation.date}`} className="hover:bg-gray-50">
                    <td className="p-3">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                          <span className="truncate font-medium">{reservation.user_name}</span>
                        </div>
                        {reservation.contact_email && (
                          <span className="text-xs text-gray-500 truncate pl-6">{reservation.contact_email}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <span className="truncate">{reservation.room_name}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-gray-500 flex-shrink-0" />
                          <span className="truncate">{formatDate(reservation.date)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{formatTimeSlots(reservation.time_slots)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col">
                        <div className="font-medium truncate">{reservation.booking_name}</div>
                        {reservation.purpose && reservation.purpose !== reservation.booking_name && (
                          <div className="text-xs text-gray-500 truncate">{reservation.purpose}</div>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <span
                        className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium inline-block",
                          reservation.status === "Pending" && "bg-yellow-100 text-yellow-800",
                          reservation.status === "Approved" && "bg-green-100 text-green-800",
                          reservation.status === "Rejected" && "bg-red-100 text-red-800",
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
                              className="bg-[#5A0D16] hover:bg-[#4A0B12] text-white"
                              onClick={() => onAction(reservation.ids, "approve")}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              className="bg-red-600 hover:bg-red-700 text-white"
                              onClick={() => onAction(reservation.ids, "reject")}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                        {reservation.status !== "Pending" && (
                          <span className="text-sm text-gray-500 italic">No actions available</span>
                        )}
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
        )}
      </div>
    </div>
  )
}
