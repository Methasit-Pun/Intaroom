/**
 * Unit tests — functional setState merge pattern from app/summary/page.tsx
 *
 * Covers the fix that replaced:
 *   setBookingData({ ...bookingData, ...updates })   ← stale closure risk
 * with:
 *   setBookingData((prev) => ({ ...prev, ...updates }))   ← always fresh
 *
 * These tests verify the merge behaviour that the functional form relies on.
 */

import { describe, it, expect } from "vitest"

// ─── Types ────────────────────────────────────────────────────────────────────

interface BookingData {
  bookingName: string
  roomId: string
  roomName: string
  date: string
  timeSlots: string[]
  confirmationNumber: string
  bookedBy: string
  contactEmail: string
  contactPhone: string
  userCredits: number
  requiredCredits: number
  specialRequests: string[]
}

// ─── Helper: simulate the functional setState merge ───────────────────────────

/**
 * Mirrors the pattern used in the fix:
 *   setBookingData((prev) => ({ ...prev, ...updates }))
 */
function applyUpdate(prev: BookingData, updates: Partial<BookingData>): BookingData {
  return { ...prev, ...updates }
}

// ─── Fixture ──────────────────────────────────────────────────────────────────

const initialState: BookingData = {
  bookingName: "",
  roomId: "",
  roomName: "",
  date: "",
  timeSlots: [],
  confirmationNumber: "",
  bookedBy: "",
  contactEmail: "",
  contactPhone: "",
  userCredits: 0,
  requiredCredits: 0,
  specialRequests: [],
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("functional setState merge pattern", () => {
  it("applies updates over the previous state", () => {
    const updates = {
      bookingName: "Conference A",
      roomId: "room-1",
      roomName: "Room 1",
      date: "2025-06-15",
    }
    const next = applyUpdate(initialState, updates)

    expect(next.bookingName).toBe("Conference A")
    expect(next.roomId).toBe("room-1")
    expect(next.roomName).toBe("Room 1")
    expect(next.date).toBe("2025-06-15")
  })

  it("preserves fields that are not in the update", () => {
    const existing: BookingData = {
      ...initialState,
      specialRequests: ["Projector", "Whiteboard"],
      userCredits: 10,
    }
    const updates = { bookingName: "New Meeting" }
    const next = applyUpdate(existing, updates)

    expect(next.specialRequests).toEqual(["Projector", "Whiteboard"])
    expect(next.userCredits).toBe(10)
  })

  it("overwrites only the fields included in the update", () => {
    const existing: BookingData = {
      ...initialState,
      bookedBy: "Alice",
      contactEmail: "alice@example.com",
      contactPhone: "0812345678",
    }
    const updates = { bookedBy: "Bob", contactEmail: "bob@example.com" }
    const next = applyUpdate(existing, updates)

    expect(next.bookedBy).toBe("Bob")
    expect(next.contactEmail).toBe("bob@example.com")
    expect(next.contactPhone).toBe("0812345678") // untouched
  })

  it("does not mutate the previous state object", () => {
    const prev = { ...initialState, bookingName: "Original" }
    const prevSnapshot = { ...prev }

    applyUpdate(prev, { bookingName: "Updated" })

    expect(prev).toEqual(prevSnapshot)
  })

  it("returns a new object reference each time", () => {
    const prev = { ...initialState }
    const next = applyUpdate(prev, { bookingName: "New" })

    expect(next).not.toBe(prev)
  })

  it("handles updating array fields (timeSlots)", () => {
    const existing = { ...initialState }
    const updates = { timeSlots: ["09:00", "10:00"] }
    const next = applyUpdate(existing, updates)

    expect(next.timeSlots).toEqual(["09:00", "10:00"])
  })

  it("handles updating numeric credit fields", () => {
    const existing = { ...initialState }
    const updates = { userCredits: 15, requiredCredits: 3 }
    const next = applyUpdate(existing, updates)

    expect(next.userCredits).toBe(15)
    expect(next.requiredCredits).toBe(3)
  })

  it("applying an empty update returns state equal to previous", () => {
    const prev = { ...initialState, bookingName: "Meeting", userCredits: 5 }
    const next = applyUpdate(prev, {})

    expect(next).toEqual(prev)
  })
})
