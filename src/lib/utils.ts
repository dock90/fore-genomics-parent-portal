import { format } from "date-fns";

/**
 * Creates a date object from a YYYY-MM-DD string in local timezone
 * This prevents timezone conversion issues when parsing date strings
 */
export function parseLocalDate(dateString: string): Date {
  if (!dateString) throw new Error("Date string is required");

  // If it's already a YYYY-MM-DD string, parse it as local date
  if (
    typeof dateString === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(dateString)
  ) {
    const [year, month, day] = dateString.split("-").map(Number);
    // Create date in local timezone by using local date constructor with noon time
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  // Fallback for other date formats
  return new Date(dateString);
}

/**
 * Formats a date string as a local date using date-fns
 * This prevents timezone issues when displaying dates
 */
export function formatLocalDate(dateString: string, formatStr: string): string {
  if (!dateString) return "Not provided";

  try {
    const date = parseLocalDate(dateString);
    return format(date, formatStr);
  } catch (error) {
    return "Invalid date";
  }
}

/**
 * Formats a date string for display in a user-friendly format
 * Returns format like "Monday, March 1, 2011"
 */
export function formatDateForDisplay(dateString: string): string {
  if (!dateString) return "Not provided";

  try {
    const date = parseLocalDate(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (error) {
    return "Invalid date";
  }
}

/**
 * Calculates the number of days between a date and today
 * Returns positive number for future dates, negative for past dates
 */
export function getDaysUntilDate(targetDate: string): number {
  if (!targetDate) return 0;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to start of day

    const target = parseLocalDate(targetDate);
    target.setHours(0, 0, 0, 0); // Reset to start of day

    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch (error) {
    return 0;
  }
}
