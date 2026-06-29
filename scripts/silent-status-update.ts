/**
 * silent-status-update.ts
 * ---------------------------------------------------------------------------
 * One-off / back-office maintenance script to correct the status of stale or
 * incorrect orders WITHOUT triggering any customer-facing side effects.
 *
 * Unlike the admin "Save Changes" button (which runs the `updateOrderStatus`
 * server action and fires Klaviyo customer emails, the admin notification
 * email, and a Slack post), this script writes the status change straight to
 * the database via Prisma. It sends NO emails and posts NOTHING to Slack.
 * It still writes a STATUS_CHANGE audit-log row so the change is traceable.
 *
 * SAFETY: dry-run by default. Nothing is written unless you pass --commit.
 *
 * ---------------------------------------------------------------------------
 * USAGE (run from the project root so .env.local is found):
 *
 *   # Preview only (no writes):
 *   npx tsx scripts/silent-status-update.ts \
 *     --set ORD-106870-663=COMPLETE_NO_COUNSELING_REQUIRED \
 *     --set ORD-156510-061=RECEIVED_IN_PROCESS
 *
 *   # Actually apply the changes:
 *   npx tsx scripts/silent-status-update.ts \
 *     --set ORD-106870-663=COMPLETE_NO_COUNSELING_REQUIRED --commit
 *
 * OPTIONS:
 *   --set ORDER_NUMBER=STATUS   Repeatable. Order number (the unique
 *                               orderNumber, e.g. ORD-106870-663) = target
 *                               status (one of the OrderStatus enum values).
 *   --commit                    Apply the changes. Omit for a dry run.
 *   --actor <email>             Email recorded as the actor in the audit log.
 *                               Default: silent-status-update-script.
 *   --keep-timestamp            Do NOT bump statusUpdatedAt to now; keep the
 *                               existing value. Default is to set it to now.
 *   --help                      Show this help.
 *
 * Valid OrderStatus values:
 *   ORDER_RECEIVED, ONBOARDING_COMPLETED, PREPARING_ORDER, SHIPPED_TO_USER,
 *   DELIVERED_AWAITING_RETURN, SHIPPED_TO_LAB, RECEIVED_IN_PROCESS,
 *   RESAMPLE_REQUIRED, COMPLETE_REPORT_DELIVERED,
 *   COMPLETE_COUNSELING_REQUIRED, COMPLETE_NO_COUNSELING_REQUIRED
 * ---------------------------------------------------------------------------
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient, OrderStatus } from '@prisma/client';

// ── Minimal .env loader (project has no `dotenv` dependency) ────────────────
// Loads .env.local then .env from the current working directory. Existing
// process.env values always win, so you can still override on the CLI.
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

const VALID_STATUSES = Object.values(OrderStatus) as string[];

interface Change {
	orderNumber: string;
	status: OrderStatus;
}

interface ParsedArgs {
	changes: Change[];
	commit: boolean;
	actor: string;
	keepTimestamp: boolean;
	help: boolean;
	errors: string[];
}

function parseArgs(argv: string[]): ParsedArgs {
	const changes: Change[] = [];
	const errors: string[] = [];
	let commit = false;
	let keepTimestamp = false;
	let help = false;
	let actor = 'silent-status-update-script';

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		switch (arg) {
			case '--help':
			case '-h':
				help = true;
				break;
			case '--commit':
				commit = true;
				break;
			case '--keep-timestamp':
				keepTimestamp = true;
				break;
			case '--actor':
				actor = argv[++i] ?? actor;
				break;
			case '--set': {
				const pair = argv[++i];
				if (!pair || !pair.includes('=')) {
					errors.push(`--set expects ORDER_NUMBER=STATUS, got: ${pair ?? '(nothing)'}`);
					break;
				}
				const idx = pair.indexOf('=');
				const orderNumber = pair.slice(0, idx).trim();
				const statusRaw = pair.slice(idx + 1).trim().toUpperCase();
				if (!orderNumber) {
					errors.push(`--set is missing an order number: ${pair}`);
					break;
				}
				if (!VALID_STATUSES.includes(statusRaw)) {
					errors.push(
						`Invalid status "${statusRaw}" for order ${orderNumber}. ` +
							`Valid values: ${VALID_STATUSES.join(', ')}`
					);
					break;
				}
				changes.push({ orderNumber, status: statusRaw as OrderStatus });
				break;
			}
			default:
				errors.push(`Unknown argument: ${arg}`);
		}
	}

	return { changes, commit, actor, keepTimestamp, help, errors };
}

function printHelp(): void {
	// The block comment at the top of this file is the canonical help text.
	console.log(
		[
			'',
			'silent-status-update.ts — correct stale/incorrect order statuses with NO',
			'customer emails and NO Slack posts. Dry-run by default.',
			'',
			'Usage (from project root):',
			'  npx tsx scripts/silent-status-update.ts --set ORDER=STATUS [--set ...] [--commit]',
			'',
			'Options:',
			'  --set ORDER=STATUS   Repeatable. e.g. --set ORD-106870-663=RECEIVED_IN_PROCESS',
			'  --commit             Apply changes (omit for a dry run)',
			'  --actor <email>      Audit-log actor (default: silent-status-update-script)',
			'  --keep-timestamp     Keep existing statusUpdatedAt (default bumps to now)',
			'  --help               Show this help',
			'',
			'Valid statuses:',
			'  ' + VALID_STATUSES.join(', '),
			'',
		].join('\n')
	);
}

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));

	if (args.help) {
		printHelp();
		process.exit(0);
	}

	if (args.errors.length > 0) {
		console.error('\n✖ Argument errors:');
		for (const e of args.errors) console.error('  - ' + e);
		console.error('\nRun with --help for usage.\n');
		process.exit(1);
	}

	if (args.changes.length === 0) {
		console.error('\n✖ Nothing to do: pass at least one --set ORDER=STATUS.\n');
		printHelp();
		process.exit(1);
	}

	loadEnv();
	if (!process.env.DATABASE_URL) {
		console.error(
			'\n✖ DATABASE_URL is not set. Run this from the project root (so .env.local ' +
				'is picked up) or export DATABASE_URL before running.\n'
		);
		process.exit(1);
	}

	const mode = args.commit ? 'COMMIT (writing changes)' : 'DRY RUN (no changes will be written)';
	console.log(`\n=== Silent status update — ${mode} ===`);
	console.log(`Actor: ${args.actor}`);
	console.log(`statusUpdatedAt: ${args.keepTimestamp ? 'kept as-is' : 'set to now'}\n`);

	const prisma = new PrismaClient();
	let applied = 0;
	let skipped = 0;
	let failed = 0;

	try {
		for (const change of args.changes) {
			const order = await prisma.order.findUnique({
				where: { orderNumber: change.orderNumber },
				select: { id: true, orderNumber: true, status: true, statusUpdatedAt: true },
			});

			if (!order) {
				console.error(`✖ ${change.orderNumber}: not found — skipping`);
				failed++;
				continue;
			}

			if (order.status === change.status) {
				console.log(
					`• ${order.orderNumber}: already ${order.status} — no change`
				);
				skipped++;
				continue;
			}

			const arrow = `${order.status} → ${change.status}`;

			if (!args.commit) {
				console.log(`~ ${order.orderNumber}: WOULD CHANGE ${arrow}`);
				applied++;
				continue;
			}

			await prisma.order.update({
				where: { id: order.id },
				data: {
					status: change.status,
					...(args.keepTimestamp ? {} : { statusUpdatedAt: new Date() }),
				},
			});

			await prisma.auditLog.create({
				data: {
					orderId: order.id,
					action: 'STATUS_CHANGE',
					userEmail: args.actor,
					details: {
						from: order.status,
						to: change.status,
						silent: true,
						via: 'silent-status-update script',
					},
				},
			});

			console.log(`✓ ${order.orderNumber}: CHANGED ${arrow}`);
			applied++;
		}
	} finally {
		await prisma.$disconnect();
	}

	console.log('\n=== Summary ===');
	console.log(`  ${args.commit ? 'Changed' : 'Would change'}: ${applied}`);
	console.log(`  Skipped (already correct): ${skipped}`);
	console.log(`  Failed (not found): ${failed}`);
	if (!args.commit && applied > 0) {
		console.log('\nThis was a DRY RUN. Re-run with --commit to apply the changes above.');
	}
	console.log('');

	process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
	console.error('\n✖ Unexpected error:', err);
	process.exit(1);
});
