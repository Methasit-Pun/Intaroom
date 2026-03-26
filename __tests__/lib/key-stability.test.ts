/**
 * Unit tests — stable React list key generation
 *
 * Covers two key fixes:
 *
 * 1. app/admin/calendar/page.tsx
 *    Before: key={index}
 *    After:  key={day ? day.toISOString() : `empty-${index}`}
 *
 * 2. app/summary/page.tsx
 *    Before: key={index}
 *    After:  key={request}   (the string value itself)
 */

import { describe, it, expect } from "vitest"

// ─── Calendar key generation (admin/calendar/page.tsx fix) ───────────────────

function calendarDayKey(day: Date | null, index: number): string {
  return day ? day.toISOString() : `empty-${index}`
}

describe("calendarDayKey()", () => {
  it("returns the ISO string for a real date", () => {
    const day = new Date("2025-06-15T00:00:00.000Z")
    expect(calendarDayKey(day, 0)).toBe(day.toISOString())
  })

  it("returns 'empty-{index}' for a null padding cell", () => {
    expect(calendarDayKey(null, 3)).toBe("empty-3")
  })

  it("two dates on the same calendar produce different keys", () => {
    const d1 = new Date("2025-06-01")
    const d2 = new Date("2025-06-02")
    expect(calendarDayKey(d1, 0)).not.toBe(calendarDayKey(d2, 1))
  })

  it("two null cells at different indices produce different keys", () => {
    expect(calendarDayKey(null, 0)).not.toBe(calendarDayKey(null, 1))
  })

  it("date key does not depend on the index argument", () => {
    const day = new Date("2025-06-15")
    expect(calendarDayKey(day, 0)).toBe(calendarDayKey(day, 99))
  })

  it("produces unique keys across a full 35-cell calendar grid", () => {
    // Build a typical calendar grid: some leading nulls, then real dates
    const cells: Array<Date | null> = []
    // 2 leading padding cells (null)
    cells.push(null, null)
    // 30 real days for June 2025
    for (let d = 1; d <= 30; d++) {
      cells.push(new Date(`2025-06-${String(d).padStart(2, "0")}`))
    }
    // 3 trailing padding cells (null)
    cells.push(null, null, null)

    const keys = cells.map((cell, i) => calendarDayKey(cell, i))
    const uniqueKeys = new Set(keys)

    expect(uniqueKeys.size).toBe(cells.length)
  })
})

// ─── Special-request key generation (summary/page.tsx fix) ───────────────────

/**
 * The fix uses the string value itself as the key:
 *   specialRequests.map((request) => <span key={request} ...>)
 *
 * This is safe when the values are guaranteed unique (they come from a
 * predefined set of checkbox options).
 */
function specialRequestKey(request: string): string {
  return request
}

describe("specialRequestKey()", () => {
  it("returns the request string as-is", () => {
    expect(specialRequestKey("Projector")).toBe("Projector")
    expect(specialRequestKey("Whiteboard")).toBe("Whiteboard")
  })

  it("produces unique keys for distinct request values", () => {
    const requests = ["Projector", "Whiteboard", "Video Conferencing", "Catering"]
    const keys = requests.map(specialRequestKey)
    const uniqueKeys = new Set(keys)
    expect(uniqueKeys.size).toBe(requests.length)
  })

  it("key is stable across repeated calls with the same value", () => {
    const request = "Projector"
    expect(specialRequestKey(request)).toBe(specialRequestKey(request))
  })
})
