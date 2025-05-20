"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import BookingNameModal from "@/components/booking-name-modal"
import { AlertCircle, Loader2, ArrowLeft, Coins } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { supabaseUrl, supabaseAnonKey } from "@/app/env"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

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

// Function to parse a date string in YYYY-MM-DD format to a Date object
// This ensures we're working with the date in local timezone
function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number)
  return new Date(year, month - 1, day)
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
  const [userCredits, setUserCredits] = useState(0)
  const [isNotEnoughCreditsDialogOpen, setIsNotEnoughCreditsDialogOpen] = useState(false)

  const initialLoadComplete = useRef(false)

  // Initialize Supabase client
  const supabase = createClientComponentClient({
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
  })

  // Get current user
  const getCurrentUser = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.user) {
        setUserId(session.user.id)
        setUserEmail(session.user.email)

        // Fetch user credits
        const { data: profileData } = await supabase
          .from("profiles")
          .select("credits")
          .eq("id", session.user.id)
          .single()

        if (profileData) {
          setUserCredits(profileData.credits || 0)
        }
      } else {
        // For development, use a dummy user ID if not logged in
        setUserId("dummy-user-id")
        setUserEmail("dummy@example.com")
        setUserCredits(100) // Default credits
      }
    } catch (error) {
      console.error("Error getting user session:", error)
      // For development, use a dummy user ID if there's an error
      setUserId("dummy-user-id")
      setUserEmail("dummy@example.com")
      setUserCredits(100) // Default credits
    }
  }, [supabase])

  // Load data from URL params
  const loadDataFromParams = useCallback(() => {
    const roomParam = searchParams.get("room")
    const roomNameParam = searchParams.get("roomName")
    const dateParam = searchParams.get("date")
    const availabilityParam = searchParams.get("availability")
    const userCreditsParam = searchParams.get("userCredits")

    // Log the received date parameter for debugging
    console.log("Received date parameter:", dateParam)

    // Only update state if values have changed
    if (roomParam && roomParam !== roomId) setRoomId(roomParam)
    if (roomNameParam && roomNameParam !== roomName) setRoomName(roomNameParam)
    if (dateParam && dateParam !== date) setDate(dateParam)
    if (userCreditsParam) setUserCredits(Number.parseInt(userCreditsParam, 10))

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

    try {
      // Parse the date string to a Date object in local timezone
      const localDate = parseLocalDate(dateString)

      // Format the date for display
      return (
        localDate.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }) + getOrdinalSuffix(localDate.getDate())
      )
    } catch (error) {
      console.error("Error formatting date:", error)
      return dateString // Fallback to the original string
    }
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
    if (selectedSlots.length === 0) {
      setError("Please select at least one time slot")
      return
    }

    // Check if user has enough credits
    if (selectedSlots.length > userCredits) {
      setIsNotEnoughCreditsDialogOpen(true)
      return
    }

    setIsBookingModalOpen(true)
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

      // Navigate to summary page
      const params = new URLSearchParams()
      params.set("bookingName", bookingName)
      params.set("roomId", roomId)
      params.set("roomName", roomName || `Room ${roomId}`)
      params.set("date", date)
      params.set("timeSlots", JSON.stringify(sortedTimeSlots))
      params.set("userCredits", userCredits.toString())
      params.set("requiredCredits", selectedSlots.length.toString())

      // We'll use a placeholder confirmation number - the actual number will be generated on the summary page
      params.set("confirmationNumber", "INR-00000")

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

            {/* Credits display */}
            <div className="flex justify-center items-center gap-2 mt-2 bg-[#F8F3E6] px-3 py-1.5 rounded-full w-fit mx-auto">
              <Coins className="h-4 w-4 text-[#D4AF37]" />
              <span className="text-sm font-medium text-gray-800">{userCredits} Credits Available</span>
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-6 mt-3">
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

          {/* Selected slots summary */}
          {selectedSlots.length > 0 && (
            <div className="p-3 bg-[#F8F3E6] border-t border-[#E6D9B8]">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-[#D4AF37]" />
                  <span className="text-sm font-medium text-gray-800">Credits required: {selectedSlots.length}</span>
                </div>
                <div className="text-sm text-gray-600">
                  {selectedSlots.length} hour{selectedSlots.length !== 1 ? "s" : ""}
                </div>
              </div>
            </div>
          )}

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

      {/* Not Enough Credits Dialog */}
      <Dialog open={isNotEnoughCreditsDialogOpen} onOpenChange={setIsNotEnoughCreditsDialogOpen}>
        <DialogContent className="bg-white text-gray-800 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Not Enough Credits
            </DialogTitle>
            <DialogDescription className="text-base text-gray-600 pt-2">
              You don't have enough credits for this reservation. You need {selectedSlots.length} credits, but you only
              have {userCredits} credits available.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-[#FFF8E6] p-4 rounded-lg border border-[#F0E0B2] my-2">
            <div className="flex items-start gap-3">
              <Coins className="h-5 w-5 text-[#D4AF37] mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-800">Credit Information</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Each time slot requires 1 credit. Please reduce the number of selected time slots or contact an
                  administrator to add more credits to your account.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsNotEnoughCreditsDialogOpen(false)}
              className="flex-1 sm:flex-none"
            >
              Go Back
            </Button>
            <Button
              className="bg-[#5A0D16] hover:bg-[#4A0B12] text-white flex-1 sm:flex-none"
              onClick={() => {
                setIsNotEnoughCreditsDialogOpen(false)
                router.push("/profile")
              }}
            >
              View Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
