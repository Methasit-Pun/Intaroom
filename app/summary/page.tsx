"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Calendar,
  Clock,
  Users,
  User,
  Mail,
  Phone,
  Monitor,
  CheckCircle,
  Edit,
  Trash2,
  Loader2,
  ArrowLeft,
  AlertCircle,
  Coins,
  FileText,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { supabaseUrl, supabaseAnonKey } from "@/app/env"
import { Checkbox } from "@/components/ui/checkbox"
import RulesPoliciesModal from "@/components/rules-policies-modal"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { checkUserTelephoneRequired, redirectToTelephoneSetup } from "@/lib/user-validation"

// Function to parse a date string in YYYY-MM-DD format to a Date object
// This ensures we're working with the date in local timezone
function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number)
  return new Date(year, month - 1, day)
}

export default function SummaryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [attendeesCount, setAttendeesCount] = useState<number | "">("")
  const [reservationReason, setReservationReason] = useState("")
  const [fieldErrors, setFieldErrors] = useState({
    attendees: false,
    reason: false,
  })
  const MAX_REASON_LENGTH = 250

  const [bookingData, setBookingData] = useState({
    bookingName: "",
    roomId: "",
    roomName: "",
    date: "",
    timeSlots: [] as string[],
    status: "Pending",
    confirmationNumber: "",
    bookedBy: "",
    contactEmail: "",
    contactPhone: "",
    attendees: 4,
    specialRequests: ["Projector", "Whiteboard"],
    checkInMethod: "QR Code",
    userCredits: 0,
    requiredCredits: 0,
  })

  // Initialize Supabase client
  const supabase = createClientComponentClient({
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        // Get data from URL params
        const bookingName = searchParams.get("bookingName") || ""
        const roomId = searchParams.get("roomId") || ""
        const roomName = searchParams.get("roomName") || `Room ${roomId}`
        const date = searchParams.get("date") || ""
        const confirmationNumber = searchParams.get("confirmationNumber") || "INR-00000"
        const timeSlotsParam = searchParams.get("timeSlots") || "[]"
        const userCredits = Number.parseInt(searchParams.get("userCredits") || "0", 10)
        const requiredCredits = Number.parseInt(searchParams.get("requiredCredits") || "0", 10)

        let timeSlots: string[] = []

        // Log the received date for debugging
        console.log("Summary page received date:", date)

        try {
          timeSlots = JSON.parse(timeSlotsParam)
        } catch (e) {
          console.error("Error parsing timeSlots", e)
        }

        // Get user data from session
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.user) {
          // Get user profile
          const { data: profileData } = await supabase.from("profiles").select("*").eq("id", session.user.id).single()

          setBookingData((prev) => ({
            ...prev,
            bookingName,
            roomId,
            roomName,
            date,
            timeSlots,
            confirmationNumber,
            bookedBy: profileData?.full_name || session.user.email || "",
            contactEmail: session.user.email || "",
            contactPhone: profileData?.telephone || "",
            userCredits,
            requiredCredits,
          }))
        } else {
          // If no session, just use the URL params
          setBookingData((prev) => ({
            ...prev,
            bookingName,
            roomId,
            roomName,
            date,
            timeSlots,
            confirmationNumber,
            userCredits,
            requiredCredits,
          }))
        }
      } catch (error) {
        console.error("Error loading data:", error)
      }
    }

    loadData()
  }, [searchParams, supabase])

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return ""

    try {
      // Parse the date string to a Date object in local timezone
      const localDate = parseLocalDate(dateString)

      // Format the date for display
      return localDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    } catch (error) {
      console.error("Error formatting date:", error)
      return dateString // Fallback to the original string
    }
  }

  // Calculate duration from time slots
  const calculateDuration = (timeSlots: string[]) => {
    if (!timeSlots.length) return "N/A"

    // For simplicity, we'll just count the number of slots
    return `${timeSlots.length} hour${timeSlots.length > 1 ? "s" : ""}`
  }

  // Format time slots for display
  const formatTimeSlots = (timeSlots: string[]) => {
    if (!timeSlots.length) return "N/A"

    // Sort time slots
    const sortedSlots = [...timeSlots].sort((a, b) => {
      const aHour = Number.parseInt(a.split(" ")[0])
      const bHour = Number.parseInt(b.split(" ")[0])
      const aIsPM = a.includes("PM")
      const bIsPM = b.includes("PM")

      if (aIsPM && !bIsPM) return 1
      if (!aIsPM && bIsPM) return -1
      return aHour - bHour
    })

    // If consecutive slots, show as range
    if (timeSlots.length > 1) {
      return sortedSlots.join(", ")
    }

    return sortedSlots[0]
  }

  const handleBack = () => {
    router.back()
  }

  // Function to convert time format (e.g., "8 AM" to "08:00")
  const convertTimeFormat = (timeString: string): string => {
    const [hourStr, period] = timeString.split(" ")
    let hour = Number.parseInt(hourStr)

    // Convert to 24-hour format
    if (period === "PM" && hour < 12) hour += 12
    if (period === "AM" && hour === 12) hour = 0

    // Format with leading zero if needed
    return `${hour.toString().padStart(2, "0")}:00`
  }

  // Function to get the next sequential confirmation number
  const getNextConfirmationNumber = async (): Promise<string> => {
    try {
      // Query the database to get the latest confirmation number
      const { data, error } = await supabase
        .from("reservations")
        .select("confirmation_number")
        .order("confirmation_number", { ascending: false })
        .limit(1)

      if (error) {
        console.error("Error fetching latest confirmation number:", error)
        throw error
      }

      // Default starting number if no records exist
      let nextNumber = 1

      if (data && data.length > 0) {
        // Extract the latest confirmation number
        const latestConfirmation = data[0].confirmation_number

        // Check if it follows our format (INR-XXXXX)
        const match = latestConfirmation.match(/^INR-(\d+)(-\d+)?$/)

        if (match) {
          // Extract the number part and increment it
          const currentNumber = Number.parseInt(match[1], 10)
          nextNumber = currentNumber + 1
        }
      }

      // Format with leading zeros (5 digits)
      return `INR-${nextNumber.toString().padStart(5, "0")}`
    } catch (error) {
      console.error("Error generating next confirmation number:", error)
      // Fallback to a timestamp-based number if there's an error
      const timestamp = Date.now().toString().slice(-5)
      return `INR-${timestamp}`
    }
  }

  const validateFields = () => {
    const newFieldErrors = {
      attendees: attendeesCount === "" || attendeesCount < 1,
      reason: !reservationReason.trim(),
    }

    setFieldErrors(newFieldErrors)
    return !newFieldErrors.attendees && !newFieldErrors.reason
  }

  const handleConfirmReservation = async () => {
    // Validate required fields
    if (!validateFields()) {
      setError("Please fill in all required fields.")
      return
    }

    if (!agreedToTerms) {
      setError("Please agree to the Rules & Policies before confirming your reservation.")
      return
    }

    // Check if user has enough credits
    if (bookingData.requiredCredits > bookingData.userCredits) {
      setError(
        "You don't have enough credits for this reservation. Please reduce the number of time slots or contact an administrator.",
      )
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Get current user
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        throw new Error("You must be logged in to confirm a reservation")
      }

      // Check if user has telephone number required for reservations
      const { hasPhone, error: phoneError } = await checkUserTelephoneRequired(session.user.id)
      
      if (phoneError) {
        throw new Error("Failed to verify your profile. Please try again.")
      }

      if (!hasPhone) {
        // Redirect to profile setup with current page as return URL
        const currentUrl = window.location.pathname + window.location.search
        redirectToTelephoneSetup(router, currentUrl)
        return
      }

      // Sort time slots chronologically
      const sortedTimeSlots = [...bookingData.timeSlots].sort((a, b) => {
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

      // Log the date being used for the reservation
      console.log("Creating reservation with date:", bookingData.date)

      // Get the next sequential confirmation number
      const baseConfirmationNumber = await getNextConfirmationNumber()
      console.log("Generated confirmation number:", baseConfirmationNumber)

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
        const { error: insertError } = await supabase.from("reservations").insert({
          booking_name: bookingData.bookingName,
          room_id: Number.parseInt(bookingData.roomId),
          user_id: session.user.id,
          date: bookingData.date, // Use the date directly from state
          start_time: startTime,
          end_time: endTime,
          status: "Pending",
          purpose: reservationReason.trim(),
          attendees: attendeesCount,
          contact_email: bookingData.contactEmail || session.user.email,
          confirmation_number: confirmationNumber,
          check_in_method: "QR Code",
        })

        if (insertError) {
          console.error("Error creating reservation:", insertError)
          throw new Error(`Failed to create reservation: ${insertError.message}`)
        }
      }

      // Deduct credits from user's account
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          credits: bookingData.userCredits - bookingData.requiredCredits,
        })
        .eq("id", session.user.id)

      if (updateError) {
        console.error("Error updating credits:", updateError)
        throw new Error(`Failed to update credits: ${updateError.message}`)
      }

      // Navigate back to the home page
      router.push("/")
    } catch (error: any) {
      console.error("Error confirming reservation:", error)
      setError(error.message || "Failed to confirm reservation")
    } finally {
      setLoading(false)
    }
  }

  const handleModify = () => {
    router.back()
  }

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this reservation?")) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Delete the reservation from Supabase
      const { error } = await supabase
        .from("reservations")
        .delete()
        .eq("confirmation_number", bookingData.confirmationNumber)

      if (error) throw error

      router.push("/")
    } catch (error: any) {
      console.error("Error canceling reservation:", error)
      setError(error.message || "Failed to cancel reservation")
    } finally {
      setLoading(false)
    }
  }

  const isFormValid = agreedToTerms && attendeesCount !== "" && attendeesCount >= 1 && reservationReason.trim() !== ""

  return (
    <div className="flex flex-col min-h-screen bg-[#5A0D16] text-white">
      {/* Header */}
      <div className="p-4 border-b border-[#8B1F2D]/30 flex items-center">
        <Button variant="ghost" className="text-white hover:bg-white/10 mr-2 -ml-2" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-xl font-semibold flex-1 text-center">
          <span className="text-[#D4AF37]">INTA</span>ROOM
        </h1>
      </div>

      {/* Main content */}
      <div className="flex-1 p-4">
        {error && (
          <div className="max-w-md mx-auto mb-4 bg-red-500/20 border border-red-500 text-white p-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="max-w-md mx-auto bg-white rounded-xl overflow-hidden shadow-md text-gray-800">
          {/* Top section - Meeting name & status */}
          <div className="p-4 bg-gray-100 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">{bookingData.bookingName}</h2>
              <span
                className={cn(
                  "px-2 py-1 rounded-full text-xs font-medium",
                  bookingData.status === "Pending" && "bg-yellow-100 text-yellow-800",
                  bookingData.status === "Approved" && "bg-green-100 text-green-800",
                  bookingData.status === "Rejected" && "bg-red-100 text-red-800",
                )}
              >
                {bookingData.status}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Confirmation #{bookingData.confirmationNumber}</p>
          </div>

          {/* Credit information */}
          <div className="p-3 bg-[#F8F3E6] border-b border-[#E6D9B8]">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-[#D4AF37]" />
                <span className="text-sm font-medium">Credits Required: {bookingData.requiredCredits}</span>
              </div>
              <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-full text-xs">
                <span className="font-medium">{bookingData.userCredits}</span> credits available
              </div>
            </div>
          </div>

          {/* Middle section - Details */}
          <div className="p-4 space-y-4">
            <h3 className="font-medium text-gray-700 border-b pb-2">Reservation Details</h3>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="font-medium">Date & Time</p>
                  <p className="text-sm text-gray-600">{formatDate(bookingData.date)}</p>
                  <p className="text-sm text-gray-600">{formatTimeSlots(bookingData.timeSlots)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="font-medium">Duration</p>
                  <p className="text-sm text-gray-600">{calculateDuration(bookingData.timeSlots)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Home className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="font-medium">Room</p>
                  <p className="text-sm text-gray-600">{bookingData.roomName}</p>
                </div>
              </div>
            </div>

            <h3 className="font-medium text-gray-700 border-b pb-2 pt-2">Attendee Information</h3>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="font-medium">Booked by</p>
                  <p className="text-sm text-gray-600">{bookingData.bookedBy}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-sm text-gray-600">{bookingData.contactEmail}</p>
                </div>
              </div>

              {bookingData.contactPhone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Phone</p>
                    <p className="text-sm text-gray-600">{bookingData.contactPhone}</p>
                  </div>
                </div>
              )}
            </div>

            <h3 className="font-medium text-gray-700 border-b pb-2 pt-2">Reservation Information</h3>

            <div className="space-y-4">
              {/* Number of Attendees Input */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <Label htmlFor="attendees" className="text-sm font-medium">
                    How many people will attend? <span className="text-red-500">*</span>
                  </Label>
                </div>
                <div className="relative">
                  <Input
                    id="attendees"
                    type="number"
                    min={1}
                    placeholder="e.g. 12"
                    value={attendeesCount}
                    onChange={(e) => {
                      const value = e.target.value === "" ? "" : Number.parseInt(e.target.value, 10)
                      setAttendeesCount(value)
                      if (value !== "" && value >= 1) {
                        setFieldErrors((prev) => ({ ...prev, attendees: false }))
                      }
                    }}
                    className={cn("w-full", fieldErrors.attendees && "border-red-500 focus-visible:ring-red-500")}
                  />
                  {fieldErrors.attendees && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                  )}
                </div>
                {fieldErrors.attendees && (
                  <p className="text-xs text-red-500 mt-1">Please enter the number of attendees</p>
                )}
              </div>

              {/* Reservation Purpose/Reason Input */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <Label htmlFor="reason" className="text-sm font-medium">
                    What is the purpose of this reservation? <span className="text-red-500">*</span>
                  </Label>
                </div>
                <div className="relative">
                  <Textarea
                    id="reason"
                    placeholder="e.g. Weekly team sync, client meeting"
                    value={reservationReason}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value.length <= MAX_REASON_LENGTH) {
                        setReservationReason(value)
                        if (value.trim()) {
                          setFieldErrors((prev) => ({ ...prev, reason: false }))
                        }
                      }
                    }}
                    className={cn(
                      "resize-none min-h-[100px]",
                      fieldErrors.reason && "border-red-500 focus-visible:ring-red-500",
                    )}
                  />
                  {fieldErrors.reason && (
                    <div className="absolute right-3 top-3 text-red-500">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  {fieldErrors.reason ? (
                    <p className="text-red-500">Please enter the purpose of your reservation</p>
                  ) : (
                    <span>&nbsp;</span>
                  )}
                  <span>
                    {reservationReason.length}/{MAX_REASON_LENGTH}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Monitor className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="font-medium">Special Requests</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {bookingData.specialRequests.map((request) => (
                      <span key={request} className="px-2 py-1 bg-gray-100 rounded-md text-xs">
                        {request}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="font-medium">Check-in Method</p>
                  <p className="text-sm text-gray-600">{bookingData.checkInMethod}</p>

                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-700">
                      <span className="font-medium">Note:</span> QR code for check-in will be shown in my-reservation, once
                      the reservation is approved.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Rules & Policies Checkbox */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                  className="mt-1"
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="terms"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I have read and agree to the Rules & Policies
                  </label>
                  <RulesPoliciesModal
                    trigger={<button className="text-xs text-blue-600 hover:underline">View Rules & Policies</button>}
                  />
                </div>
              </div>
              {error && !agreedToTerms && (
                <div className="mt-2 flex items-center text-red-600 text-xs">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Please agree to the Rules & Policies
                </div>
              )}
            </div>
          </div>

          {/* Bottom section - Actions */}
          <div className="p-4 bg-gray-100 border-t border-gray-200 space-y-3">
            <Button
              className="w-full bg-[#5A0D16] hover:bg-[#4A0B12] text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleConfirmReservation}
              disabled={loading || !isFormValid}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm Reservation
                </>
              )}
            </Button>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 border-gray-300" onClick={handleModify}>
                <Edit className="h-4 w-4 mr-2" />
                Modify
              </Button>

              <Button
                variant="outline"
                className="flex-1 border-gray-300 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleCancel}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Canceling...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Cancel
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Home icon component
function Home(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}
