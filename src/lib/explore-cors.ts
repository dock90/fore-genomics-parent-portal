import { NextRequest, NextResponse } from 'next/server';

/**
 * CORS helpers for the Fore Explore endpoints.
 *
 * Explore is served from a different origin (explore.foregenomics.com) but the
 * same Clerk instance, so it calls these HH endpoints cross-origin with a Clerk
 * session token. We echo back only allow-listed origins and permit credentials.
 */
const ALLOWED_ORIGINS = [
	process.env.NEXT_PUBLIC_EXPLORE_URL || 'https://explore.foregenomics.com',
	'https://explore.foregenomics.com',
	'http://localhost:3001',
];

export function exploreCorsHeaders(origin: string | null): Record<string, string> {
	const allowed =
		origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
	return {
		'Access-Control-Allow-Origin': allowed,
		'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Authorization, Content-Type',
		'Access-Control-Allow-Credentials': 'true',
		'Access-Control-Max-Age': '3600',
		Vary: 'Origin',
	};
}

/** Response for a CORS preflight (OPTIONS) request. */
export function explorePreflight(request: NextRequest): NextResponse {
	return new NextResponse(null, {
		status: 204,
		headers: exploreCorsHeaders(request.headers.get('origin')),
	});
}

/** JSON response with the Explore CORS headers attached. */
export function exploreJson(
	request: NextRequest,
	body: unknown,
	status = 200
): NextResponse {
	return NextResponse.json(body, {
		status,
		headers: exploreCorsHeaders(request.headers.get('origin')),
	});
}
