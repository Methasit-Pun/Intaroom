"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, Loader2, User, Coins, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { supabaseUrl, supabaseAnonKey } from "@/app/env"
import LogoutButton from "@/components/logout-button"
import LineProfile from "@/components/line-profile"
import { useLiff } from "@/components/liff-provider"

// Static room data to avoid database queries
const staticRooms = [
  {
    id: 1,
    name: "Innospace Room (AIS 5G Garage Room)",
    capacity: "8-10",
    features: ["Projector", "TV"],
    image_url: "https://www.eng.chula.ac.th/wp-content/uploads/2022/08/05-2-1024x683.jpg",
    location: "1st Floor – Chula Engineering Centennial Building",
    concept: "A space for innovation and creativity",
    detailed_features: [
      "65-inch LED display (with Wireless Cast capability)",
      "Movable group tables",
      "Power & USB outlets at every seat",
      "High-speed Wi-Fi",
      "Bluetooth speakers",
    ],
  },
  {
    id: 2,
    name: "601 IOIC Room",
    capacity: "30-50",
    features: ["Projector", "Whiteboard"],
    image_url: "https://www.eng.chula.ac.th/wp-content/uploads/2020/10/3-1024x650.jpg",
    location: "6th Floor – Chula Engineering Centennial Building (IOIC Lab)",
    concept: "Room for club meetings and workshops",
    detailed_features: ["Co-working style desks", "Whiteboard", "Separate monitor displays", "2 small meeting rooms"],
  },
  {
    id: 3,
    name: "602 Grass Room",
    capacity: "30-50",
    features: ["TV", "Conference Phone"],
    image_url:
      "https://www.intaniamagazine.com/wp-content/uploads/2022/12/%E0%B8%82%E0%B9%88%E0%B8%B2%E0%B8%A7%E0%B8%AA%E0%B8%B1%E0%B8%87%E0%B8%84%E0%B8%A1-12-e1669963399174.jpg",
    location: "6th Floor – Chula Engineering Centennial Building",
    concept: "Relaxed area with artificial grass for informal brainstorming or meetings",
    detailed_features: [
      "Bean bags",
      "Artificial grass flooring for a natural atmosphere",
      "TV display with HDMI connection",
    ],
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
  const [userCredits, setUserCredits] = useState(0)
  const { isLoggedIn: isLiffLoggedIn, liffProfile } = useLiff()

  // Initialize Supabase client
  const supabase = createClientComponentClient({
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
  })

  // Check if user is logged in and fetch credits
  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log("Checking authentication state...")

        // Check if logged in via Supabase
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error("Session check error:", error)
        }

        const isSupabaseLoggedIn = !!data.session
        console.log("Supabase session:", isSupabaseLoggedIn ? "Active" : "None")

        // Check if logged in via LIFF
        const isUserLoggedIn = isSupabaseLoggedIn || isLiffLoggedIn
        console.log("Final login state:", isUserLoggedIn)

        setIsLoggedIn(isUserLoggedIn)

        if (isUserLoggedIn) {
          // If logged in via Supabase, fetch credits from database
          if (isSupabaseLoggedIn && data.session) {
            console.log("Fetching user profile for:", data.session.user.email)

            try {
              const { data: profileData, error: profileError } = await supabase
                .from("profiles")
                .select("credits, username, full_name")
                .eq("id", data.session.user.id)

              if (profileError) {
                console.error("Profile fetch error:", profileError)
                setUserCredits(100)
              } else if (profileData && profileData.length > 0) {
                // Use the first profile if multiple exist
                const profile = profileData[0]
                console.log("User profile loaded:", profile)
                setUserCredits(profile.credits || 100)
              } else {
                console.log("No profile found, using default credits")
                setUserCredits(100)
              }
            } catch (err) {
              console.error("Error fetching Supabase credits:", err)
              setUserCredits(100)
            }
          }
          // If logged in via LIFF, try to fetch by LINE user ID
          else if (isLiffLoggedIn && liffProfile) {
            try {
              const { data: lineUserData, error: lineUserError } = await supabase
                .from("profiles")
                .select("credits")
                .eq("line_user_id", liffProfile.userId)

              if (lineUserError) {
                console.error("LINE user fetch error:", lineUserError)
                setUserCredits(100)
              } else if (lineUserData && lineUserData.length > 0) {
                // Use the first profile if multiple exist
                setUserCredits(lineUserData[0].credits || 100)
              } else {
                console.log("No LINE user profile found, using default credits")
                setUserCredits(100)
              }
            } catch (err) {
              console.error("Error fetching LINE user credits:", err)
              setUserCredits(100)
            }
          }
        }
      } catch (error) {
        console.error("Session check error:", error)
      }
    }

    checkSession()
  }, [supabase, isLiffLoggedIn, liffProfile])

  // Fetch reservations when date or room changes
  useEffect(() => {
    fetchReservations(staticRooms[currentRoomIndex]?.id, selectedDate)
  }, [selectedDate, currentRoomIndex])

  // Function to format date as YYYY-MM-DD in local timezone
  const formatDateForDatabase = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  // Function to fetch reservations
  const fetchReservations = async (roomId: number, date: Date) => {
    if (!roomId) return

    setLoading(true)
    try {
      // Format date as YYYY-MM-DD for database query using local timezone
      const dateStr = formatDateForDatabase(date)
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
    // Format date as YYYY-MM-DD for comparison using local timezone
    const dateStr = formatDateForDatabase(selectedDate)

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

    // Check if user is logged in
    if (!isLoggedIn) {
      router.push("/login")
      return
    }

    // Format the selected date as YYYY-MM-DD in local timezone
    const formattedDate = formatDateForDatabase(selectedDate)

    // Log the date being passed to ensure it's correct
    console.log("Creating reservation for date:", formattedDate, "Selected date:", selectedDate.toDateString())

    // Generate availability data for the selected date
    const availabilityData = generateAvailabilityData()

    // Navigate to the reservation page with room, date, and availability info
    const params = new URLSearchParams()
    params.set("room", currentRoom.id.toString())
    params.set("roomName", currentRoom.name)
    params.set("date", formattedDate)
    params.set("availability", JSON.stringify(availabilityData))
    params.set("userCredits", userCredits.toString())

    router.push(`/reserve?${params.toString()}`)
  }

  const handleMyReservations = () => {
    router.push("/my-reservations")
  }

  const handleProfile = () => {
    router.push("/profile")
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#5A0D16] text-white overflow-x-hidden">
      {/* Header with navigation */}
      <div className="p-4 border-b border-[#8B1F2D]/30 flex justify-between items-center">
        <h1 className="text-xl font-semibold">
          <span className="text-[#D4AF37]">INTA</span>ROOM
        </h1>
        {isLoggedIn ? (
          <div className="flex gap-2 items-center">
            {/* Credits display */}
            <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-[#6D3B3B] rounded-full mr-1">
              <Coins className="h-4 w-4 text-[#D4AF37]" />
              <span className="text-sm font-medium">{userCredits} Credits</span>
            </div>

            {/* LINE Profile */}
            <div className="hidden sm:block">
              <LineProfile />
            </div>

            <div className="flex space-x-1">
              <Button variant="ghost" className="text-white hover:bg-white/10" onClick={handleProfile}>
                <User className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Profile</span>
              </Button>

              <Button variant="ghost" className="text-white hover:bg-white/10" onClick={handleMyReservations}>
                <CalendarDays className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">My Reservations</span>
              </Button>

              <LogoutButton variant="ghost" className="text-white hover:bg-white/10" />
            </div>
          </div>
        ) : (
          <Button
            onClick={() => router.push("/login")}
            className="bg-[#D4AF37] hover:bg-[#B8941F] text-[#5A0D16] font-medium"
          >
            Login
          </Button>
        )}
        {process.env.NODE_ENV === "development" && (
          <Button
            onClick={() => router.push("/test-auth")}
            variant="outline"
            className="ml-2 text-white border-white/30 hover:bg-white/10"
            size="sm"
          >
            Test Auth
          </Button>
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
                    onClick={() => {
                      if (day) {
                        // Log the date being selected for debugging
                        console.log("Selected date:", day.toDateString())
                        setSelectedDate(day)
                        // Immediately fetch reservations for the new date
                        fetchReservations(currentRoom.id, day)
                      }
                    }}
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
              ) : isLoggedIn ? (
                "Create a New Reservation"
              ) : (
                "Login to Create Reservation"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
