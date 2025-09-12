import { emailService } from "@/lib/email-service";

/**
 * Send daily notification to counselors about unapproved TRFs
 * This is a wrapper function to make it easier to import in API routes
 */
export async function sendCounselorNotificationEmail(
  counselorEmail: string,
  unapprovedCount: number
): Promise<void> {
  return emailService.sendCounselorNotificationEmail(counselorEmail, unapprovedCount);
}
