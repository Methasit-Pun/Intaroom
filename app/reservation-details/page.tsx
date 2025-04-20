"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  Calendar,
  Clock,
  Home,
  User,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  QrCode,
} from "lucide-react"
import { cn } from "@/lib/utils"
import QRCode from "react-qr-code"

export default function ReservationDetailsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

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
    } else {
      // If not coming from navigation, we're done checking auth
      setCheckingAuth(false)
    }
  }, [])

  // Get reservation details from URL params
  const bookingName = searchParams.get("bookingName") || ""
  const roomName = searchParams.get("roomName") || ""
  const date = searchParams.get("date") || ""
  const confirmationNumber = searchParams.get("confirmationNumber") || ""
  const status = searchParams.get("status") || "Pending"

  // Parse time slots from JSON string
  const timeSlots = searchParams.get("timeSlots") ? JSON.parse(searchParams.get("timeSlots") || "[]") : []

  // Format date for display - shorter format for mobile
  const formatDate = (dateString: string) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  // Get status icon based on reservation status
  const getStatusIcon = () => {
    switch (status) {
      case "Approved":
        return <CheckCircle className="h-6 w-6 text-green-500" />
      case "Rejected":
        return <XCircle className="h-6 w-6 text-red-500" />
      default:
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />
    }
  }

  // Get status message based on reservation status
  const getStatusMessage = () => {
    switch (status) {
      case "Approved":
        return "Your reservation has been approved. Please arrive on time."
      case "Rejected":
        return "Your reservation has been rejected. Please contact the administrator for more information."
      default:
        return "Your reservation is pending approval. You will be notified once it's approved."
    }
  }

  // Format time slots for better display
  const formatTimeSlots = (slots: string[]) => {
    if (slots.length === 0) return "No time slots selected"
    if (slots.length <= 2) return slots.join(", ")

    // If more than 2 slots, show first and last with count
    return `${slots[0]} - ${slots[slots.length - 1]} (${slots.length} slots)`
  }

  const handleBack = () => {
    // Set navigation flag before navigating back
    localStorage.setItem("navigationInProgress", "true")
    localStorage.setItem("lastNavigationTimestamp", Date.now().toString())

    router.push("/my-reservations")
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#5A0D16]">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-white mb-4" />
          <p className="text-white">Loading reservation details...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#5A0D16] text-white">
      {/* Header */}
      <div className="p-4 border-b border-[#8B1F2D]/30 flex justify-between items-center">
        <div className="flex items-center">
          <Button variant="ghost" className="text-white hover:bg-white/10 mr-2 -ml-2" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <h1 className="text-xl font-semibold text-center flex-1">
          <span className="text-[#D4AF37]">Reservation</span> Details
        </h1>
        <div className="w-24"></div> {/* Spacer for balance */}
      </div>

      {/* Main content */}
      <div className="flex-1 p-3">
        <div className="max-w-md mx-auto">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          ) : (
            <div className="bg-white rounded-xl overflow-hidden shadow-lg text-gray-800">
              {/* Status banner - combined with confirmation number */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <p className="text-sm text-gray-500">Confirmation #</p>
                    <p className="text-lg font-semibold">{confirmationNumber}</p>
                  </div>
                  <div
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5",
                      status === "Pending" && "bg-yellow-100 text-yellow-800",
                      status === "Approved" && "bg-green-100 text-green-800",
                      status === "Rejected" && "bg-red-100 text-red-800",
                    )}
                  >
                    {getStatusIcon()}
                    <span>{status}</span>
                  </div>
                </div>

                {/* Status message - only show here, not repeated below */}
                <p
                  className={cn(
                    "text-sm",
                    status === "Pending" && "text-yellow-700",
                    status === "Approved" && "text-green-700",
                    status === "Rejected" && "text-red-700",
                  )}
                >
                  {getStatusMessage()}
                </p>
              </div>

              {/* Reservation details */}
              <div className="p-4">
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-[#5A0D16]/10 p-1.5 rounded-full mr-2">
                    <Calendar className="h-5 w-5 text-[#5A0D16]" />
                  </div>
                  <h2 className="text-xl font-bold text-[#5A0D16]">Reservation Details</h2>
                </div>

                <div className="space-y-4">
                  {/* Details cards - more compact layout */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-2.5 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 text-[#5A0D16] mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500">Booking Name</p>
                          <p className="font-medium text-sm truncate">{bookingName}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-2.5 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-2">
                        <Home className="h-4 w-4 text-[#5A0D16] mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500">Room</p>
                          <p className="font-medium text-sm truncate">{roomName}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-2.5 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-2">
                        <Calendar className="h-4 w-4 text-[#5A0D16] mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500">Date</p>
                          <p className="font-medium text-sm truncate">{formatDate(date)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-2.5 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 text-[#5A0D16] mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500">Time</p>
                          <p className="font-medium text-sm truncate">{formatTimeSlots(timeSlots)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Time slots detail - expanded view for mobile */}
                  {timeSlots.length > 2 && (
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">All Time Slots:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {timeSlots.map((slot, index) => (
                          <span
                            key={index}
                            className="inline-block px-2 py-1 bg-white text-xs rounded border border-gray-200"
                          >
                            {slot}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* QR Code for check-in - only show for approved reservations */}
                  {status === "Approved" && (
                    <div className="bg-white rounded-lg border border-green-200 p-4 flex flex-col items-center">
                      <div className="flex items-center mb-2">
                        <QrCode className="h-4 w-4 text-[#5A0D16] mr-2" />
                        <h4 className="font-medium text-sm text-[#5A0D16]">Quick Check-in</h4>
                      </div>

                      <div className="bg-white p-2 rounded-lg shadow-sm mb-2">
                        <QRCode
                          value={`INTANIA-ROOM:${confirmationNumber}|${roomName}|${date}|${bookingName}`}
                          size={150}
                          level="M"
                          fgColor="#5A0D16"
                        />
                      </div>

                      <p className="text-xs text-gray-600 text-center">
                        Present this QR code at the room entrance for quick check-in.
                      </p>
                    </div>
                  )}

                  {/* Notes - more compact */}
                  <div className="bg-[#5A0D16]/5 p-3 rounded-lg border border-[#5A0D16]/10">
                    <h4 className="font-medium text-sm text-[#5A0D16] mb-1.5 flex items-center">
                      <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                      Important Notes:
                    </h4>
                    <ul className="text-xs text-gray-600 space-y-1.5">
                      <li className="flex items-start">
                        <span className="text-[#5A0D16] mr-1.5">•</span>
                        <span>Please arrive 5 minutes before your reserved time.</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-[#5A0D16] mr-1.5">•</span>
                        <span>Bring your student ID for verification.</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-[#5A0D16] mr-1.5">•</span>
                        <span>For questions, contact admin@intania.com</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-center">
                <Button variant="outline" className="text-gray-700 border-gray-300 text-sm py-1.5" onClick={handleBack}>
                  Return to My Reservations
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
