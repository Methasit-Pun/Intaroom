"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { supabaseUrl, supabaseAnonKey } from "@/app/env"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, Clock, Users, MapPin, CreditCard, User, LogOut, Settings, BookOpen } from "lucide-react"
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns"
import {
  getRooms,
  getReservationsForRoom,
  createReservation,
  generateConfirmationNumber,
  convertTimeFormat,
  convertFrom24To12Format,
  type Reservation,
  type Room,
} from "@/lib/supabase"
import BookingNameModal from "@/components/booking-name-modal"
import RulesPoliciesModal from "@/components/rules-policies-modal"
import MobileCreditsDisplay from "@/components/mobile-credits-display"
import { useLiff } from "@/components/liff-provider"

const timeSlots = [
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
]

export default function RoomReservation() {
  // Initialize Supabase client with explicit configuration
  const supabase = createClientComponentClient({
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
  })

  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [credits, setCredits] = useState(0)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [showRulesModal, setShowRulesModal] = useState(false)
  const [bookingData, setBookingData] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Get LIFF context
  const { isLoggedIn: liffLoggedIn, profile: liffProfile } = useLiff()

  // Check authentication status
  const checkAuth = async () => {
    try {
      setAuthLoading(true)
      console.log("🔍 Checking authentication status...")

      // Check if admin is logged in
      const isAdmin = localStorage.getItem("isAdmin") === "true"
      if (isAdmin) {
        console.log("👑 Admin user detected, redirecting...")
        window.location.href = "/admin"
        return
      }

      // Check LIFF login first
      if (liffLoggedIn && liffProfile) {
        console.log("📱 LIFF user detected:", liffProfile.userId)

        try {
          // Query for LINE user profile without .single()
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("line_user_id", liffProfile.userId)

          if (profileError) {
            console.error("❌ Profile fetch error:", profileError)
            setCredits(100) // Default credits
          } else if (profileData && profileData.length > 0) {
            const profile = profileData[0] // Use first result
            console.log("✅ LINE user profile found:", profile)
            setUserProfile(profile)
            setCredits(profile.credits || 100)

            // Check if profile is complete
            if (!profile.full_name || !profile.telephone) {
              console.log("⚠️ Profile incomplete, redirecting to setup...")
              window.location.href = "/profile?setup=true"
              return
            }
          } else {
            console.log("⚠️ No profile found for LINE user, redirecting to setup...")
            window.location.href = "/profile?setup=true&new=true"
            return
          }
        } catch (error) {
          console.error("❌ Error fetching LINE user profile:", error)
          setCredits(100) // Default credits
        }

        setAuthLoading(false)
        return
      }

      // Check regular Supabase session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        console.error("❌ Session error:", sessionError)
        window.location.href = "/login"
        return
      }

      if (!session) {
        console.log("❌ No session found, redirecting to login...")
        window.location.href = "/login"
        return
      }

      console.log("✅ Regular user session found:", session.user.id)
      setUser(session.user)

      // Fetch user profile without .single()
      try {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)

        if (profileError) {
          console.error("❌ Profile fetch error:", profileError)
          setCredits(100) // Default credits
        } else if (profileData && profileData.length > 0) {
          const profile = profileData[0] // Use first result
          console.log("✅ User profile found:", profile)
          setUserProfile(profile)
          setCredits(profile.credits || 100)
        } else {
          console.log("⚠️ No profile found, using defaults")
          setCredits(100) // Default credits
        }
      } catch (error) {
        console.error("❌ Error fetching user profile:", error)
        setCredits(100) // Default credits
      }
    } catch (error) {
      console.error("❌ Auth check error:", error)
      window.location.href = "/login"
    } finally {
      setAuthLoading(false)
    }
  }

  // Load rooms
  const loadRooms = async () => {
    try {
      const roomsData = await getRooms()
      setRooms(roomsData)
      if (roomsData.length > 0) {
        setSelectedRoom(roomsData[0])
      }
    } catch (error) {
      console.error("Error loading rooms:", error)
    }
  }

  // Load reservations for selected room and date
  const loadReservations = async () => {
    if (!selectedRoom) return

    try {
      const reservationsData = await getReservationsForRoom(selectedRoom.id, format(selectedDate, "yyyy-MM-dd"))
      setReservations(reservationsData)
    } catch (error) {
      console.error("Error loading reservations:", error)
    }
  }

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true)
      await checkAuth()
      await loadRooms()
      setLoading(false)
    }

    initializeData()
  }, [liffLoggedIn, liffProfile])

  // Load reservations when room or date changes
  useEffect(() => {
    if (selectedRoom && !authLoading) {
      loadReservations()
    }
  }, [selectedRoom, selectedDate, authLoading])

  // Handle logout
  const handleLogout = async () => {
    try {
      // Sign out from Supabase
      await supabase.auth.signOut()

      // Clear localStorage
      localStorage.removeItem("currentUser")
      localStorage.removeItem("isAdmin")

      // Redirect to login
      window.location.href = "/login"
    } catch (error) {
      console.error("Logout error:", error)
      // Force redirect even if logout fails
      window.location.href = "/login"
    }
  }

  // Check if time slot is available
  const isTimeSlotAvailable = (timeSlot: string) => {
    const timeIn24 = convertTimeFormat(timeSlot)
    return !reservations.some(
      (reservation) =>
        reservation.start_time <= timeIn24 && reservation.end_time > timeIn24 && reservation.status !== "Rejected",
    )
  }

  // Handle time slot selection
  const handleTimeSlotSelect = (timeSlot: string) => {
    if (!isTimeSlotAvailable(timeSlot)) return
    setSelectedTimeSlot(timeSlot)
  }

  // Handle booking
  const handleBooking = () => {
    if (!selectedRoom || !selectedTimeSlot || !userProfile) return

    const startTime = convertTimeFormat(selectedTimeSlot)
    const startHour = Number.parseInt(startTime.split(":")[0])
    const endTime = `${(startHour + 1).toString().padStart(2, "0")}:00`

    setBookingData({
      room: selectedRoom,
      date: selectedDate,
      startTime: selectedTimeSlot,
      endTime: convertFrom24To12Format(endTime),
      userProfile,
    })
    setShowBookingModal(true)
  }

  // Handle booking confirmation
  const handleBookingConfirm = async (bookingName: string, purpose: string, attendees: number) => {
    if (!selectedRoom || !selectedTimeSlot || !userProfile) return

    setBookingLoading(true)
    try {
      const startTime = convertTimeFormat(selectedTimeSlot)
      const startHour = Number.parseInt(startTime.split(":")[0])
      const endTime = `${(startHour + 1).toString().padStart(2, "0")}:00`

      const reservation: Omit<Reservation, "id" | "created_at" | "updated_at"> = {
        booking_name: bookingName,
        room_id: selectedRoom.id,
        user_id: userProfile.id,
        date: format(selectedDate, "yyyy-MM-dd"),
        start_time: startTime,
        end_time: endTime,
        status: "Pending",
        purpose,
        attendees,
        contact_email: userProfile.email,
        contact_phone: userProfile.telephone,
        confirmation_number: generateConfirmationNumber(),
      }

      await createReservation(reservation)

      // Deduct credits
      const newCredits = credits - 10
      await supabase.from("profiles").update({ credits: newCredits }).eq("id", userProfile.id)

      setCredits(newCredits)
      setShowBookingModal(false)
      setSelectedTimeSlot(null)
      await loadReservations()

      alert("Booking submitted successfully! You will receive a confirmation email shortly.")
    } catch (error) {
      console.error("Booking error:", error)
      alert("Failed to create booking. Please try again.")
    } finally {
      setBookingLoading(false)
    }
  }

  // Generate week dates
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekDates = eachDayOfInterval({ start: weekStart, end: weekEnd })

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#5A0D16]">
        <div className="text-white text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#5A0D16] text-white">
      {/* Header */}
      <div className="bg-[#6D3B3B] p-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={userProfile?.avatar_url || liffProfile?.pictureUrl} />
              <AvatarFallback className="bg-[#8B1F2D] text-white">
                {userProfile?.full_name?.[0] || liffProfile?.displayName?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold">{userProfile?.full_name || liffProfile?.displayName || "User"}</h2>
              <p className="text-sm text-white/70">{userProfile?.username || "LINE User"}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <MobileCreditsDisplay credits={credits} />
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white hover:bg-[#8B1F2D]">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        <Tabs defaultValue="reserve" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-[#6D3B3B]">
            <TabsTrigger value="reserve" className="data-[state=active]:bg-[#8B1F2D]">
              <Calendar className="h-4 w-4 mr-2" />
              Reserve
            </TabsTrigger>
            <TabsTrigger value="my-bookings" className="data-[state=active]:bg-[#8B1F2D]">
              <BookOpen className="h-4 w-4 mr-2" />
              My Bookings
            </TabsTrigger>
            <TabsTrigger value="profile" className="data-[state=active]:bg-[#8B1F2D]">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="summary" className="data-[state=active]:bg-[#8B1F2D]">
              <Settings className="h-4 w-4 mr-2" />
              Summary
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reserve" className="space-y-6">
            {/* Room Selection */}
            <Card className="bg-[#6D3B3B] border-[#8B1F2D]">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Select Room
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rooms.map((room) => (
                    <Card
                      key={room.id}
                      className={`cursor-pointer transition-colors ${
                        selectedRoom?.id === room.id
                          ? "bg-[#8B1F2D] border-white"
                          : "bg-[#5A0D16] border-[#8B1F2D] hover:bg-[#8B1F2D]/50"
                      }`}
                      onClick={() => setSelectedRoom(room)}
                    >
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-white mb-2">{room.name}</h3>
                        <div className="flex items-center gap-2 text-white/70 text-sm">
                          <Users className="h-4 w-4" />
                          <span>Capacity: {room.capacity}</span>
                        </div>
                        {room.description && <p className="text-white/60 text-sm mt-2">{room.description}</p>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Date Selection */}
            <Card className="bg-[#6D3B3B] border-[#8B1F2D]">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Select Date
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2">
                  {weekDates.map((date) => (
                    <Button
                      key={date.toISOString()}
                      variant={isSameDay(date, selectedDate) ? "default" : "outline"}
                      className={`p-3 h-auto flex flex-col ${
                        isSameDay(date, selectedDate)
                          ? "bg-[#8B1F2D] text-white"
                          : "bg-[#5A0D16] text-white border-[#8B1F2D] hover:bg-[#8B1F2D]/50"
                      }`}
                      onClick={() => setSelectedDate(date)}
                    >
                      <span className="text-xs">{format(date, "EEE")}</span>
                      <span className="text-lg font-semibold">{format(date, "d")}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Time Slot Selection */}
            {selectedRoom && (
              <Card className="bg-[#6D3B3B] border-[#8B1F2D]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Select Time Slot - {selectedRoom.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {timeSlots.map((timeSlot) => {
                      const isAvailable = isTimeSlotAvailable(timeSlot)
                      const isSelected = selectedTimeSlot === timeSlot

                      return (
                        <Button
                          key={timeSlot}
                          variant={isSelected ? "default" : "outline"}
                          className={`p-3 h-auto ${
                            !isAvailable
                              ? "bg-red-900/50 text-red-300 cursor-not-allowed border-red-700"
                              : isSelected
                                ? "bg-[#8B1F2D] text-white"
                                : "bg-[#5A0D16] text-white border-[#8B1F2D] hover:bg-[#8B1F2D]/50"
                          }`}
                          onClick={() => handleTimeSlotSelect(timeSlot)}
                          disabled={!isAvailable}
                        >
                          <div className="text-center">
                            <div className="font-semibold">{timeSlot}</div>
                            <div className="text-xs">{isAvailable ? "Available" : "Booked"}</div>
                          </div>
                        </Button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Booking Summary */}
            {selectedRoom && selectedTimeSlot && (
              <Card className="bg-[#6D3B3B] border-[#8B1F2D]">
                <CardHeader>
                  <CardTitle className="text-white">Booking Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-white/70 text-sm">Room</p>
                      <p className="text-white font-semibold">{selectedRoom.name}</p>
                    </div>
                    <div>
                      <p className="text-white/70 text-sm">Date</p>
                      <p className="text-white font-semibold">{format(selectedDate, "EEEE, MMMM d, yyyy")}</p>
                    </div>
                    <div>
                      <p className="text-white/70 text-sm">Time</p>
                      <p className="text-white font-semibold">
                        {selectedTimeSlot} -{" "}
                        {convertFrom24To12Format(
                          `${Number.parseInt(convertTimeFormat(selectedTimeSlot).split(":")[0]) + 1}:00`,
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/70 text-sm">Cost</p>
                      <p className="text-white font-semibold flex items-center gap-1">
                        <CreditCard className="h-4 w-4" />
                        10 Credits
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleBooking}
                      disabled={credits < 10 || bookingLoading}
                      className="bg-[#8B1F2D] hover:bg-[#A0252F] text-white"
                    >
                      {bookingLoading ? "Booking..." : "Book Now"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowRulesModal(true)}
                      className="border-[#8B1F2D] text-white hover:bg-[#8B1F2D]/50"
                    >
                      View Rules & Policies
                    </Button>
                  </div>

                  {credits < 10 && (
                    <div className="bg-red-900/20 border border-red-700 p-3 rounded-lg">
                      <p className="text-red-300 text-sm">
                        Insufficient credits. You need 10 credits to make a booking.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="my-bookings">
            <Card className="bg-[#6D3B3B] border-[#8B1F2D]">
              <CardHeader>
                <CardTitle className="text-white">My Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/70">Your booking history will appear here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card className="bg-[#6D3B3B] border-[#8B1F2D]">
              <CardHeader>
                <CardTitle className="text-white">Profile Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/70">Profile management options will appear here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summary">
            <Card className="bg-[#6D3B3B] border-[#8B1F2D]">
              <CardHeader>
                <CardTitle className="text-white">Booking Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/70">Overall booking statistics will appear here.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <BookingNameModal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        onConfirm={handleBookingConfirm}
        bookingData={bookingData}
        loading={bookingLoading}
      />

      <RulesPoliciesModal isOpen={showRulesModal} onClose={() => setShowRulesModal(false)} />
    </div>
  )
}
