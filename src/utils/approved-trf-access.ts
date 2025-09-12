import { auth } from "@clerk/nextjs/server";

/**
 * Checks if the current authenticated user has access to download approved TRF files.
 * Access is controlled by the APPROVED_TRF_ACCESS_EMAILS environment variable.
 * 
 * @returns Promise<boolean> - true if user has access, false otherwise
 */
export async function hasApprovedTRFAccess(): Promise<boolean> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return false;
    }

    // Get user email from Clerk
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const userEmail = user.emailAddresses[0]?.emailAddress;

    if (!userEmail) {
      return false;
    }

    // Get approved TRF access emails from environment
    const approvedEmails = process.env.APPROVED_TRF_ACCESS_EMAILS?.split(',') || [];
    
    // Normalize emails (trim whitespace, convert to lowercase)
    const normalizedApprovedEmails = approvedEmails.map(email => 
      email.trim().toLowerCase()
    );
    
    return normalizedApprovedEmails.includes(userEmail.toLowerCase());
  } catch (error) {
    console.error("Error checking approved TRF access:", error);
    return false;
  }
}

/**
 * Gets the list of approved TRF access emails (for admin/debugging purposes).
 * This should only be used in admin contexts and never exposed to clients.
 * 
 * @returns string[] - Array of approved email addresses
 */
export function getApprovedTRFAccessEmails(): string[] {
  const approvedEmails = process.env.APPROVED_TRF_ACCESS_EMAILS?.split(',') || [];
  return approvedEmails.map(email => email.trim()).filter(email => email.length > 0);
}
