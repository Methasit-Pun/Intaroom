import { createClient } from "@supabase/supabase-js"
import { supabaseUrl, supabaseAnonKey } from "@/app/env"

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database tables
export interface Reservation {
  id?: number
  booking_name: string
  room_id: number
  user_id: string
  date: string
  start_time: string
  end_time: string
  status: "Pending" | "Approved" | "Rejected"
  purpose: string
  attendees?: number
  contact_email?: string
  contact_phone?: string
  confirmation_number: string
  special_requests?: string[]
  check_in_method?: string
  created_at?: string
  updated_at?: string
}

export interface Room {
  id: number
  name: string
  capacity: number
  description?: string
  image_url?: string
  is_active: boolean
}

// Function to create a new reservation
export async function createReservation(reservation: Omit<Reservation, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase.from("reservations").insert([reservation]).select()

  if (error) {
    console.error("Error creating reservation:", error)
    throw error
  }

  return data?.[0]
}

// Function to get reservations for a specific room and date
export async function getReservationsForRoom(roomId: number, date: string) {
  const { data, error } = await supabase.from("reservations").select("*").eq("room_id", roomId).eq("date", date)

  if (error) {
    console.error("Error fetching reservations:", error)
    throw error
  }

  return data || []
}

// Function to get all rooms
export async function getRooms() {
  const { data, error } = await supabase.from("rooms").select("*").eq("is_active", true)

  if (error) {
    console.error("Error fetching rooms:", error)
    throw error
  }

  return data || []
}

// Function to generate a unique confirmation number
export function generateConfirmationNumber() {
  const prefix = "INR"
  const randomPart = Math.floor(100000 + Math.random() * 900000) // 6-digit number
  return `${prefix}-${randomPart}`
}

// Update the convertTimeFormat function to better handle time formats
export function convertTimeFormat(timeString: string): string {
  const [hourStr, period] = timeString.split(" ")
  let hour = Number.parseInt(hourStr)

  // Convert to 24-hour format
  if (period === "PM" && hour < 12) hour += 12
  if (period === "AM" && hour === 12) hour = 0

  // Format with leading zero if needed
  return `${hour.toString().padStart(2, "0")}:00`
}

// Add a function to convert from 24-hour format to AM/PM
export function convertFrom24To12Format(timeString: string): string {
  const [hourStr] = timeString.split(":")
  let hour = Number.parseInt(hourStr)
  const period = hour >= 12 ? "PM" : "AM"


  
  // Convert to 12-hour format
  if (hour > 12) hour -= 12
  if (hour === 0) hour = 12

  return `${hour} ${period}`
}
