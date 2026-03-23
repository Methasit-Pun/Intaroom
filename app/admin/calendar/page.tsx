"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Clock,
  User,
  Home,
  Loader2,
  Filter,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { supabaseUrl, supabaseAnonKey } from "@/app/env"
import LogoutButton from "@/components/logout-button"
import { type Reservation } from "@/lib/reservation-utils"

// Static room data (same as in room-reservation component)
const staticRooms = [
  {
    id: 1,
    name: "Dreamscape Room (AIS 5G Garage Room)",
    capacity: "8-10",
    features: ["Projector", "TV"],
    location: "1st Floor – Chula Engineering Centennial Building",
  },
  {
    id: 2,
    name: "601 IOIC Room",
    capacity: "30-50",
    features: ["Projector", "Whiteboard"],
    location: "6th Floor – Chula Engineering Centennial Building (IOIC Lab)",
  },
  {
    id: 3,
    name: "602 Grass Room",
    capacity: "30-50",
    features: ["TV", "Conference Phone"],
    location: "6th Floor – Chula Engineering Centennial Building",
  },
]

// Extended time slots from 8 AM to 10 PM (same as user calendar)
const extendedTimeSlots = [
  "8 AM",
  "9 AM",
  "10 AM",
  "11 AM",
  "12 PM",
  "1 PM",
  "2 PM",
  "3 PM",
  "4 PM",
  "5 PM",
  "6 PM",
  "7 PM",
  "8 PM",
  "9 PM",
  "10 PM",
]

interface AdminCalendarReservation extends Reservation {
  user_name?: string
  room_name?: string
}

export default function AdminCalendarPage() {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedRoom, setSelectedRoom] = useState<number | "all">("all")
  const [reservations, setReservations] = useState<AdminCalendarReservation[]>([])
  const [monthReservations, setMonthReservations] = useState<AdminCalendarReservation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize Supabase client
  const supabase = createClientComponentClient({
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
  })

  // Format date as YYYY-MM-DD in local timezone
  const formatDateForDatabase = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  // Generate calendar days for the current month view (copied from room-reservation)
  const generateCalendarDays = () => {
    const days = []
    const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
    const lastDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)

    // Get the first Sunday before or on the first day of the month
    const startDate = new Date(firstDay)
    startDate.setDate(firstDay.getDate() - firstDay.getDay())

    // Get the last Saturday after or on the last day of the month
    const endDate = new Date(lastDay)
    const daysToAdd = 6 - lastDay.getDay()
    endDate.setDate(lastDay.getDate() + daysToAdd)

    // Generate all days in the calendar view
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      days.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return days
  }

  // Fetch reservations for the entire month to show status dots
  const fetchMonthReservations = async (date: Date, roomId: number | "all") => {
    try {
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0)
      
      const startDate = formatDateForDatabase(firstDay)
      const endDate = formatDateForDatabase(lastDay)
      
      console.log(`Fetching month reservations from ${startDate} to ${endDate}, room: ${roomId}`)

      let query = supabase
        .from("reservations")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate)
        .neq("status", "Cancelled")
        .order("date", { ascending: true })

      if (roomId !== "all") {
        query = query.eq("room_id", roomId)
      }

      const { data, error } = await query

      if (error) {
        console.error("Error fetching month reservations:", error)
        setMonthReservations([])
        return
      }

      console.log(`Found ${data?.length || 0} month reservations:`, data)
      setMonthReservations(data || [])
    } catch (error) {
      console.error("Error in fetchMonthReservations:", error)
      setMonthReservations([])
    }
  }

  // Get reservation statuses for a specific date
  const getDateReservationStatuses = (date: Date) => {
    const dateStr = formatDateForDatabase(date)
    const dayReservations = monthReservations.filter(res => res.date === dateStr)
    
    const statuses = [...new Set(dayReservations.map(res => res.status))]
    return statuses
  }

  // Fetch all reservations for the selected date
  const fetchReservations = async (date: Date, roomId: number | "all") => {
    setLoading(true)
    setError(null)
    
    try {
      const dateStr = formatDateForDatabase(date)
      console.log(`Fetching reservations for date ${dateStr}, room: ${roomId}`)

      let query = supabase
        .from("reservations")
        .select("*")
        .eq("date", dateStr)
        .neq("status", "Cancelled")
        .order("start_time", { ascending: true })

      if (roomId !== "all") {
        query = query.eq("room_id", roomId)
      }

      const { data, error } = await query

      if (error) {
        console.error("Error fetching reservations:", error)
        setError("Failed to load reservations")
        setReservations([])
        return
      }

      // Batch fetch all user profiles in a single query to avoid N+1
      const userIds = [...new Set((data || []).map((r) => r.user_id).filter(Boolean))]
      const { data: profiles } = userIds.length > 0
        ? await supabase
            .from("profiles")
            .select("id, full_name, username, email")
            .in("id", userIds)
        : { data: [] }

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]))

      const enhancedReservations = (data || []).map((reservation) => {
        const profile = profileMap.get(reservation.user_id)
        return {
          ...reservation,
          user_name: profile?.full_name || profile?.username || profile?.email || "Unknown User",
          room_name: staticRooms.find((room) => room.id === reservation.room_id)?.name || "Unknown Room",
        }
      })

      console.log(`Found ${enhancedReservations.length} reservations:`, enhancedReservations)
      setReservations(enhancedReservations)
    } catch (error) {
      console.error("Error in fetchReservations:", error)
      setError("Failed to load reservations")
      setReservations([])
    } finally {
      setLoading(false)
    }
  }

  // Effect to fetch reservations when date or room changes
  useEffect(() => {
    fetchReservations(selectedDate, selectedRoom)
    fetchMonthReservations(selectedDate, selectedRoom)
  }, [selectedDate, selectedRoom])

  // Navigate to previous day
  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() - 1)
    setSelectedDate(newDate)
  }

  // Navigate to next day
  const goToNextDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + 1)
    setSelectedDate(newDate)
  }

  // Go to today
  const goToToday = () => {
    setSelectedDate(new Date())
  }

  // Format date for display
  const formatDisplayDate = (date: Date): string => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    })
  }

  // Check if a time slot has reservations
  const getReservationsForTimeSlot = (timeSlot: string) => {
    return reservations.filter(reservation => {
      const startTime = reservation.start_time.substring(0, 5) // Get HH:MM
      const endTime = reservation.end_time.substring(0, 5)
      
      // Convert time slot to 24-hour format for comparison
      let slotHour = parseInt(timeSlot.split(' ')[0])
      const isPM = timeSlot.includes('PM')
      if (isPM && slotHour !== 12) slotHour += 12
      if (!isPM && slotHour === 12) slotHour = 0
      
      const slotTime = `${slotHour.toString().padStart(2, '0')}:00`
      
      return startTime <= slotTime && slotTime < endTime
    })
  }

  // Get unique rooms from current reservations
  const getActiveRooms = () => {
    if (selectedRoom !== "all") {
      return staticRooms.filter(room => room.id === selectedRoom)
    }
    
    const activeRoomIds = [...new Set(reservations.map(r => r.room_id))]
    return staticRooms.filter(room => activeRoomIds.includes(room.id))
  }

  return (
    <div className="min-h-screen bg-[#5A0D16]">
      {/* Header */}
      <div className="bg-[#5A0D16] shadow-sm border-b border-[#8B1F2D]/30">
        <div className="max-w-[100vw] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/admin")}
                className="flex items-center space-x-2 text-white hover:bg-white/20 border border-white/30"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Admin</span>
              </Button>
              <div className="h-6 w-px bg-[#8B1F2D]" />
              <Calendar className="h-6 w-6 text-[#D4AF37]" />
              <h1 className="text-xl font-semibold text-white">Admin Calendar</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <LogoutButton variant="ghost" className="text-white hover:bg-white/20 border border-white/30" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[95vw] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Compact Date Navigation */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 bg-white rounded-xl p-4 shadow-md">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={goToPreviousDay} className="bg-gray-100 text-black border-gray-300 hover:bg-gray-200">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center min-w-[250px]">
              <h2 className="text-lg font-semibold text-black">{formatDisplayDate(selectedDate)}</h2>
            </div>
            <Button variant="outline" size="sm" onClick={goToNextDay} className="bg-gray-100 text-black border-gray-300 hover:bg-gray-200">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday} className="bg-[#D4AF37] text-black border-[#D4AF37] hover:bg-[#B8941F] font-semibold">
              Today
            </Button>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-[#D4AF37]" />
              <Select value={selectedRoom.toString()} onValueChange={(value) => setSelectedRoom(value === "all" ? "all" : parseInt(value))}>
                <SelectTrigger className="w-[200px] bg-white text-black border-gray-300">
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-300">
                  <SelectItem value="all" className="text-black hover:bg-gray-100">All Rooms</SelectItem>
                  {staticRooms.map((room) => (
                    <SelectItem key={room.id} value={room.id.toString()} className="text-black hover:bg-gray-100">
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Main Layout - Two Column Design */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
          </div>
        ) : error ? (
          <div className="text-center text-red-400 py-8">
            <p>{error}</p>
            <Button 
              variant="outline" 
              onClick={() => fetchReservations(selectedDate, selectedRoom)}
              className="mt-4 bg-white text-black border-white hover:bg-gray-100"
            >
              Try Again
            </Button>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-180px)]">
            {/* Left Column - Calendar View and Room Filter */}
            <div className="w-full lg:w-1/3 space-y-4 overflow-hidden">
              {/* Calendar Month View */}
              <div className="flex-shrink-0">
                <h3 className="text-lg font-medium mb-3 text-white">Calendar View</h3>
                <div className="bg-gray-200 rounded-xl overflow-hidden shadow-md">
                  {/* Month Navigation */}
                  <div className="flex items-center justify-between p-3 bg-gray-300">
                    <button
                      className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                      onClick={() => {
                        const prevMonth = new Date(selectedDate)
                        prevMonth.setMonth(prevMonth.getMonth() - 1)
                        setSelectedDate(prevMonth)
                        fetchMonthReservations(prevMonth, selectedRoom)
                      }}
                      disabled={loading}
                    >
                      <ChevronLeft className="h-5 w-5 text-gray-700" />
                    </button>
                    <h3 className="font-medium text-gray-800">
                      {selectedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </h3>
                    <button
                      className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                      onClick={() => {
                        const nextMonth = new Date(selectedDate)
                        nextMonth.setMonth(nextMonth.getMonth() + 1)
                        setSelectedDate(nextMonth)
                        fetchMonthReservations(nextMonth, selectedRoom)
                      }}
                      disabled={loading}
                    >
                      <ChevronRight className="h-5 w-5 text-gray-700" />
                    </button>
                  </div>

                  {/* Days of Week */}
                  <div className="grid grid-cols-7 text-center p-2 text-xs bg-gray-100 text-gray-700">
                    <div>Sun</div>
                    <div>Mon</div>
                    <div>Tue</div>
                    <div>Wed</div>
                    <div>Thu</div>
                    <div>Fri</div>
                    <div>Sat</div>
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1 p-2 bg-gray-100">
                    {generateCalendarDays().map((day, index) => {
                      const isSelected =
                        day &&
                        day.getDate() === selectedDate.getDate() &&
                        day.getMonth() === selectedDate.getMonth() &&
                        day.getFullYear() === selectedDate.getFullYear()

                      const isCurrentMonth = day && day.getMonth() === selectedDate.getMonth()
                      const isToday = day && 
                        day.getDate() === new Date().getDate() &&
                        day.getMonth() === new Date().getMonth() &&
                        day.getFullYear() === new Date().getFullYear()

                      // Get reservation statuses for this day
                      const dayStatuses = day ? getDateReservationStatuses(day) : []

                      return (
                        <button
                          key={day ? day.toISOString() : `empty-${index}`}
                          className={cn(
                            "h-10 w-10 rounded-lg flex items-center justify-center text-sm relative transition-all duration-200",
                            !day ? "invisible" : "",
                            isSelected 
                              ? "bg-[#B82C3A] text-white shadow-lg scale-105" 
                              : isToday
                              ? "bg-[#D4AF37] text-[#5A0D16] font-bold"
                              : isCurrentMonth 
                              ? "text-gray-700 hover:bg-gray-200 hover:scale-105" 
                              : "text-gray-400 hover:bg-gray-100",
                            day && "hover:shadow-md",
                          )}
                          disabled={!day || loading}
                          onClick={() => {
                            if (day) {
                              console.log("Admin selected date:", day.toDateString())
                              setSelectedDate(day)
                              // Show loading state immediately
                              setLoading(true)
                              // Fetch reservations with a small delay to show loading
                              setTimeout(() => {
                                fetchReservations(day, selectedRoom)
                              }, 100)
                            }
                          }}
                        >
                          {day ? day.getDate() : ""}
                          
                          {/* Status dots */}
                          {day && dayStatuses.length > 0 && (
                            <div className="absolute -top-1 -right-1 flex space-x-0.5">
                              {dayStatuses.includes("Approved") && (
                                <div className="w-2 h-2 bg-green-500 rounded-full border border-white shadow-sm"></div>
                              )}
                              {dayStatuses.includes("Pending") && (
                                <div className="w-2 h-2 bg-red-500 rounded-full border border-white shadow-sm"></div>
                              )}
                              {dayStatuses.includes("Rejected") && (
                                <div className="w-2 h-2 bg-gray-800 rounded-full border border-white shadow-sm"></div>
                              )}
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Room Filter */}
              <div className="flex-1 min-h-0">
                <h2 className="text-lg font-medium mb-3 text-white">Room Filter</h2>
                <div className="bg-white rounded-xl border-2 border-gray-300 shadow-xl h-full overflow-y-auto">
                  <div className="p-4">
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-black mb-2">Select Room</label>
                      <Select value={selectedRoom.toString()} onValueChange={(value) => setSelectedRoom(value === "all" ? "all" : parseInt(value))}>
                        <SelectTrigger className="w-full border-2 border-gray-300 hover:border-gray-400 transition-colors text-black">
                          <SelectValue placeholder="Select room" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="all" className="text-black hover:bg-gray-100">All Rooms</SelectItem>
                          {staticRooms.map((room) => (
                            <SelectItem key={room.id} value={room.id.toString()} className="text-black hover:bg-gray-100">
                              {room.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Legend */}
                    <div className="mb-4 space-y-3">
                      <h3 className="text-sm font-bold text-black border-b border-gray-200 pb-2">Status Legend</h3>
                      <div className="grid grid-cols-1 gap-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full shadow-sm flex-shrink-0"></div>
                          <span className="text-xs text-black font-medium">Approved</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full shadow-sm flex-shrink-0"></div>
                          <span className="text-xs text-black font-medium">Pending</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-gray-800 rounded-full shadow-sm flex-shrink-0"></div>
                          <span className="text-xs text-black font-medium">Rejected</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Calendar Dots Info */}
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-2">
                        <span className="font-semibold">Calendar dots:</span> Show daily status
                      </p>
                      <div className="flex items-center space-x-1 text-xs text-gray-600">
                        <div className="flex space-x-0.5">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        </div>
                        <span>Multiple statuses</span>
                      </div>
                    </div>

        
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Full Reservation Schedule */}
            <div className="w-full lg:w-2/3">
              <h2 className="text-lg font-medium mb-3 text-white">Reservation Schedule</h2>
              <div className="bg-white rounded-xl border-2 border-gray-300 shadow-xl h-[calc(100vh-220px)]">
                {getActiveRooms().length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium text-black">No reservations found for this date</p>
                      <p className="text-sm text-gray-600">Select a different date or check other rooms</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full overflow-y-auto">
                    {getActiveRooms().map((room, roomIndex) => (
                      <div key={room.id} className={cn(
                        "border-b-4 border-gray-200",
                        roomIndex === getActiveRooms().length - 1 ? "border-b-0" : ""
                      )}>
                        {/* Room Header */}
                        <div className="bg-gradient-to-r from-gray-300 to-gray-400 p-4 border-b-2 border-gray-500 sticky top-0 z-50">
                          <h3 className="font-bold text-black text-lg">{room.name}</h3>
                          <p className="text-sm text-black font-medium">{room.capacity} people • {room.location}</p>
                        </div>

                        {/* Time Slots for this room */}
                        <div className="p-4 bg-gray-50">
                          <div className="grid gap-2">
                            {extendedTimeSlots.map((timeSlot) => {
                              const slotReservations = getReservationsForTimeSlot(timeSlot).filter(r => r.room_id === room.id)
                              
                              return (
                                <div key={`${room.id}-${timeSlot}`} className="flex items-center min-h-[60px]">
                                  <div className="w-16 text-sm text-black flex-shrink-0 font-bold">{timeSlot}</div>
                                  <div className="flex-1 h-14 relative ml-4">
                                    {slotReservations.length === 0 ? (
                                      <div className="h-full bg-green-50 border border-green-300 rounded-lg flex items-center justify-center hover:bg-green-100 transition-colors">
                                        <span className="text-xs text-green-600 font-medium">Available</span>
                                      </div>
                                    ) : (
                                      <div className="relative h-full">
                                        {slotReservations.map((reservation, index) => {
                                          const statusStyles = {
                                            "Approved": "bg-green-500 text-white border-green-600",
                                            "Pending": "bg-red-500 text-white border-red-600", 
                                            "Rejected": "bg-gray-800 text-white border-gray-900"
                                          }[reservation.status]

                                          // Create overlapping block effect with proper z-index below headers
                                          const offsetX = index * 8 // Smaller horizontal offset
                                          const offsetY = index * 4  // Smaller vertical offset
                                          const zIndex = Math.max(10 - index, 1) // Ensure z-index stays below header (z-50)
                                          
                                          return (
                                            <div
                                              key={reservation.id}
                                              className={cn(
                                                "absolute rounded-lg border-2 px-3 py-2 text-xs font-bold shadow-lg",
                                                "h-12 min-w-[280px]", // Even wider blocks for better readability
                                                statusStyles
                                              )}
                                              style={{
                                                top: `${offsetY}px`,
                                                left: `${offsetX}px`,
                                                right: `${offsetX + 20}px`,
                                                zIndex: zIndex,
                                                boxShadow: `0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 6px rgba(0, 0, 0, 0.1)`
                                              }}
                                            >
                                              <div className="flex justify-between items-center h-full">
                                                <div className="flex-1 min-w-0">
                                                  <div className="truncate font-bold text-xs leading-tight text-white">
                                                    {reservation.booking_name}
                                                  </div>
                                                  <div className="truncate text-xs opacity-90 leading-tight mt-0.5 text-gray-100">
                                                    {reservation.user_name}
                                                  </div>
                                                </div>
                                                <div className="text-xs font-bold ml-2 flex-shrink-0 bg-black bg-opacity-30 rounded px-1.5 py-0.5 text-white">
                                                  {reservation.start_time.substring(0, 5)} - {reservation.end_time.substring(0, 5)}
                                                </div>
                                              </div>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}