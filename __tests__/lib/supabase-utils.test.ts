/**
 * Unit tests — pure utility functions in lib/supabase.ts
 *
 * These functions have zero external dependencies (no DB, no network)
 * so no mocking is required.
 *
 * Covers:
 *  generateConfirmationNumber() — format, uniqueness
 *  convertTimeFormat()          — 12-hour AM/PM → 24-hour HH:MM
 *  convertFrom24To12Format()    — 24-hour HH:MM → 12-hour H AM/PM
 */

import { describe, it, expect } from "vitest"
import {
  generateConfirmationNumber,
  convertTimeFormat,
  convertFrom24To12Format,
} from "@/lib/supabase"

// ─── generateConfirmationNumber ───────────────────────────────────────────────

describe("generateConfirmationNumber()", () => {
  it("returns a string with the INR- prefix", () => {
    const num = generateConfirmationNumber()
    expect(num).toMatch(/^INR-/)
  })

  it("returns a 6-digit numeric suffix after INR-", () => {
    const num = generateConfirmationNumber()
    const suffix = num.replace("INR-", "")
    expect(suffix).toMatch(/^\d{6}$/)
  })

  it("suffix is always between 100000 and 999999 (inclusive)", () => {
    for (let i = 0; i < 100; i++) {
      const num = generateConfirmationNumber()
      const suffix = parseInt(num.replace("INR-", ""), 10)
      expect(suffix).toBeGreaterThanOrEqual(100_000)
      expect(suffix).toBeLessThanOrEqual(999_999)
    }
  })

  it("generates unique values across multiple calls", () => {
    const samples = new Set(Array.from({ length: 50 }, () => generateConfirmationNumber()))
    // Statistically, 50 calls from a pool of 900 000 should yield ≥ 49 unique values
    expect(samples.size).toBeGreaterThanOrEqual(49)
  })

  it("total string length is always 10 characters (INR- + 6 digits)", () => {
    const num = generateConfirmationNumber()
    expect(num).toHaveLength(10)
  })
})

// ─── convertTimeFormat (12h → 24h) ───────────────────────────────────────────

describe("convertTimeFormat() — 12-hour → 24-hour", () => {
  it.each([
    // [input,    expected]
    ["1 AM",  "01:00"],
    ["9 AM",  "09:00"],
    ["11 AM", "11:00"],
    ["12 AM", "00:00"], // midnight
    ["12 PM", "12:00"], // noon
    ["1 PM",  "13:00"],
    ["6 PM",  "18:00"],
    ["11 PM", "23:00"],
  ])("converts '%s' → '%s'", (input, expected) => {
    expect(convertTimeFormat(input)).toBe(expected)
  })

  it("zero-pads single-digit hours", () => {
    expect(convertTimeFormat("9 AM")).toBe("09:00")
    expect(convertTimeFormat("8 PM")).toBe("20:00")
  })
})

// ─── convertFrom24To12Format (24h → 12h) ─────────────────────────────────────

describe("convertFrom24To12Format() — 24-hour → 12-hour", () => {
  it.each([
    // [input,   expected]
    ["00:00", "12 AM"], // midnight
    ["01:00", "1 AM"],
    ["09:00", "9 AM"],
    ["11:00", "11 AM"],
    ["12:00", "12 PM"], // noon
    ["13:00", "1 PM"],
    ["18:00", "6 PM"],
    ["23:00", "11 PM"],
  ])("converts '%s' → '%s'", (input, expected) => {
    expect(convertFrom24To12Format(input)).toBe(expected)
  })

  it("returns AM for hours before noon", () => {
    for (const h of [0, 1, 2, 9, 10, 11]) {
      const result = convertFrom24To12Format(`${String(h).padStart(2, "0")}:00`)
      expect(result).toContain("AM")
    }
  })

  it("returns PM for noon and after", () => {
    for (const h of [12, 13, 18, 23]) {
      const result = convertFrom24To12Format(`${String(h).padStart(2, "0")}:00`)
      expect(result).toContain("PM")
    }
  })
})

// ─── Round-trip consistency ───────────────────────────────────────────────────

describe("time format round-trip consistency", () => {
  it.each([
    ["9 AM",  "09:00"],
    ["12 PM", "12:00"],
    ["12 AM", "00:00"],
    ["6 PM",  "18:00"],
    ["11 PM", "23:00"],
  ])("12h '%s' → 24h → back to 12h produces the original", (original12h, expected24h) => {
    const as24h = convertTimeFormat(original12h)
    expect(as24h).toBe(expected24h)

    const backTo12h = convertFrom24To12Format(as24h)
    expect(backTo12h).toBe(original12h)
  })
})
