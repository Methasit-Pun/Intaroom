"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, Users, User, Mail, Phone, Monitor, CheckCircle, ArrowLeft, Coins } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { supabaseUrl, supabaseAnonKey } from "@/app/env"

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

          setBookingData({
            ...bookingData,
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
          })
        } else {
          // If no session, just use the URL params
          setBookingData({
            ...bookingData,
            bookingName,
            roomId,
            roomName,
            date,
            timeSlots,
            confirmationNumber,
            userCredits,
            requiredCredits,
          })
        }
      } catch (error) {
        console.error("Error loading data:", error)
      }
    }

    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                <Users className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="font-medium">Attendees</p>
                  <p className="text-sm text-gray-600">{bookingData.attendees} people</p>
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

            <h3 className="font-medium text-gray-700 border-b pb-2 pt-2">Room Preferences</h3>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Monitor className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="font-medium">Special Requests</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {bookingData.specialRequests.map((request, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 rounded-md text-xs">
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
                      <span className="font-medium">Note:</span> QR code for check-in will be sent to your email once
                      the reservation is approved.
                    </p>
                  </div>
                </div>
              </div>
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
