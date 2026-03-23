/**
 * Unit tests — calendar logic extracted from components/room-reservation.tsx
 *
 * Covers the two useMemo fixes:
 *   getWeekDates()       — 7-day window centred 3 days before the selected date
 *   generateCalendarDays() — month-grid that always starts on Sunday / ends on Saturday
 */

import { describe, it, expect } from "vitest"

// ─── Pure logic mirrored from components/room-reservation.tsx ────────────────

function getWeekDates(selectedDate: Date): Date[] {
  const dates: Date[] = []
  const startDate = new Date(selectedDate)
  startDate.setDate(startDate.getDate() - 3)
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    dates.push(date)
  }
  return dates
}

function generateCalendarDays(selectedDate: Date): Date[] {
  const days: Date[] = []
  const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  const lastDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)

  const startDate = new Date(firstDay)
  startDate.setDate(firstDay.getDate() - firstDay.getDay())

  const endDate = new Date(lastDay)
  endDate.setDate(lastDay.getDate() + (6 - lastDay.getDay()))

  const currentDate = new Date(startDate)
  while (currentDate <= endDate) {
    days.push(new Date(currentDate))
    currentDate.setDate(currentDate.getDate() + 1)
  }
  return days
}

// ─── getWeekDates ─────────────────────────────────────────────────────────────

describe("getWeekDates()", () => {
  it("always returns exactly 7 dates", () => {
    const result = getWeekDates(new Date("2025-06-15"))
    expect(result).toHaveLength(7)
  })

  it("first date is 3 days before the selected date", () => {
    const selected = new Date("2025-06-15")
    const result = getWeekDates(selected)
    const expectedStart = new Date("2025-06-12")
    expect(result[0].toDateString()).toBe(expectedStart.toDateString())
  })

  it("last date is 3 days after the selected date", () => {
    const selected = new Date("2025-06-15")
    const result = getWeekDates(selected)
    const expectedEnd = new Date("2025-06-18")
    expect(result[6].toDateString()).toBe(expectedEnd.toDateString())
  })

  it("dates are consecutive with no gaps", () => {
    const result = getWeekDates(new Date("2025-01-01"))
    for (let i = 1; i < result.length; i++) {
      const diffMs = result[i].getTime() - result[i - 1].getTime()
      expect(diffMs).toBe(24 * 60 * 60 * 1000) // exactly 1 day
    }
  })

  it("handles month boundary correctly (end of month)", () => {
    // Selected = Jan 31; window spans Jan 28 – Feb 3
    const result = getWeekDates(new Date("2025-01-31"))
    expect(result[0].toDateString()).toBe(new Date("2025-01-28").toDateString())
    expect(result[6].toDateString()).toBe(new Date("2025-02-03").toDateString())
  })

  it("handles year boundary correctly", () => {
    // Selected = Jan 1; window spans Dec 29 – Jan 4
    const result = getWeekDates(new Date("2025-01-01"))
    expect(result[0].toDateString()).toBe(new Date("2024-12-29").toDateString())
    expect(result[6].toDateString()).toBe(new Date("2025-01-04").toDateString())
  })

  it("does not mutate the original selectedDate", () => {
    const original = new Date("2025-06-15")
    const originalTime = original.getTime()
    getWeekDates(original)
    expect(original.getTime()).toBe(originalTime)
  })
})

// ─── generateCalendarDays ─────────────────────────────────────────────────────

describe("generateCalendarDays()", () => {
  it("always returns a multiple of 7 days (full weeks)", () => {
    const months = [
      new Date("2025-01-15"), // starts on Wed
      new Date("2025-02-15"), // Feb (28 days, starts on Sat)
      new Date("2024-02-15"), // leap Feb
      new Date("2025-08-15"), // starts on Fri
    ]
    for (const d of months) {
      const result = generateCalendarDays(d)
      expect(result.length % 7).toBe(0)
    }
  })

  it("first day of the grid is always a Sunday (getDay() === 0)", () => {
    const result = generateCalendarDays(new Date("2025-06-15"))
    expect(result[0].getDay()).toBe(0)
  })

  it("last day of the grid is always a Saturday (getDay() === 6)", () => {
    const result = generateCalendarDays(new Date("2025-06-15"))
    expect(result[result.length - 1].getDay()).toBe(6)
  })

  it("contains all days of the selected month", () => {
    const selected = new Date("2025-06-15")
    const result = generateCalendarDays(selected)
    const junedays = result.filter(
      (d) => d.getMonth() === 5 && d.getFullYear() === 2025
    )
    expect(junedays).toHaveLength(30) // June has 30 days
  })

  it("grid for a month whose 1st is Sunday has no leading padding days", () => {
    // June 1, 2025 is a Sunday → first grid cell IS June 1
    const result = generateCalendarDays(new Date("2025-06-01"))
    expect(result[0].toDateString()).toBe(new Date("2025-06-01").toDateString())
  })

  it("includes padding days from the previous month when month starts mid-week", () => {
    // July 1, 2025 is a Tuesday → grid starts on June 29
    const result = generateCalendarDays(new Date("2025-07-01"))
    expect(result[0].toDateString()).toBe(new Date("2025-06-29").toDateString())
  })

  it("handles leap February correctly (29 days in 2024)", () => {
    const result = generateCalendarDays(new Date("2024-02-15"))
    const febDays = result.filter(
      (d) => d.getMonth() === 1 && d.getFullYear() === 2024
    )
    expect(febDays).toHaveLength(29)
  })

  it("dates are consecutive with no gaps", () => {
    const result = generateCalendarDays(new Date("2025-03-15"))
    for (let i = 1; i < result.length; i++) {
      const diffMs = result[i].getTime() - result[i - 1].getTime()
      expect(diffMs).toBe(24 * 60 * 60 * 1000)
    }
  })
})
