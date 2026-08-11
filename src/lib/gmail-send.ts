import { JWT } from 'google-auth-library';
import MailComposer from 'nodemailer/lib/mail-composer';

/**
 * Sending mail through the Gmail API, as a Workspace user.
 *
 * This is the path for the one email that carries a child's clinical record —
 * see `src/app/api/explore/share/route.ts`. It deliberately does not go through
 * `email-service.ts`:
 *
 *   - **No SMTP.** Vercel pauses background async work the moment a function
 *     returns, which makes an un-awaited SMTP handshake fail silently; Vercel's
 *     own guidance is to prefer HTTP. This is an HTTPS call.
 *   - **No app password.** SMTP auth needs a Workspace app password, which
 *     needs 2FA on a human's account and is a credential nobody owns. Domain-
 *     wide delegation reuses the service account already configured for the
 *     reports bucket, so there is one set of Google credentials, not two.
 *   - **No shared transporter.** `email-service.ts` throws on construction when
 *     SMTP is unset, so binding sharing to it would take the feature down in
 *     any environment that only ever needed to send this one message.
 *
 * There is no password anywhere in this path, and that is the point. Google
 * turned off basic authentication for Workspace in 2025: an account password
 * can no longer sign in to SMTP at all, and an app password would be a static
 * 16-character secret sitting in an env var, tied to one human's 2-Step
 * Verification, that stops working the day they leave. A delegated service
 * account has no password to leak, rotate, or lose with an employee.
 *
 * Setup this cannot do for itself (a Workspace super admin must):
 *   1. Admin console → Security → API controls → Domain-wide delegation
 *   2. Add the service account's numeric **Client ID** (not its email)
 *   3. Scope: `https://www.googleapis.com/auth/gmail.send` — send only, so a
 *      leak of these credentials cannot read anyone's mailbox
 *   4. Set `GMAIL_IMPERSONATE_USER`, and `GMAIL_SEND_AS` if it differs
 *
 * PHI note: Gmail is only covered by Google's BAA on Business Plus and
 * Enterprise, with HIPAA mode enabled in the admin console. On Standard or
 * Starter there is no BAA and this must not carry a report.
 */

const SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';

/**
 * Messages over 5MB must go to the upload URI rather than the JSON endpoint,
 * and a report attachment routinely will. `uploadType=media` takes the raw
 * RFC 2822 bytes directly, so it is the only endpoint used here.
 */
const SEND_URL =
	'https://gmail.googleapis.com/upload/gmail/v1/users/me/messages/send?uploadType=media';

export interface GmailMessage {
	to: string;
	subject: string;
	text: string;
	html: string;
	/** Where a reply goes. The correspondent is rarely the sending mailbox. */
	replyTo?: string;
	attachments?: {
		filename: string;
		content: Buffer;
		contentType: string;
	}[];
}

/**
 * The two addresses here are not always the same one, and confusing them is the
 * usual reason a delegated send fails or silently arrives from the wrong place.
 *
 * `GMAIL_IMPERSONATE_USER` must be a REAL Workspace account — the mailbox the
 * token is issued as. An alias cannot be impersonated; delegation resolves the
 * subject to an actual user, and passing an alias fails the token exchange.
 *
 * `GMAIL_SEND_AS` is only the `From:` header, and exists because a team's
 * public-facing address is often an alias of some plainer account. Gmail will
 * honour it when it is a verified send-as address or an alias of the
 * impersonated account, and quietly rewrite it to the real account otherwise —
 * so if mail arrives from the wrong address, that is the thing to check.
 */
function addresses(): { impersonate: string; from: string } {
	const impersonate = process.env.GMAIL_IMPERSONATE_USER;
	if (!impersonate) {
		throw new Error(
			'GMAIL_IMPERSONATE_USER is not set. Domain-wide delegation must name a real Workspace account (not an alias).'
		);
	}
	return { impersonate, from: process.env.GMAIL_SEND_AS || impersonate };
}

function jwtClient(subject: string): JWT {
	const email = process.env.GOOGLE_CLOUD_CLIENT_EMAIL;
	const key = process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n');
	if (!email || !key) {
		throw new Error(
			'Google service account credentials are not configured (GOOGLE_CLOUD_CLIENT_EMAIL / GOOGLE_CLOUD_PRIVATE_KEY).'
		);
	}
	// `subject` is what makes this domain-wide delegation rather than a plain
	// service-account call: the token is issued *as* that Workspace user, which
	// is why the mail comes from a real mailbox and lands in its Sent items.
	return new JWT({ email, key, scopes: [SEND_SCOPE], subject });
}

/**
 * Build the RFC 2822 message with nodemailer's composer rather than by hand.
 *
 * Hand-rolled MIME is where attachment filenames get mangled, long subjects
 * break folding, and a stray boundary collision silently drops the PDF. This
 * uses nodemailer purely as a message builder — no transport, no SMTP.
 */
async function composeMime(from: string, message: GmailMessage): Promise<Buffer> {
	return new MailComposer({
		from,
		to: message.to,
		replyTo: message.replyTo,
		subject: message.subject,
		text: message.text,
		html: message.html,
		attachments: message.attachments,
	})
		.compile()
		.build();
}

/**
 * Send one message. Throws on any failure — the caller decides what a failed
 * send means, and for a clinical share it must never be swallowed.
 */
export async function sendGmail(message: GmailMessage): Promise<void> {
	const { impersonate, from } = addresses();
	const mime = await composeMime(from, message);

	const { token } = await jwtClient(impersonate).getAccessToken();
	if (!token) throw new Error('Could not obtain a Gmail access token');

	const response = await fetch(SEND_URL, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'message/rfc822',
		},
		body: new Uint8Array(mime),
	});

	if (!response.ok) {
		// Gmail's own body says which quota or scope failed; losing it turns
		// every misconfiguration into the same unhelpful 502 downstream.
		const detail = await response.text().catch(() => '');
		throw new Error(`Gmail send failed (${response.status}): ${detail.slice(0, 500)}`);
	}
}
