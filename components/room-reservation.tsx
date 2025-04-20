"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, Loader2, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { supabaseUrl, supabaseAnonKey } from "@/app/env"
import LogoutButton from "@/components/logout-button"

// Static room data to avoid database queries
const staticRooms = [
  {
    id: 1,
    name: "Room 1",
    capacity: 8,
    features: ["Projector", "TV"],
    image_url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQhW92Xms3PVXZwNiCuHAT4Gy7Pi510XmfzhQ&s",
  },
  {
    id: 2,
    name: "Room 2",
    capacity: 12,
    features: ["Projector", "Whiteboard"],
    image_url: "/placeholder.svg?height=300&width=600",
  },
  {
    id: 3,
    name: "Room 3",
    capacity: 6,
    features: ["TV", "Conference Phone"],
    image_url: "/placeholder.svg?height=300&width=600",
  },
]

// Extended time slots from 8 AM to 10 PM
export const extendedTimeSlots = [
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

export default function RoomReservation() {
  const router = useRouter()
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [reservations, setReservations] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // Initialize Supabase client
  const supabase = createClientComponentClient({
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
  })

  // Check if user is logged in
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        setIsLoggedIn(!!data.session)
      } catch (error) {
        console.error("Session check error:", error)
        setIsLoggedIn(false)
      }
    }

    checkSession()
  }, [supabase])

  // Fetch reservations when date or room changes
  useEffect(() => {
    fetchReservations(staticRooms[currentRoomIndex]?.id, selectedDate)
  }, [selectedDate, currentRoomIndex])

  // Function to fetch reservations
  const fetchReservations = async (roomId: number, date: Date) => {
    if (!roomId) return

    setLoading(true)
    try {
      const dateStr = date.toISOString().split("T")[0]
      console.log(`Fetching reservations for room ${roomId} on ${dateStr}`)

      // Direct query to reservations table only, avoiding profiles table
      const { data, error } = await supabase
        .from("reservations")
        .select("booking_name, room_id, date, start_time, end_time, status")
        .eq("room_id", roomId)
        .eq("date", dateStr)

      if (error) {
        console.error("Error fetching reservations:", error)
        // Use empty array instead of throwing error
        setReservations([])
        return
      }

      console.log(`Found ${data?.length || 0} reservations:`, data)
      setReservations(data || [])
    } catch (error: any) {
      console.error("Error in fetchReservations:", error)
      setReservations([])
    } finally {
      setLoading(false)
    }
  }

  const currentRoom = staticRooms[currentRoomIndex]

  // Navigation functions for room carousel
  const prevRoom = () => {
    setCurrentRoomIndex((prev) => (prev === 0 ? staticRooms.length - 1 : prev - 1))
  }

  const nextRoom = () => {
    setCurrentRoomIndex((prev) => (prev === staticRooms.length - 1 ? 0 : prev + 1))
  }

  // Generate week dates
  const getWeekDates = () => {
    const dates = []
    const startDate = new Date(selectedDate)
    startDate.setDate(startDate.getDate() - 3) // Start 3 days before selected date

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      dates.push(date)
    }

    return dates
  }

  const weekDates = getWeekDates()

  // Format date range for display
  const formatDateRange = () => {
    const firstDate = weekDates[0]
    const lastDate = weekDates[6]
    return `${firstDate.toLocaleDateString("en-US", { month: "short" })} ${firstDate.getDate()}-${lastDate.getDate()}`
  }

  // Generate calendar days for the current month view
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

  // Check if a time slot has a reservation
  const getReservation = (time: string) => {
    const dateStr = selectedDate.toISOString().split("T")[0]
    let hour = Number.parseInt(time.split(" ")[0])
    const period = time.split(" ")[1]

    // Convert to 24-hour format
    if (period === "PM" && hour < 12) hour += 12
    if (period === "AM" && hour === 12) hour = 0

    const startTime = `${hour.toString().padStart(2, "0")}:00`

    // Find a reservation that matches this time slot
    return reservations.find((res) => {
      const resStartHour = Number.parseInt(res.start_time.split(":")[0])
      const resEndHour = Number.parseInt(res.end_time.split(":")[0])
      const slotHour = hour

      // Check if the slot hour falls within the reservation time range
      return res.room_id === currentRoom.id && res.date === dateStr && slotHour >= resStartHour && slotHour < resEndHour
    })
  }

  // Check if a time slot is available
  const isTimeSlotAvailable = (time: string) => {
    return !getReservation(time)
  }

  // Generate availability data for the current room and date
  const generateAvailabilityData = () => {
    return extendedTimeSlots.map((time) => ({
      time,
      available: isTimeSlotAvailable(time),
    }))
  }

  const handleCreateReservation = () => {
    if (loading || !currentRoom.id) return

    // Generate availability data
    const availabilityData = generateAvailabilityData()

    // Navigate to the reservation page with room, date, and availability info
    const params = new URLSearchParams()
    params.set("room", currentRoom.id.toString())
    params.set("roomName", currentRoom.name)
    params.set("date", selectedDate.toISOString().split("T")[0])
    params.set("availability", JSON.stringify(availabilityData))

    router.push(`/reserve?${params.toString()}`)
  }

  const handleMyReservations = () => {
    router.push("/my-reservations")
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#5A0D16] text-white overflow-x-hidden">
      {/* Header with navigation */}
      <div className="p-4 border-b border-[#8B1F2D]/30 flex justify-between items-center">
        <h1 className="text-xl font-semibold">
          <span className="text-[#D4AF37]">INTA</span>ROOM
        </h1>
        {isLoggedIn && (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              className="text-white hover:bg-white/10"
              onClick={handleMyReservations}
              title="My Reservations"
            >
              <User className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">My Reservations</span>
            </Button>
            <LogoutButton variant="ghost" className="text-white hover:bg-white/10" showTextOnMobile={false} />
          </div>
        )}
      </div>

      {/* Main content - Desktop optimized layout */}
      <div className="flex-1 p-4 md:p-6 flex flex-col md:flex-row md:gap-6 overflow-hidden w-full box-border">
        {/* Left column - Room Selection */}
        <div className="w-full md:w-1/2 lg:w-2/5 mb-6 md:mb-0">
          <h2 className="text-lg font-medium mb-3">Select a Room</h2>
          <div className="relative bg-gray-200 rounded-xl overflow-hidden shadow-md">
            <div className="relative h-48 md:h-64 w-full">
              <Image
                src={currentRoom.image_url || "/placeholder.svg"}
                alt={currentRoom.name}
                fill
                className="object-cover"
              />
              {/* Add a dark overlay to dim the image */}
              <div className="absolute inset-0 bg-black/40"></div>

              {/* Move room info on top of the image */}
              <div className="absolute bottom-0 left-0 p-3 w-full">
                <h2 className="font-medium text-white">{currentRoom.name}</h2>
                <p className="text-sm text-white/90">
                  {currentRoom.capacity} persons
                  {Array.isArray(currentRoom.features) && currentRoom.features.length > 0
                    ? `, ${currentRoom.features.join(", ")}`
                    : ""}
                </p>
              </div>

              {/* Room navigation buttons */}
              <button
                onClick={prevRoom}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 rounded-full p-1"
                disabled={loading}
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={nextRoom}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 rounded-full p-1"
                disabled={loading}
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Room features and details - Desktop only */}
          <div className="hidden md:block mt-4 bg-gray-200/20 rounded-xl p-4 border border-white/10">
            <h3 className="font-medium mb-2 text-[#D4AF37]">Room Features</h3>
            <ul className="space-y-1">
              {Array.isArray(currentRoom.features) &&
                currentRoom.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></div>
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
            </ul>
            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-sm">
                <span className="font-medium">Capacity:</span> {currentRoom.capacity} persons
              </p>
            </div>
          </div>
        </div>

        {/* Right column - Calendar and Time Slots */}
        <div className="w-full md:w-1/2 lg:w-3/5">
          <h2 className="text-lg font-medium mb-3">Select Date & Time</h2>
          <div className="bg-gray-200 rounded-xl overflow-hidden shadow-md">
            {/* Date Navigation */}
            <div className="flex items-center justify-between p-3 bg-gray-300">
              <button
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                onClick={() => {
                  const prevMonth = new Date(selectedDate)
                  prevMonth.setMonth(prevMonth.getMonth() - 1)
                  setSelectedDate(prevMonth)
                }}
                disabled={loading}
              >
                <ChevronLeft className="h-5 w-5 text-gray-700" />
              </button>
              <h2 className="font-medium text-gray-800">
                {selectedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </h2>
              <button
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                onClick={() => {
                  const nextMonth = new Date(selectedDate)
                  nextMonth.setMonth(nextMonth.getMonth() + 1)
                  setSelectedDate(nextMonth)
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

                return (
                  <button
                    key={index}
                    className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center text-sm",
                      !day ? "invisible" : "",
                      isSelected ? "bg-[#B82C3A] text-white" : isCurrentMonth ? "text-gray-700" : "text-gray-400",
                      day && "hover:bg-gray-200",
                    )}
                    disabled={!day || loading}
                    onClick={() => day && setSelectedDate(day)}
                  >
                    {day ? day.getDate() : ""}
                  </button>
                )
              })}
            </div>

            {/* Time Slots */}
            <div className="p-3 bg-gray-200 max-h-64 md:max-h-80 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center items-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                </div>
              ) : (
                extendedTimeSlots.map((time, index) => {
                  const reservation = getReservation(time)
                  const isAvailable = !reservation

                  return (
                    <div key={index} className="flex items-center mb-2 last:mb-0">
                      <div className="w-16 text-xs text-gray-700">{time}</div>
                      <div className="flex-1 h-10 relative">
                        {reservation ? (
                          <div className="absolute inset-0 bg-[#B82C3A] rounded-md flex items-center px-3 text-white text-sm">
                            <span>
                              {reservation.start_time} - {reservation.end_time}
                            </span>
                            <span className="ml-2">{reservation.booking_name}</span>
                          </div>
                        ) : (
                          <div
                            className={`h-full ${isAvailable ? "bg-green-500/20" : "bg-gray-300"} rounded-md flex items-center justify-center`}
                          >
                            {isAvailable && <span className="text-xs text-green-800">Available</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Create Reservation Button */}
          <div className="mt-4">
            <Button
              className="w-full bg-[#AC7979] hover:bg-[#9A6B6B] text-white py-5 rounded-xl shadow-lg border border-[#8B1F2D]/30 transition-all hover:shadow-xl"
              onClick={handleCreateReservation}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                "Create a New Reservation"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
