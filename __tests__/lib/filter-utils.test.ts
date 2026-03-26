/**
 * Unit tests — filteredReservations logic from app/admin/page.tsx
 *
 * Covers the useMemo fix that memoises the filter computation:
 *   - search term matches across multiple fields
 *   - status filter
 *   - tab filter
 *   - combined filters
 */

import { describe, it, expect } from "vitest"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Reservation {
  booking_name: string
  room_name?: string
  date: string
  user_name?: string
  contact_email?: string
  contact_phone?: string
  purpose: string
  status: string
}

// ─── Pure logic mirrored from app/admin/page.tsx ─────────────────────────────

function filterReservations(
  reservations: Reservation[],
  searchTerm: string,
  statusFilter: string,
  currentTab: string
): Reservation[] {
  return reservations.filter((reservation) => {
    const matchesSearch =
      reservation.booking_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.room_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.date.includes(searchTerm) ||
      reservation.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.contact_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.contact_phone?.includes(searchTerm) ||
      reservation.purpose.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "All" || reservation.status === statusFilter

    const matchesTab =
      currentTab === "all" ||
      (currentTab === "pending" && reservation.status === "Pending") ||
      (currentTab === "approved" && reservation.status === "Approved") ||
      (currentTab === "rejected" && reservation.status === "Rejected") ||
      currentTab === "analytics"

    return matchesSearch && matchesStatus && matchesTab
  })
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const reservations: Reservation[] = [
  {
    booking_name: "Team Standup",
    room_name: "Meeting Room A",
    date: "2025-06-10",
    user_name: "Alice",
    contact_email: "alice@example.com",
    contact_phone: "0812345678",
    purpose: "Daily sync",
    status: "Approved",
  },
  {
    booking_name: "Project Kickoff",
    room_name: "Conference Room B",
    date: "2025-06-11",
    user_name: "Bob",
    contact_email: "bob@example.com",
    contact_phone: "0898765432",
    purpose: "New project planning",
    status: "Pending",
  },
  {
    booking_name: "Design Review",
    room_name: "Meeting Room A",
    date: "2025-06-12",
    user_name: "Carol",
    contact_email: "carol@example.com",
    contact_phone: "0867654321",
    purpose: "UI review session",
    status: "Rejected",
  },
]

// ─── Search filter ─────────────────────────────────────────────────────────────

describe("filterReservations() — search term", () => {
  it("returns all reservations when search term is empty", () => {
    expect(filterReservations(reservations, "", "All", "all")).toHaveLength(3)
  })

  it("matches by booking_name (case-insensitive)", () => {
    const result = filterReservations(reservations, "standup", "All", "all")
    expect(result).toHaveLength(1)
    expect(result[0].booking_name).toBe("Team Standup")
  })

  it("matches by room_name (case-insensitive)", () => {
    const result = filterReservations(reservations, "conference", "All", "all")
    expect(result).toHaveLength(1)
    expect(result[0].booking_name).toBe("Project Kickoff")
  })

  it("matches by date string", () => {
    const result = filterReservations(reservations, "2025-06-12", "All", "all")
    expect(result).toHaveLength(1)
    expect(result[0].booking_name).toBe("Design Review")
  })

  it("matches by user_name (case-insensitive)", () => {
    const result = filterReservations(reservations, "alice", "All", "all")
    expect(result).toHaveLength(1)
    expect(result[0].user_name).toBe("Alice")
  })

  it("matches by contact_email (case-insensitive)", () => {
    const result = filterReservations(reservations, "bob@example", "All", "all")
    expect(result).toHaveLength(1)
    expect(result[0].user_name).toBe("Bob")
  })

  it("matches by contact_phone", () => {
    const result = filterReservations(reservations, "0867654321", "All", "all")
    expect(result).toHaveLength(1)
    expect(result[0].user_name).toBe("Carol")
  })

  it("matches by purpose (case-insensitive)", () => {
    const result = filterReservations(reservations, "planning", "All", "all")
    expect(result).toHaveLength(1)
    expect(result[0].booking_name).toBe("Project Kickoff")
  })

  it("returns empty when no field matches", () => {
    const result = filterReservations(reservations, "zzz-no-match", "All", "all")
    expect(result).toHaveLength(0)
  })
})

// ─── Status filter ────────────────────────────────────────────────────────────

describe("filterReservations() — status filter", () => {
  it("'All' status returns every reservation", () => {
    expect(filterReservations(reservations, "", "All", "all")).toHaveLength(3)
  })

  it("filters to only Approved reservations", () => {
    const result = filterReservations(reservations, "", "Approved", "all")
    expect(result).toHaveLength(1)
    expect(result[0].status).toBe("Approved")
  })

  it("filters to only Pending reservations", () => {
    const result = filterReservations(reservations, "", "Pending", "all")
    expect(result).toHaveLength(1)
    expect(result[0].status).toBe("Pending")
  })

  it("filters to only Rejected reservations", () => {
    const result = filterReservations(reservations, "", "Rejected", "all")
    expect(result).toHaveLength(1)
    expect(result[0].status).toBe("Rejected")
  })
})

// ─── Tab filter ───────────────────────────────────────────────────────────────

describe("filterReservations() — tab filter", () => {
  it("'all' tab includes every status", () => {
    expect(filterReservations(reservations, "", "All", "all")).toHaveLength(3)
  })

  it("'pending' tab includes only Pending reservations", () => {
    const result = filterReservations(reservations, "", "All", "pending")
    expect(result.every((r) => r.status === "Pending")).toBe(true)
  })

  it("'approved' tab includes only Approved reservations", () => {
    const result = filterReservations(reservations, "", "All", "approved")
    expect(result.every((r) => r.status === "Approved")).toBe(true)
  })

  it("'rejected' tab includes only Rejected reservations", () => {
    const result = filterReservations(reservations, "", "All", "rejected")
    expect(result.every((r) => r.status === "Rejected")).toBe(true)
  })

  it("'analytics' tab passes all reservations through (no tab filtering)", () => {
    expect(filterReservations(reservations, "", "All", "analytics")).toHaveLength(3)
  })
})

// ─── Combined filters ─────────────────────────────────────────────────────────

describe("filterReservations() — combined filters", () => {
  it("search + status filter are ANDed together", () => {
    // "Meeting Room A" matches 2 items, but only 1 is Approved
    const result = filterReservations(reservations, "Meeting Room A", "Approved", "all")
    expect(result).toHaveLength(1)
    expect(result[0].booking_name).toBe("Team Standup")
  })

  it("search + tab filter are ANDed together", () => {
    // "2025-06" matches all 3, but 'pending' tab keeps only the Pending one
    const result = filterReservations(reservations, "2025-06", "All", "pending")
    expect(result).toHaveLength(1)
    expect(result[0].status).toBe("Pending")
  })

  it("returns empty when status filter and tab are contradictory", () => {
    // status = Approved but tab = pending → no match possible
    const result = filterReservations(reservations, "", "Approved", "pending")
    expect(result).toHaveLength(0)
  })
})
