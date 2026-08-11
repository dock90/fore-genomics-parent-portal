import { sendGmail } from './gmail-send';

/**
 * The message a parent sends their child's doctor from Fore Explore.
 *
 * It carries no clinical content of its own — who shared it, which patient,
 * which document, and the attachment. Anything this email said *about* the
 * result would be Fore interpreting a lab report, which is the line the whole
 * Explore product is built around not crossing.
 *
 * The document travels as an ATTACHMENT, never a link. A signed URL in a clinic
 * mailbox is a bearer credential for a child's record: it survives forwarding,
 * needs no sign-in, and cannot be revoked.
 */

export interface ClinicianShareData {
	to: string;
	childName: string;
	/** The parent who sent it. Becomes Reply-To. */
	sharedByEmail: string;
	documentLabel: string;
	attachment: { filename: string; content: Buffer; contentType: string };
}

function text(data: ClinicianShareData): string {
	return [
		`${data.sharedByEmail} has shared a Fore Genomics genomic screening report with you.`,
		``,
		`Patient: ${data.childName}`,
		`Document: ${data.documentLabel}`,
		``,
		`The report is attached. It was produced by the laboratory and is the record of what was screened and what was reported.`,
		``,
		`Replying to this message goes to ${data.sharedByEmail}.`,
		``,
		`If you were not expecting this, please disregard it and let us know at support@foregenomics.com.`,
	].join('\n');
}

function html(data: ClinicianShareData): string {
	return `
		<div style="font-family: Helvetica, Arial, sans-serif; color: #17313d; line-height: 1.6; max-width: 560px;">
			<p><strong>${data.sharedByEmail}</strong> has shared a Fore Genomics genomic screening report with you.</p>
			<table style="border-collapse: collapse; margin: 20px 0;">
				<tr>
					<td style="padding: 4px 16px 4px 0; color: #5f7076;">Patient</td>
					<td style="padding: 4px 0;"><strong>${data.childName}</strong></td>
				</tr>
				<tr>
					<td style="padding: 4px 16px 4px 0; color: #5f7076;">Document</td>
					<td style="padding: 4px 0;">${data.documentLabel}</td>
				</tr>
			</table>
			<p>The report is attached. It was produced by the laboratory and is the record of what was screened and what was reported.</p>
			<p style="color: #5f7076; font-size: 14px;">Replying to this message goes to ${data.sharedByEmail}. If you were not expecting this, please disregard it and let us know at support@foregenomics.com.</p>
		</div>
	`;
}

export async function sendReportToClinician(data: ClinicianShareData): Promise<void> {
	await sendGmail({
		to: data.to,
		// The parent is the correspondent here, not Fore. A doctor replying with
		// a question must reach them, not a mailbox nobody watches.
		replyTo: data.sharedByEmail,
		subject: `Genomic screening report for ${data.childName}`,
		text: text(data),
		html: html(data),
		attachments: [data.attachment],
	});
}
