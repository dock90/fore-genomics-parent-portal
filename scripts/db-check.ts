/**
 * db-check.ts — read-only diagnostic. Tells you WHICH database your current
 * DATABASE_URL actually points at, and whether the two stale orders live there.
 * Writes nothing.
 *
 *   npx tsx scripts/db-check.ts
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';

function loadEnv(): void {
	for (const file of ['.env.local', '.env']) {
		const path = join(process.cwd(), file);
		if (!existsSync(path)) continue;
		for (const rawLine of readFileSync(path, 'utf8').split('\n')) {
			const line = rawLine.trim();
			if (!line || line.startsWith('#')) continue;
			const eq = line.indexOf('=');
			if (eq === -1) continue;
			const key = line.slice(0, eq).trim();
			if (!key || process.env[key] !== undefined) continue;
			let value = line.slice(eq + 1).trim();
			if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
				value = value.slice(1, -1);
			}
			process.env[key] = value;
		}
	}
}

async function main(): Promise<void> {
	loadEnv();
	const url = process.env.DATABASE_URL ?? '';
	const host = url.replace(/:[^:@/]+@/, ':****@').match(/@([^/]+)/)?.[1] ?? '(none)';
	const dbName = url.match(/\/([^/?]+)(\?|$)/)?.[1] ?? '(unknown)';
	console.log(`\nDATABASE_URL host : ${host}`);
	console.log(`Database name     : ${dbName}\n`);

	const prisma = new PrismaClient();
	try {
		const total = await prisma.order.count();
		console.log(`Total orders in this DB: ${total}\n`);

		console.log('10 most recent orders (orderNumber | status | createdAt):');
		const recent = await prisma.order.findMany({
			orderBy: { createdAt: 'desc' },
			take: 10,
			select: { orderNumber: true, status: true, createdAt: true },
		});
		for (const o of recent) {
			console.log(`  ${o.orderNumber}  |  ${o.status}  |  ${o.createdAt.toISOString().slice(0, 10)}`);
		}

		console.log('\nFuzzy search for the two target orders (contains match):');
		for (const frag of ['106870', '156510']) {
			const hits = await prisma.order.findMany({
				where: { orderNumber: { contains: frag } },
				select: { orderNumber: true, status: true },
			});
			console.log(`  "${frag}": ${hits.length ? hits.map((h) => `${h.orderNumber} (${h.status})`).join(', ') : 'NO MATCH'}`);
		}
		console.log('');
	} finally {
		await prisma.$disconnect();
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
