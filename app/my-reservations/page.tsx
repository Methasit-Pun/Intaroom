"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, Home, AlertCircle, Loader2, Search, Filter, ChevronDown, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import LogoutButton from "@/components/logout-button"
import { getSupabaseClient } from "@/lib/supabase-client"

interface Reservation {
  id: number
  booking_name: string
  room_id: number
  date: string
  start_time: string
  end_time: string
  status: "Pending" | "Approved" | "Rejected"
  confirmation_number: string
  room_name?: string
}

interface GroupedReservation {
  ids: number[]
  booking_name: string
  room_id: number
  date: string
  time_slots: { start_time: string; end_time: string }[]
  status: "Pending" | "Approved" | "Rejected"
  confirmation_number: string
  room_name?: string
}

export default function MyReservationsPage() {
  const router = useRouter()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [groupedReservations, setGroupedReservations] = useState<GroupedReservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  // Initialize Supabase client
  const supabase = getSupabaseClient()

  // Check for navigation in progress
  useEffect(() => {
    // Check if we're coming from a navigation
    const navigationInProgress = localStorage.getItem("navigationInProgress")
    if (navigationInProgress) {
      // Clear the flag
      localStorage.removeItem("navigationInProgress")
      localStorage.removeItem("lastNavigationTimestamp")
      console.log("Navigation in progress detected, skipping initial loading state")
      setCheckingAuth(false)
    }

    fetchReservations()
  }, [])

  // Group reservations by confirmation number base AND date
  useEffect(() => {
    if (reservations.length > 0) {
      console.log("Grouping reservations:", reservations)
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
            date: reservation.date,
            time_slots: [{ start_time: reservation.start_time, end_time: reservation.end_time }],
            status: reservation.status,
            confirmation_number: baseConfirmation,
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

      const groupedArray = Object.values(grouped)
      console.log("Grouped reservations:", groupedArray)
      setGroupedReservations(groupedArray)
    } else {
      setGroupedReservations([])
    }
  }, [reservations])

  // Update the fetchReservations function to handle auth errors
  const fetchReservations = async () => {
    setLoading(true)
    setError(null)
    setDebugInfo(null)

    try {
      console.log("Fetching reservations...")

      // Get current user
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        console.error("Session error:", sessionError)
        setDebugInfo({ type: "session_error", error: sessionError })

        // Handle refresh token errors
        if (
          sessionError.message?.includes("refresh_token_not_found") ||
          (sessionError as any)?.code === "refresh_token_not_found"
        ) {
          console.log("Refresh token error, signing out")
          await supabase.auth.signOut()
          router.push("/login")
          return
        }

        throw sessionError
      }

      if (!session?.user) {
        console.log("No active session, redirecting to login")
        router.push("/login")
        return
      }

      console.log("User authenticated:", session.user.id)

      // Fetch user's reservations
      const { data: reservationsData, error: reservationsError } = await supabase
        .from("reservations")
        .select("id, booking_name, room_id, date, start_time, end_time, status, confirmation_number")
        .eq("user_id", session.user.id)
        .order("date", { ascending: false })

      if (reservationsError) {
        console.error("Error fetching reservations:", reservationsError)
        setDebugInfo({ type: "reservations_error", error: reservationsError })
        throw reservationsError
      }

      console.log(`Found ${reservationsData?.length || 0} reservations:`, reservationsData)

      if (!reservationsData || reservationsData.length === 0) {
        console.log("No reservations found")
        setReservations([])
        setLoading(false)
        return
      }

      // Fetch room names for each reservation
      const reservationsWithRoomNames = await Promise.all(
        reservationsData.map(async (reservation) => {
          try {
            // Modified query: Don't use .single() and handle the case where no room is found
            const { data: roomsData, error: roomError } = await supabase
              .from("rooms")
              .select("name")
              .eq("id", reservation.room_id)
              .limit(1)

            if (roomError) {
              console.warn(`Error fetching room name for room ${reservation.room_id}:`, roomError)
              return {
                ...reservation,
                room_name: `Room ${reservation.room_id}`,
              }
            }

            // Check if any room data was returned
            if (!roomsData || roomsData.length === 0) {
              console.warn(`No room found with id ${reservation.room_id}`)
              return {
                ...reservation,
                room_name: `Room ${reservation.room_id}`,
              }
            }

            return {
              ...reservation,
              room_name: roomsData[0]?.name || `Room ${reservation.room_id}`,
            }
          } catch (error) {
            console.error("Error in room name fetch:", error)
            return {
              ...reservation,
              room_name: `Room ${reservation.room_id}`,
            }
          }
        }),
      )

      console.log("Reservations with room names:", reservationsWithRoomNames)
      setReservations(reservationsWithRoomNames)
    } catch (error: any) {
      console.error("Error fetching reservations:", error)
      setError(error.message || "Failed to load your reservations")
      setDebugInfo({ type: "general_error", error })

      // Check if it's an auth error
      if (
        error?.message?.includes("refresh_token_not_found") ||
        error?.code === "refresh_token_not_found" ||
        error?.__isAuthError
      ) {
        console.log("Auth error detected, redirecting to login")
        try {
          await supabase.auth.signOut()
        } catch (e) {
          console.error("Failed to sign out after auth error:", e)
        }

        router.push("/login")
      }
    } finally {
      setLoading(false)
      setCheckingAuth(false)
    }
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      // Parse the date string directly without timezone conversion
      // Format: YYYY-MM-DD
      const [year, month, day] = dateString.split("-").map((num) => Number.parseInt(num, 10))

      // Create date with local timezone (month is 0-indexed in JS Date)
      const date = new Date(year, month - 1, day)

      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    } catch (e) {
      console.error("Date formatting error:", e, dateString)
      return dateString
    }
  }

  // Format time for display
  const formatTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(":")
      const hour = Number.parseInt(hours)
      const period = hour >= 12 ? "PM" : "AM"
      const formattedHour = hour % 12 === 0 ? 12 : hour % 12
      return `${formattedHour}:${minutes} ${period}`
    } catch (e) {
      console.error("Time formatting error:", e)
      return timeString
    }
  }

  // Format time slots for display
  const formatTimeSlots = (timeSlots: { start_time: string; end_time: string }[]) => {
    if (!timeSlots.length) return "N/A"

    try {
      // If there's only one time slot, just show start and end time
      if (timeSlots.length === 1) {
        return `${formatTime(timeSlots[0].start_time)} - ${formatTime(timeSlots[0].end_time)}`
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
        return `${formatTime(sortedSlots[0].start_time)} - ${formatTime(sortedSlots[sortedSlots.length - 1].end_time)}`
      } else {
        // If not consecutive, list all slots
        return sortedSlots.map((slot) => `${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`).join(", ")
      }
    } catch (e) {
      console.error("Time slot formatting error:", e)
      return "Error formatting time slots"
    }
  }

  // Filter reservations based on search term and status filter
  const filteredReservations = groupedReservations.filter((reservation) => {
    const matchesSearch =
      reservation.booking_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.room_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.date.includes(searchTerm) ||
      reservation.confirmation_number.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "All" || reservation.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const handleViewDetails = (reservation: GroupedReservation) => {
    // Set navigation flag before navigating
    localStorage.setItem("navigationInProgress", "true")
    localStorage.setItem("lastNavigationTimestamp", Date.now().toString())

    // Navigate to details page with reservation details
    const params = new URLSearchParams()
    params.set("bookingName", reservation.booking_name)
    params.set("roomId", reservation.room_id.toString())
    params.set("roomName", reservation.room_name || `Room ${reservation.room_id}`)
    params.set("date", reservation.date)
    params.set("status", reservation.status)

    // Create time slots array from start and end times
    const timeSlots = reservation.time_slots.map((slot) => {
      const startHour = Number.parseInt(slot.start_time.split(":")[0])
      const period = startHour >= 12 ? "PM" : "AM"
      const displayHour = startHour % 12 === 0 ? 12 : startHour % 12
      return `${displayHour} ${period}`
    })

    params.set("timeSlots", JSON.stringify(timeSlots))
    params.set("confirmationNumber", reservation.confirmation_number)

    router.push(`/reservation-details?${params.toString()}`)
  }

  const handleRetry = () => {
    fetchReservations()
  }

  const handleBackToHome = () => {
    // Set navigation flag before navigating
    localStorage.setItem("navigationInProgress", "true")
    localStorage.setItem("lastNavigationTimestamp", Date.now().toString())

    // Navigate to home
    window.location.href = "/"
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#5A0D16]">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-white mb-4" />
          <p className="text-white">Checking authentication status...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#5A0D16] text-white">
      {/* Header */}
      <div className="p-4 border-b border-[#8B1F2D]/30 flex justify-between items-center">
        <div className="flex items-center">
          <Button variant="ghost" className="text-white hover:bg-white/10 mr-2 -ml-2" onClick={handleBackToHome}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Home
          </Button>
        </div>
        <h1 className="text-xl font-semibold text-center flex-1">
          <span className="text-[#D4AF37]">My</span> Reservation
        </h1>
        <LogoutButton variant="ghost" className="text-white hover:bg-white/10" />
      </div>

      {/* Main content */}
      <div className="flex-1 p-4">
        <div className="max-w-4xl mx-auto bg-gray-200 rounded-xl overflow-hidden shadow-md text-gray-800">
          {/* Search and Filter */}
          <div className="p-4 bg-gray-100 border-b border-gray-300 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search by name, room, or confirmation #..."
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

          {/* Reservations list */}
          <div className="p-4">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
              </div>
            ) : error ? (
              <div className="bg-red-100 border-l-4 border-red-500 p-4 flex flex-col gap-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700">{error}</p>
                </div>
                <Button
                  variant="outline"
                  className="self-start border-red-500 text-red-700 hover:bg-red-50"
                  onClick={handleRetry}
                >
                  Retry
                </Button>
                {debugInfo && (
                  <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-700 font-mono overflow-auto">
                    <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
                  </div>
                )}
              </div>
            ) : filteredReservations.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-gray-100 inline-block p-4 rounded-full mb-4">
                  <Calendar className="h-8 w-8 text-gray-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">No reservations found</h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm || statusFilter !== "All"
                    ? "Try adjusting your search or filter"
                    : "You haven't made any room reservations yet"}
                </p>
                <Button
                  className="bg-[#5A0D16] hover:bg-[#4A0B12] text-white shadow-md transition-all hover:shadow-lg"
                  onClick={handleBackToHome}
                >
                  Make a Reservation
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredReservations.map((reservation) => (
                  <div
                    key={`${reservation.confirmation_number}-${reservation.date}`}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-800">{reservation.booking_name}</h3>
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-xs font-medium",
                              reservation.status === "Pending" && "bg-yellow-100 text-yellow-800",
                              reservation.status === "Approved" && "bg-green-100 text-green-800",
                              reservation.status === "Rejected" && "bg-red-100 text-red-800",
                            )}
                          >
                            {reservation.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">Confirmation #{reservation.confirmation_number}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            {formatDate(reservation.date)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-gray-500" />
                            {formatTimeSlots(reservation.time_slots)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Home className="h-4 w-4 text-gray-500" />
                            {reservation.room_name}
                          </div>
                        </div>
                      </div>
                      <Button
                        className="bg-[#5A0D16] hover:bg-[#4A0B12] text-white shadow-sm transition-all hover:shadow-md"
                        onClick={() => handleViewDetails(reservation)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
