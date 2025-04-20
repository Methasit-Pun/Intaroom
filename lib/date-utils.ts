/**
 * Utility functions for consistent date handling
 */

/**
 * Formats a Date object to YYYY-MM-DD string in local timezone
 */
export function formatDateToYYYYMMDD(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

/**
 * Parses a YYYY-MM-DD string to a Date object in local timezone
 */
export function parseYYYYMMDDToDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map((num) => Number.parseInt(num, 10))
  return new Date(year, month - 1, day)
}

/**
 * Formats a date string for display
 */
export function formatDateForDisplay(dateString: string, format: "short" | "long" = "long"): string {
  if (!dateString) return ""

  try {
    const date = parseYYYYMMDDToDate(dateString)

    if (format === "short") {
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    }

    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  } catch (error) {
    console.error("Error formatting date:", error, dateString)
    return dateString
  }
}

/**
 * Gets today's date as a YYYY-MM-DD string in local timezone
 */
export function getTodayAsYYYYMMDD(): string {
  const today = new Date()
  return formatDateToYYYYMMDD(today)
}
