import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

// Types for reservation data
export interface Reservation {
  id: number
  booking_name: string
  room_id: number
  user_id: string
  date: string
  start_time: string
  end_time: string
  status: "Pending" | "Approved" | "Rejected"
  purpose: string
  confirmation_number: string
  contact_email?: string
  contact_phone?: string
  user_name?: string
  room_name?: string
  created_at?: string
  attendees?: number
}

// Type for grouped reservation data
export interface GroupedReservation {
  ids: number[]
  booking_name: string
  room_id: number
  user_id: string
  date: string
  time_slots: { start_time: string; end_time: string }[]
  status: "Pending" | "Approved" | "Rejected"
  purpose: string
  confirmation_number: string
  contact_email?: string
  contact_phone?: string
  user_name?: string
  room_name?: string
  room_capacity?: number
  room_description?: string
  created_at?: string
  attendees?: number
}

/**
 * Groups reservations by confirmation number base, date, and room ID
 * This ensures that reservations for the same room on the same day are grouped together
 * @param reservations - Array of individual reservations
 * @param sortDirection - Sort direction for final grouped results
 * @returns Array of grouped reservations
 */
export function groupReservations(
  reservations: Reservation[],
  sortDirection: "asc" | "desc" = "desc"
): GroupedReservation[] {
  if (reservations.length === 0) return []

  const grouped: { [key: string]: GroupedReservation } = {}

  reservations.forEach((reservation) => {
    // Extract the base confirmation number (before the dash or the whole if no dash)
    const baseConfirmation = reservation.confirmation_number.split("-")[0]

    // Create a unique key combining the confirmation base, date, and room_id
    const groupKey = `${baseConfirmation}-${reservation.date}-${reservation.room_id}`

    if (!grouped[groupKey]) {
      // Create new group
      grouped[groupKey] = {
        ids: [reservation.id],
        booking_name: reservation.booking_name,
        room_id: reservation.room_id,
        user_id: reservation.user_id,
        date: reservation.date,
        time_slots: [{ start_time: reservation.start_time, end_time: reservation.end_time }],
        status: reservation.status,
        purpose: reservation.purpose,
        confirmation_number: baseConfirmation,
        contact_email: reservation.contact_email,
        contact_phone: reservation.contact_phone,
        user_name: reservation.user_name,
        room_name: reservation.room_name,
        created_at: reservation.created_at,
        attendees: reservation.attendees,
      }
    } else {
      // Add to existing group - but only if the reservation ID is not already included
      if (!grouped[groupKey].ids.includes(reservation.id)) {
        grouped[groupKey].ids.push(reservation.id)
        grouped[groupKey].time_slots.push({
          start_time: reservation.start_time,
          end_time: reservation.end_time,
        })

        // Status priority: Pending > Rejected > Approved
        // If any reservation in the group is pending, mark the whole group as pending
        if (reservation.status === "Pending" && grouped[groupKey].status !== "Pending") {
          grouped[groupKey].status = "Pending"
        }
        // If all are approved but one is rejected, mark as rejected
        else if (reservation.status === "Rejected" && grouped[groupKey].status === "Approved") {
          grouped[groupKey].status = "Rejected"
        }
      }
    }
  })

  // Sort time slots chronologically for each group
  Object.values(grouped).forEach((group) => {
    group.time_slots.sort((a, b) => {
      return a.start_time.localeCompare(b.start_time)
    })
  })

  // Sort by date according to sortDirection
  const groupedArray = Object.values(grouped)
  groupedArray.sort((a, b) => {
    const dateA = new Date(a.date).getTime()
    const dateB = new Date(b.date).getTime()
    return sortDirection === "asc" ? dateA - dateB : dateB - dateA
  })

  return groupedArray
}

/**
 * Generates QR code text with a secure format for a specific time slot
 * Format: INR + room_id (padded) + date (YYMMDD) + start_time + confirmation_number
 * @param reservation - Grouped reservation data
 * @param timeSlot - Specific time slot to generate QR code for
 * @returns QR code text string
 */
export function generateQRCodeText(reservation: GroupedReservation, timeSlot?: { start_time: string; end_time: string }): string {
  const roomPrefix = "INR"
  const cleanConfirmation = reservation.confirmation_number.replace(/[^0-9]/g, "")
  const roomId = reservation.room_id.toString().padStart(2, "0")
  const dateCode = reservation.date.replace(/-/g, "").slice(2) // YYMMDD format
  
  // Use specific time slot or first one as fallback
  const targetSlot = timeSlot || reservation.time_slots[0]
  // Fix: Replace all colons and take only first 4 digits (HHMM format)
  const timeCode = targetSlot?.start_time.replace(/:/g, "").slice(0, 4) || "0000"

  // Generate longer code: INR + room_id + date + time + confirmation
  return `${roomPrefix}${roomId}${dateCode}${timeCode}${cleanConfirmation}`
}

/**
 * Generates QR code texts for all time slots in a reservation
 * @param reservation - Grouped reservation data
 * @returns Array of QR code texts, one for each time slot
 */
export function generateAllQRCodes(reservation: GroupedReservation): string[] {
  return reservation.time_slots.map(timeSlot => 
    generateQRCodeText(reservation, timeSlot)
  )
}

/**
 * Generates QR code for a single reservation record using its individual data
 * @param reservation - Individual reservation record from database
 * @returns QR code text string
 */
export function generateQRCodeForRecord(reservation: {
  room_id: number
  date: string
  start_time: string
  confirmation_number: string
}): string {
  const roomPrefix = "INR"
  const cleanConfirmation = reservation.confirmation_number.replace(/[^0-9]/g, "")
  const roomId = reservation.room_id.toString().padStart(2, "0")
  const dateCode = reservation.date.replace(/-/g, "").slice(2) // YYMMDD format
  // Fix: Replace all colons and take only first 4 digits (HHMM format)
  const timeCode = reservation.start_time.replace(/:/g, "").slice(0, 4) || "0000"

  // Generate code: INR + room_id + date + time + confirmation
  return `${roomPrefix}${roomId}${dateCode}${timeCode}${cleanConfirmation}`
}

/**
 * Auto-generates and updates QR codes for all reservations in the database
 * This function fetches all reservations and generates individual QR codes for each record
 * @param supabaseUrl - Supabase URL
 * @param supabaseAnonKey - Supabase anonymous key
 * @param statusFilter - Optional filter to only update reservations with specific status (default: all)
 * @returns Promise that resolves when all QR codes are generated and stored
 */
export async function autoGenerateAllQRCodes(
  supabaseUrl: string,
  supabaseAnonKey: string,
  statusFilter?: "Pending" | "Approved" | "Rejected"
): Promise<{ updated: number; errors: number }> {
  try {
    const supabase = createClientComponentClient({
      supabaseUrl,
      supabaseKey: supabaseAnonKey,
    })

    console.log("Fetching all reservations from database...")

    // Fetch all reservations from the database
    let query = supabase
      .from("reservations")
      .select("id, room_id, date, start_time, confirmation_number, status")
      .order("created_at", { ascending: true })

    // Apply status filter if provided
    if (statusFilter) {
      query = query.eq("status", statusFilter)
    }

    const { data: allReservations, error: fetchError } = await query

    if (fetchError) {
      console.error("Error fetching reservations:", fetchError)
      throw fetchError
    }

    if (!allReservations || allReservations.length === 0) {
      console.log("No reservations found in database")
      return { updated: 0, errors: 0 }
    }

    console.log(`Found ${allReservations.length} reservations. Generating QR codes...`)

    let updatedCount = 0
    let errorCount = 0

    // Process each reservation individually
    for (const reservation of allReservations) {
      try {
        // Generate QR code for this specific reservation record
        const qrCodeText = generateQRCodeForRecord(reservation)
        
        // Update the reservation with the generated QR code
        const { error: updateError } = await supabase
          .from("reservations")
          .update({ qr_code_url: qrCodeText })
          .eq("id", reservation.id)

        if (updateError) {
          console.error(`Error updating reservation ${reservation.id}:`, updateError)
          errorCount++
        } else {
          console.log(`Updated reservation ${reservation.id} with QR code: ${qrCodeText}`)
          updatedCount++
        }
      } catch (error) {
        console.error(`Failed to process reservation ${reservation.id}:`, error)
        errorCount++
      }
    }

    console.log(`QR code generation complete. Updated: ${updatedCount}, Errors: ${errorCount}`)
    return { updated: updatedCount, errors: errorCount }

  } catch (error) {
    console.error("Failed to auto-generate QR codes:", error)
    throw error
  }
}

/**
 * Stores QR code text in the database for approved reservations
 * Creates individual QR codes for each time slot and stores them in the corresponding reservation records
 * @param reservation - Grouped reservation data
 * @param supabaseUrl - Supabase URL
 * @param supabaseAnonKey - Supabase anonymous key
 * @returns Promise that resolves when all QR codes are stored
 */
export async function storeQRCodeForApprovedReservation(
  reservation: GroupedReservation,
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<void> {
  try {
    const supabase = createClientComponentClient({
      supabaseUrl,
      supabaseKey: supabaseAnonKey,
    })

    // Use the reservation IDs from the grouped reservation to fetch the records directly
    const { data: reservationRecords, error: fetchError } = await supabase
      .from("reservations")
      .select("id, start_time, end_time, confirmation_number")
      .in("id", reservation.ids)
      .order("start_time", { ascending: true })

    if (fetchError) {
      console.error("Error fetching reservation records:", fetchError)
      throw fetchError
    }

    if (!reservationRecords || reservationRecords.length === 0) {
      throw new Error("No reservation records found for QR code generation")
    }

    // Generate and store QR code for each individual reservation record
    for (const record of reservationRecords) {
      // Use the individual record's data for QR code generation
      const qrCodeText = generateQRCodeForRecord({
        room_id: reservation.room_id,
        date: reservation.date,
        start_time: record.start_time,
        confirmation_number: record.confirmation_number
      })
      
      const { error: updateError } = await supabase
        .from("reservations")
        .update({ qr_code_url: qrCodeText })
        .eq("id", record.id)

      if (updateError) {
        console.error(`Error storing QR code for reservation ${record.id}:`, updateError)
        throw updateError
      }
    }
  } catch (error) {
    console.error("Failed to store QR code text:", error)
    throw error
  }
}

/**
 * Updates reservation status for all reservations in a group
 * @param reservationIds - Array of reservation IDs to update
 * @param status - New status to set
 * @param supabaseUrl - Supabase URL
 * @param supabaseAnonKey - Supabase anonymous key
 * @returns Promise that resolves when all reservations are updated
 */
export async function updateReservationStatus(
  reservationIds: number[],
  status: "Pending" | "Approved" | "Rejected",
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<void> {
  try {
    const supabase = createClientComponentClient({
      supabaseUrl,
      supabaseKey: supabaseAnonKey,
    })

    // Update all reservations in the group
    for (const id of reservationIds) {
      const { error } = await supabase
        .from("reservations")
        .update({
          status: status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)

      if (error) {
        console.error(`Error updating reservation ${id}:`, error)
        throw error
      }
    }

    console.log(`Successfully updated ${reservationIds.length} reservations to ${status}`)
  } catch (error) {
    console.error("Failed to update reservation status:", error)
    throw error
  }
}

/**
 * Formats time slots for display
 * @param timeSlots - Array of time slots
 * @returns Formatted time string
 */
export function formatTimeSlots(timeSlots: { start_time: string; end_time: string }[]): string {
  if (!timeSlots.length) return "N/A"

  // If there's only one time slot, just show start and end time
  if (timeSlots.length === 1) {
    return `${timeSlots[0].start_time.substring(0, 5)} - ${timeSlots[0].end_time.substring(0, 5)}`
  }

  // For multiple time slots, sort them first
  const sortedSlots = [...timeSlots].sort((a, b) => a.start_time.localeCompare(b.start_time))

  // Check if slots are consecutive
  let isConsecutive = true
  for (let i = 0; i < sortedSlots.length - 1; i++) {
    const currentEndHour = Number.parseInt(sortedSlots[i].end_time.split(":")[0])
    const nextStartHour = Number.parseInt(sortedSlots[i + 1].start_time.split(":")[0])
    if (currentEndHour !== nextStartHour) {
      isConsecutive = false
      break
    }
  }

  if (isConsecutive) {
    // If consecutive, show as a range from first start to last end
    return `${sortedSlots[0].start_time.substring(0, 5)} - ${sortedSlots[sortedSlots.length - 1].end_time.substring(0, 5)}`
  } else {
    // If not consecutive, list all slots
    return sortedSlots
      .map((slot) => `${slot.start_time.substring(0, 5)} - ${slot.end_time.substring(0, 5)}`)
      .join(", ")
  }
}

/**
 * Formats time for 12-hour display (AM/PM)
 * @param timeString - Time in 24-hour format (HH:MM)
 * @returns Formatted time string
 */
export function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(":")
  const hour = Number.parseInt(hours)
  const period = hour >= 12 ? "PM" : "AM"
  const formattedHour = hour % 12 === 0 ? 12 : hour % 12
  return `${formattedHour}:${minutes} ${period}`
}

/**
 * Formats date for display
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Formatted date string
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

/**
 * Formats date for short display (used in admin table)
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Short formatted date string
 */
export function formatDateShort(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}
