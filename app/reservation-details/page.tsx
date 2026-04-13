"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Clock,
  Home,
  AlertCircle,
  Loader2,
  ArrowLeft,
  CalendarIcon,
  CheckCircle,
  XCircle,
  Users,
  FileText,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { supabaseUrl, supabaseAnonKey } from "@/app/env"
import LogoutButton from "@/components/logout-button"
import {
  type GroupedReservation,
  generateQRCodeText,
  generateQRCodeForRecord,
  storeQRCodeForApprovedReservation,
  formatDate,
  formatTime,
  formatTimeSlots,
} from "@/lib/reservation-utils"

export default function ReservationDetailsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [reservation, setReservation] = useState<GroupedReservation | null>(null)
  const [individualReservations, setIndividualReservations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initialize Supabase client
  const supabase = createClientComponentClient({
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
  })

  useEffect(() => {
    fetchReservationDetails()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchReservationDetails = async () => {
    setLoading(true)
    setError(null)

    try {
      // Get current user
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.push("/login")
        return
      }

      // Get reservation details from URL params
      const confirmationNumber = searchParams.get("confirmation")
      const date = searchParams.get("date")
      const roomId = searchParams.get("roomId") // Add room ID parameter

      if (!confirmationNumber || !date) {
        setError("Missing reservation information")
        return
      }

      // Build query with optional room filter
      let query = supabase
        .from("reservations")
        .select(`
          *,
          rooms (
            id,
            name,
            capacity,
            description
          )
        `)
        .eq("user_id", session.user.id)
        .like("confirmation_number", `${confirmationNumber}%`)
        .eq("date", date)
        .order("start_time", { ascending: true })

      // If roomId is provided, filter by it
      if (roomId) {
        query = query.eq("room_id", parseInt(roomId))
      }

      const { data: reservationsData, error: reservationsError } = await query

      if (reservationsError) throw reservationsError

      if (!reservationsData || reservationsData.length === 0) {
        setError("Reservation not found")
        return
      }

      // If no roomId specified but multiple rooms found, redirect to first room
      if (!roomId) {
        const uniqueRooms = [...new Set(reservationsData.map(r => r.room_id))]
        if (uniqueRooms.length > 1) {
          // Redirect to the first room's details
          const params = new URLSearchParams()
          params.set("confirmation", confirmationNumber)
          params.set("date", date)
          params.set("roomId", uniqueRooms[0].toString())
          router.replace(`/reservation-details?${params.toString()}`)
          return
        }
      }

      // Get room info from the first reservation
      const roomInfo = reservationsData[0].rooms

      // Group the reservations by confirmation number, date, and room
      const groupedReservation: GroupedReservation = {
        ids: reservationsData.map(r => r.id),
        booking_name: reservationsData[0].booking_name,
        room_id: reservationsData[0].room_id,
        user_id: reservationsData[0].user_id,
        date: reservationsData[0].date,
        time_slots: reservationsData.map((r: any) => ({
          start_time: r.start_time,
          end_time: r.end_time,
        })),
        status: reservationsData[0].status,
        confirmation_number: confirmationNumber,
        purpose: reservationsData[0].purpose,
        attendees: reservationsData[0].attendees,
        contact_email: reservationsData[0].contact_email,
        contact_phone: reservationsData[0].contact_phone,
        room_name: roomInfo?.name || `Room ${reservationsData[0].room_id}`,
        room_capacity: roomInfo?.capacity,
        room_description: roomInfo?.description,
        created_at: reservationsData[0].created_at,
      }

      setReservation(groupedReservation)
      setIndividualReservations(reservationsData) // Store individual reservations for QR code generation
    } catch (error) {
      console.error("Error fetching reservation details:", error)
      setError(error instanceof Error ? error.message : "Failed to load reservation details")
    } finally {
      setLoading(false)
    }
  }
  // Generate and store QR code text for the first time slot
  const generateAndStoreQRCode = (reservation: GroupedReservation) => {
    // Find the first individual reservation (earliest time slot)
    const firstReservation = individualReservations.find(r => 
      r.start_time === reservation.time_slots[0].start_time
    )
    
    if (!firstReservation) {
      // Fallback to the grouped reservation method
      return generateQRCodeText(reservation)
    }

    // Generate QR code using the individual reservation's confirmation number
    const qrCodeText = generateQRCodeForRecord({
      room_id: reservation.room_id,
      date: reservation.date,
      start_time: firstReservation.start_time,
      confirmation_number: firstReservation.confirmation_number
    })

    // Store in database if reservation is approved
    if (reservation.status === "Approved") {
      storeQRCodeForApprovedReservation(reservation, supabaseUrl, supabaseAnonKey)
    }
    
    return qrCodeText
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Approved":
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case "Rejected":
        return <XCircle className="h-5 w-5 text-red-600" />
      case "Pending":
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />
    }
  }

  const getStatusMessage = (status: string) => {
    switch (status) {
      case "Approved":
        return "Your reservation has been approved! You can now use the room at the scheduled time."
      case "Rejected":
        return "Unfortunately, your reservation has been rejected. Please contact the administrator for more information or try booking a different time slot."
      case "Pending":
      default:
        return "Your reservation is currently under review. You will be notified once it has been processed."
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#5A0D16] text-white">
        <div className="p-4 border-b border-[#8B1F2D]/30 flex items-center">
          <Button variant="ghost" className="text-white hover:bg-white/10 mr-2 -ml-2" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-xl font-semibold flex-1 text-center">
            <span className="text-[#D4AF37]">INTANIA</span> RESERVATION DETAILS
          </h1>
          <LogoutButton variant="ghost" className="text-white hover:bg-white/10" />
        </div>
        <div className="flex-1 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      </div>
    )
  }

  if (error || !reservation) {
    return (
      <div className="flex flex-col min-h-screen bg-[#5A0D16] text-white">
        <div className="p-4 border-b border-[#8B1F2D]/30 flex items-center">
          <Button variant="ghost" className="text-white hover:bg-white/10 mr-2 -ml-2" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-xl font-semibold flex-1 text-center">
            <span className="text-[#D4AF37]">INTANIA</span> RESERVATION DETAILS
          </h1>
          <LogoutButton variant="ghost" className="text-white hover:bg-white/10" />
        </div>
        <div className="flex-1 p-4">
          <div className="max-w-4xl mx-auto bg-gray-200 rounded-xl overflow-hidden shadow-md text-gray-800">
            <div className="p-4">
              <div className="bg-red-100 border-l-4 border-red-500 p-4 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-700">{error || "Reservation not found"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#5A0D16] text-white">
      {/* Header */}
      <div className="p-4 border-b border-[#8B1F2D]/30 flex items-center">
        <Button variant="ghost" className="text-white hover:bg-white/10 mr-2 -ml-2" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-xl font-semibold flex-1 text-center">
          <span className="text-[#D4AF37]">INTANIA</span> RESERVATION DETAILS
        </h1>
        <LogoutButton variant="ghost" className="text-white hover:bg-white/10" />
      </div>

      {/* Main content */}
      <div className="flex-1 p-4 bg-gradient-to-br from-[#5A0D16] via-[#6B1520] to-[#4A0B12]">
        <div className="max-w-4xl mx-auto bg-white/95 backdrop-blur-sm rounded-2xl overflow-hidden shadow-2xl border border-white/20">
          {/* Status Header */}
          <div
            className={cn(
              "p-6 border-b border-gray-200 flex items-center gap-4",
              reservation.status === "Approved" && "bg-gradient-to-r from-green-50 to-emerald-50",
              reservation.status === "Rejected" && "bg-gradient-to-r from-red-50 to-pink-50",
              reservation.status === "Pending" && "bg-gradient-to-r from-yellow-50 to-orange-50",
            )}
          >
            <div
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center",
                reservation.status === "Approved" && "bg-green-100",
                reservation.status === "Rejected" && "bg-red-100",
                reservation.status === "Pending" && "bg-yellow-100",
              )}
            >
              {getStatusIcon(reservation.status)}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-800">{reservation.booking_name}</h2>
              <p className="text-gray-600">#{reservation.confirmation_number}</p>
            </div>
            <span
              className={cn(
                "px-4 py-2 rounded-full text-sm font-semibold shadow-sm",
                reservation.status === "Pending" && "bg-yellow-100 text-yellow-800 border border-yellow-200",
                reservation.status === "Approved" && "bg-green-100 text-green-800 border border-green-200",
                reservation.status === "Rejected" && "bg-red-100 text-red-800 border border-red-200",
              )}
            >
              {reservation.status}
            </span>
          </div>

          {/* QR Code Section - Only show if approved */}
          {reservation.status === "Approved" && (
            <div className="p-8 bg-gradient-to-br from-[#5A0D16] to-[#4A0B12] text-white">
              <div className="max-w-sm mx-auto text-center">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-[#D4AF37] rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-[#D4AF37] mb-2">Access Approved!</h3>
                  <p className="text-white/80">Your room is ready</p>
                </div>

                <div className="bg-white rounded-2xl p-8 shadow-2xl">
                  <div className="mb-6">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(generateAndStoreQRCode(reservation))}&margin=15&color=5A0D16&bgcolor=FFFFFF`}
                      alt="Room Access QR Code"
                      className="w-48 h-48 mx-auto rounded-lg shadow-lg"
                    />
                  </div>

                  <div className="bg-gradient-to-r from-[#5A0D16] to-[#4A0B12] rounded-xl p-4 text-white">
                    <p className="text-xs font-medium text-[#D4AF37] mb-2">ACCESS CODE</p>
                    <p className="text-lg font-mono font-bold tracking-wider break-all">
                      {generateAndStoreQRCode(reservation)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <Home className="h-6 w-6 text-[#D4AF37] mx-auto mb-2" />
                    <p className="text-sm font-semibold text-white">{reservation.room_name}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <Clock className="h-6 w-6 text-[#D4AF37] mx-auto mb-2" />
                    <p className="text-sm font-semibold text-white">{formatTimeSlots(reservation.time_slots)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Status Message */}
          {reservation.status !== "Approved" && (
            <div
              className={cn(
                "p-6 border-b border-gray-200",
                reservation.status === "Rejected" && "bg-red-50",
                reservation.status === "Pending" && "bg-yellow-50",
              )}
            >
              <p
                className={cn(
                  "text-center font-medium",
                  reservation.status === "Rejected" && "text-red-700",
                  reservation.status === "Pending" && "text-yellow-700",
                )}
              >
                {getStatusMessage(reservation.status)}
              </p>
            </div>
          )}

          {/* Reservation Details */}
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <CalendarIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Date & Time</h4>
                    <p className="text-gray-600">{formatDate(reservation.date)}</p>
                    <p className="text-blue-600 font-medium">{formatTimeSlots(reservation.time_slots)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Home className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Room</h4>
                    <p className="text-gray-600">{reservation.room_name}</p>
                    {reservation.room_capacity && (
                      <p className="text-sm text-gray-500">Capacity: {reservation.room_capacity} people</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Attendees</h4>
                    <p className="text-gray-600">{reservation.attendees} people</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Purpose</h4>
                    <p className="text-gray-600">{reservation.purpose}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-6 bg-gray-50 border-t border-gray-200">
            <div className="flex gap-4 max-w-md mx-auto">
              <Button
                className="flex-1 bg-[#5A0D16] hover:bg-[#4A0B12] text-white shadow-lg transition-all hover:shadow-xl py-3"
                onClick={() => router.push("/my-reservations")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span ></span>Back
              </Button>
              {reservation.status === "Pending" && (
                <Button
                  variant="outline"
                  className="flex-1 border-[#5A0D16] text-[#5A0D16] hover:bg-[#5A0D16] hover:text-white py-3 bg-transparent"
                  onClick={() => {
                    alert("Contact administrator to cancel this reservation")
                  }}
                >
                  Contact Admin
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
