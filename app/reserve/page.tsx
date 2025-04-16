"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import BookingNameModal from "@/components/booking-name-modal"
import { AlertCircle, Loader2, ArrowLeft } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase-client"

// Type for time slot data
interface TimeSlot {
  id: number
  time: string
  available: boolean
}

// Function to convert time format (e.g., "8 AM" to "08:00")
function convertTimeFormat(timeString: string): string {
  const [hourStr, period] = timeString.split(" ")
  let hour = Number.parseInt(hourStr)

  // Convert to 24-hour format
  if (period === "PM" && hour < 12) hour += 12
  if (period === "AM" && hour === 12) hour = 0

  // Format with leading zero if needed
  return `${hour.toString().padStart(2, "0")}:00`
}

// Function to generate a confirmation number
function generateConfirmationNumber() {
  const prefix = "INR"
  const randomPart = Math.floor(100000 + Math.random() * 900000) // 6-digit number
  return `${prefix}-${randomPart}`
}

// Function to sort time slots chronologically
function sortTimeSlots(slots: string[]): string[] {
  return [...slots].sort((a, b) => {
    const hourA = Number.parseInt(a.split(" ")[0])
    const hourB = Number.parseInt(b.split(" ")[0])
    const isPMA = a.includes("PM")
    const isPMB = b.includes("PM")

    // Compare AM/PM first
    if (isPMA && !isPMB) return 1
    if (!isPMA && isPMB) return -1

    // Then compare hours
    return hourA - hourB
  })
}

export default function ReservePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedSlots, setSelectedSlots] = useState<number[]>([])
  const [roomId, setRoomId] = useState<string | null>(null)
  const [roomName, setRoomName] = useState<string | null>(null)
  const [date, setDate] = useState<string | null>(null)
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  const [maxSlotsReached, setMaxSlotsReached] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  const initialLoadComplete = useRef(false)

  // Initialize Supabase client using the singleton pattern
  const supabase = getSupabaseClient()

  // Get current user
  const getCurrentUser = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.user) {
        setUserId(session.user.id)
        setUserEmail(session.user.email)
      } else {
        // For development, use a dummy user ID if not logged in
        setUserId("dummy-user-id")
        setUserEmail("dummy@example.com")
      }
    } catch (error) {
      console.error("Error getting user session:", error)
      // For development, use a dummy user ID if there's an error
      setUserId("dummy-user-id")
      setUserEmail("dummy@example.com")
    }
  }, [supabase])

  // Load data from URL params
  const loadDataFromParams = useCallback(() => {
    const roomParam = searchParams.get("room")
    const roomNameParam = searchParams.get("roomName")
    const dateParam = searchParams.get("date")
    const availabilityParam = searchParams.get("availability")

    // Only update state if values have changed
    if (roomParam && roomParam !== roomId) setRoomId(roomParam)
    if (roomNameParam && roomNameParam !== roomName) setRoomName(roomNameParam)
    if (dateParam && dateParam !== date) setDate(dateParam)

    // Reset selection state
    setSelectedSlots([])
    setMaxSlotsReached(false)
    setError(null)

    // Parse availability data
    if (availabilityParam) {
      try {
        const availabilityData = JSON.parse(availabilityParam)
        // Convert to the format expected by the component
        const formattedTimeSlots = availabilityData.map((slot: any, index: number) => ({
          id: index + 1,
          time: slot.time,
          available: slot.available,
        }))
        setTimeSlots(formattedTimeSlots)
      } catch (error) {
        console.error("Error parsing availability data:", error)
        // Fallback to empty array if parsing fails
        setTimeSlots([])
      }
    } else {
      // Clear time slots if no availability data
      setTimeSlots([])
    }
  }, [searchParams, roomId, roomName, date])

  // Initialize component
  useEffect(() => {
    if (!initialLoadComplete.current) {
      getCurrentUser()
      loadDataFromParams()
      initialLoadComplete.current = true
    }
  }, [getCurrentUser, loadDataFromParams])

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Select a date"

    // Create a date object and ensure it's interpreted in UTC to avoid timezone issues
    const date = new Date(dateString + "T00:00:00Z")

    // Add a day to fix the date issue
    date.setDate(date.getDate() + 1)

    return (
      date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }) +
      " " +
      getOrdinalSuffix(date.getDate())
    )
  }

  // Get ordinal suffix for day (1st, 2nd, 3rd, etc.)
  const getOrdinalSuffix = (day: number) => {
    if (day > 3 && day < 21) return "th"
    switch (day % 10) {
      case 1:
        return "st"
      case 2:
        return "nd"
      case 3:
        return "rd"
      default:
        return "th"
    }
  }

  const handleBack = () => {
    router.back()
  }

  const handleNext = () => {
    if (selectedSlots.length > 0) {
      setIsBookingModalOpen(true)
    } else {
      setError("Please select at least one time slot")
    }
  }

  // Handle slot selection with max 3 slots limit
  const handleSlotSelection = (index: number) => {
    setSelectedSlots((prev) => {
      // If already selected, remove it
      if (prev.includes(index)) {
        const newSelected = prev.filter((i) => i !== index)
        setMaxSlotsReached(newSelected.length >= 3)
        return newSelected
      }
      // If not selected and not at max, add it
      else if (prev.length < 3) {
        const newSelected = [...prev, index]
        setMaxSlotsReached(newSelected.length >= 3)
        return newSelected
      }
      // If at max already, don't change
      return prev
    })
  }

  // Handle booking confirmation
  const handleBookingConfirm = async (bookingName: string) => {
    if (!userId || !roomId || !date) {
      setError("Missing required information. Please try again.")
      setIsBookingModalOpen(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Get selected time slots
      const selectedTimeSlots = selectedSlots.map((index) => timeSlots[index].time)

      // Sort time slots chronologically
      const sortedTimeSlots = sortTimeSlots(selectedTimeSlots)

      // Generate base confirmation number
      const baseConfirmationNumber = generateConfirmationNumber()

      // Track created reservations
      const createdReservations = []

      // Create reservation data for each time slot
      for (let i = 0; i < sortedTimeSlots.length; i++) {
        const timeSlot = sortedTimeSlots[i]

        // Convert time format (e.g., "8 AM" to "08:00")
        const startTime = convertTimeFormat(timeSlot)

        // Calculate end time (1 hour later)
        const [hourStr] = startTime.split(":")
        const hour = Number.parseInt(hourStr)
        const endTime = `${(hour + 1).toString().padStart(2, "0")}:00`

        // Create a unique confirmation number for each slot by adding a suffix
        const confirmationNumber =
          sortedTimeSlots.length > 1 ? `${baseConfirmationNumber}-${i + 1}` : baseConfirmationNumber

        // Create reservation in Supabase
        const { data, error } = await supabase
          .from("reservations")
          .insert({
            booking_name: bookingName,
            room_id: Number.parseInt(roomId),
            user_id: userId,
            date: date,
            start_time: startTime,
            end_time: endTime,
            status: "Pending",
            purpose: bookingName, // Using booking name as purpose for simplicity
            contact_email: userEmail,
            confirmation_number: confirmationNumber,
            check_in_method: "QR Code",
          })
          .select()

        if (error) {
          console.error("Supabase error:", error)
          throw new Error(`Failed to create reservation: ${error.message}`)
        }

        if (data) {
          createdReservations.push(data[0])
        }
      }

      // Navigate to summary page
      const params = new URLSearchParams()
      params.set("bookingName", bookingName)
      params.set("roomId", roomId)
      params.set("roomName", roomName || `Room ${roomId}`)
      params.set("date", date)
      params.set("timeSlots", JSON.stringify(sortedTimeSlots))
      params.set("confirmationNumber", baseConfirmationNumber) // Use the base number for display

      // Add the first reservation ID for potential future reference
      if (createdReservations.length > 0 && createdReservations[0].id) {
        params.set("reservationId", createdReservations[0].id.toString())
      }

      router.push(`/summary?${params.toString()}`)
    } catch (error: any) {
      console.error("Error creating reservation:", error)
      setError(error.message || "Failed to create reservation")
      setIsBookingModalOpen(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#5A0D16] text-white">
      {/* Header */}
      <div className="p-4 border-b border-[#8B1F2D]/30 flex items-center">
        <Button variant="ghost" className="text-white hover:bg-white/10 mr-2 -ml-2" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-xl font-semibold">Select Time Slots</h1>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center px-4 pb-6 pt-4">
        {error && (
          <div className="w-full max-w-md mb-4 bg-red-500/20 border border-red-500 text-white p-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-300 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <div className="w-full max-w-md bg-gray-200 rounded-xl overflow-hidden shadow-md">
          {/* Room and Date header */}
          <div className="bg-gray-300 p-4 text-center">
            <h2 className="text-lg font-medium text-gray-800">{roomName || `Room ${roomId}`}</h2>
            <p className="text-sm text-gray-600 mb-2">{formatDate(date)}</p>

            {/* Legend */}
            <div className="flex justify-center gap-6 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-700">Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm text-gray-700">Unavailable</span>
              </div>
            </div>
          </div>

          {/* Max slots warning */}
          {maxSlotsReached && (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-700">
                You can select a maximum of 3 time slots per day. Please deselect a slot to select a different one.
              </p>
            </div>
          )}

          {/* Time slots */}
          <div className="p-4 bg-gray-200">
            <div className="space-y-2">
              {timeSlots.map((slot, index) => (
                <div
                  key={slot.id}
                  onClick={() => {
                    if (slot.available) {
                      // Only allow selection if not at max or if deselecting
                      if (!maxSlotsReached || selectedSlots.includes(index)) {
                        handleSlotSelection(index)
                      }
                    }
                  }}
                  className={cn(
                    "flex items-center p-2 rounded-md",
                    slot.available
                      ? selectedSlots.includes(index)
                        ? "bg-gray-100"
                        : "hover:bg-gray-100"
                      : "opacity-80",
                    !slot.available && "cursor-not-allowed",
                    maxSlotsReached &&
                      !selectedSlots.includes(index) &&
                      slot.available &&
                      "cursor-not-allowed opacity-60",
                  )}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className={cn(
                        "w-4 h-4 flex items-center justify-center border-2",
                        selectedSlots.includes(index) && slot.available
                          ? "border-gray-500 bg-gray-500"
                          : "border-gray-300",
                      )}
                    >
                      {selectedSlots.includes(index) && slot.available && <div className="w-2 h-2 bg-white"></div>}
                    </div>
                    <span className="font-medium text-gray-800">{slot.time}</span>
                  </div>
                  <div className={cn("w-3 h-3 rounded-full", slot.available ? "bg-green-500" : "bg-red-500")}></div>
                </div>
              ))}
            </div>
          </div>

          {/* Next button */}
          <div className="p-4 bg-gray-300">
            <Button
              className="w-full bg-[#5A0D16] hover:bg-[#4A0B12] text-white py-5 rounded-xl shadow-lg border border-[#8B1F2D]/30 transition-all hover:shadow-xl"
              onClick={handleNext}
              disabled={loading || selectedSlots.length === 0}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  PROCESSING
                </>
              ) : (
                "NEXT"
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Booking Name Modal */}
      <BookingNameModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        onConfirm={handleBookingConfirm}
      />
    </div>
  )
}
