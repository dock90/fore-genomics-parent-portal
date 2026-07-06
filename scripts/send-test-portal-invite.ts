/**
 * send-test-portal-invite.ts
 * ---------------------------------------------------------------------------
 * Sends a Health Hub portal invite (Clerk invitation) to a single email,
 * mirroring exactly what the app's `sendParentPortalInvite` / admin
 * create-order flow does. Use it to test the deferred-invite feature without
 * having to click through the UI.
 *
 * It calls the same Clerk endpoint with the same publicMetadata
 * ({ role: 'PARENT', createdByAdmin: true }) and the configured invitation
 * redirect URL, so the email and sign-up experience match production.
 *
 * It then fires the Klaviyo "Invite Sent" event with the invite_url (the same
 * metric + properties as src/lib/klaviyo.ts trackInviteSent), so this is a true
 * end-to-end test of the new invite-triggered flow — not just a Clerk invite.
 * Requires KLAVIYO_PRIVATE_API_KEY in .env.local for the event to fire.
 *
 * NOTE: this hits Clerk's live API using CLERK_SECRET_KEY from .env.local.
 * On a `sk_test_…` key this targets your Clerk *development* instance.
 *
 * ---------------------------------------------------------------------------
 * USAGE (run from the project root so .env.local is found):
 *
 *   # Dry run — shows what would be sent, sends nothing:
 *   npx tsx scripts/send-test-portal-invite.ts --email kcarpdev@gmail.com
 *
 *   # Actually send the invite email:
 *   npx tsx scripts/send-test-portal-invite.ts --email kcarpdev@gmail.com --commit
 * ---------------------------------------------------------------------------
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// ── Minimal .env loader (project has no `dotenv` dependency) ────────────────
function loadEnv(): void {
	for (const file of ['.env.local', '.env']) {
		const path = join(process.cwd(), file);
		if (!existsSync(path)) continue;
		const contents = readFileSync(path, 'utf8');
		for (const rawLine of contents.split('\n')) {
			const line = rawLine.trim();
			if (!line || line.startsWith('#')) continue;
			const eq = line.indexOf('=');
			if (eq === -1) continue;
			const key = line.slice(0, eq).trim();
			if (!key || process.env[key] !== undefined) continue;
			let value = line.slice(eq + 1).trim();
			if (
				(value.startsWith('"') && value.endsWith('"')) ||
				(value.startsWith("'") && value.endsWith("'"))
			) {
				value = value.slice(1, -1);
			}
			process.env[key] = value;
		}
	}
}

function parseArgs(argv: string[]): { email?: string; commit: boolean } {
	let email: string | undefined;
	let commit = false;
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === '--commit') commit = true;
		else if (arg === '--email') email = argv[++i];
		else if (arg.startsWith('--email=')) email = arg.slice('--email='.length);
	}
	return { email, commit };
}

async function main() {
	loadEnv();

	const { email, commit } = parseArgs(process.argv.slice(2));

	if (!email) {
		console.error('Missing --email. Example:');
		console.error(
			'  npx tsx scripts/send-test-portal-invite.ts --email kcarpdev@gmail.com --commit'
		);
		process.exit(1);
	}

	const secretKey = process.env.CLERK_SECRET_KEY;
	if (!secretKey) {
		console.error('CLERK_SECRET_KEY not found in environment / .env.local');
		process.exit(1);
	}

	const redirectUrl = process.env.NEXT_PUBLIC_CLERK_INVITATION_REDIRECT_URL;

	// Identical shape to the app's invitation calls.
	const body: Record<string, unknown> = {
		email_address: email,
		public_metadata: { role: 'PARENT', createdByAdmin: true },
		notify: true,
		ignore_existing: true,
	};
	if (redirectUrl) body.redirect_url = redirectUrl;

	const instance = secretKey.startsWith('sk_test_')
		? 'development (sk_test_)'
		: secretKey.startsWith('sk_live_')
			? 'PRODUCTION (sk_live_) ⚠️'
			: 'unknown';

	console.log('Clerk instance :', instance);
	console.log('Invite email   :', email);
	console.log('redirect_url   :', redirectUrl || '(none — Clerk default)');
	console.log('public_metadata:', JSON.stringify(body.public_metadata));

	if (!commit) {
		console.log('\nDRY RUN — nothing sent.');
		console.log('With --commit this will:');
		console.log('  1) create the Clerk invite + send the invite email, and');
		console.log('  2) fire the Klaviyo "Invite Sent" event with the invite_url.');
		return;
	}

	const res = await fetch('https://api.clerk.com/v1/invitations', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${secretKey}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(body),
	});

	const json: any = await res.json();
	if (!res.ok) {
		console.error(`\n❌ Clerk error (HTTP ${res.status}):`);
		console.error(JSON.stringify(json, null, 2));
		process.exit(1);
	}

	console.log('\n✅ Invitation sent.');
	console.log('  id     :', json.id);
	console.log('  email  :', json.email_address);
	console.log('  status :', json.status);

	const inviteUrl: string | undefined = json.url;
	console.log('  url    :', inviteUrl || '(none returned)');

	// Mirror production: fire the Klaviyo "Invite Sent" event with the invite_url,
	// using the same metric + properties as src/lib/klaviyo.ts trackInviteSent().
	// This is what lands the invite_url property in Klaviyo for the flow email.
	const klaviyoKey = process.env.KLAVIYO_PRIVATE_API_KEY;
	if (!klaviyoKey) {
		console.warn(
			'\n⚠️  KLAVIYO_PRIVATE_API_KEY not set — Clerk invite sent, but the "Invite Sent" event was NOT fired.'
		);
		return;
	}

	const evtRes = await fetch('https://a.klaviyo.com/api/events/', {
		method: 'POST',
		headers: {
			Authorization: `Klaviyo-API-Key ${klaviyoKey}`,
			revision: '2024-10-15',
			'Content-Type': 'application/json',
			accept: 'application/json',
		},
		body: JSON.stringify({
			data: {
				type: 'event',
				attributes: {
					metric: { data: { type: 'metric', attributes: { name: 'Invite Sent' } } },
					profile: { data: { type: 'profile', attributes: { email } } },
					properties: {
						order_id: null,
						order_number: null,
						invite_url: inviteUrl ?? null,
						test: true,
					},
					time: new Date().toISOString(),
				},
			},
		}),
	});

	if (evtRes.ok || evtRes.status === 202) {
		console.log('\n✅ Klaviyo "Invite Sent" event fired (with invite_url).');
	} else {
		const evtErr = await evtRes.text();
		console.error(`\n❌ Klaviyo error (HTTP ${evtRes.status}):`);
		console.error(evtErr);
		process.exit(1);
	}
}

main().catch((err) => {
	console.error('Failed to send invite:', err);
	process.exit(1);
});
