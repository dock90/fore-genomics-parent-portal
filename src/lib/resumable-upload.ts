/**
 * Browser-side resumable upload to a Google Cloud Storage session URI.
 *
 * Used for whole-genome VCFs (200MB+) and anything else too large to send in one
 * request. The file goes straight from the browser to GCS — it never passes
 * through our server, so Vercel's request-body ceiling does not apply.
 *
 * The protocol, briefly:
 *   PUT <session>  Content-Range: bytes 0-33554431/209715200   → 308 (more to come)
 *   PUT <session>  Content-Range: bytes 33554432-.../209715200 → 308
 *   PUT <session>  Content-Range: bytes ...-209715199/209715200 → 200/201 (done)
 *
 * If a chunk fails we ask GCS how far it actually got (`bytes * /total` with an
 * empty body) and resume from there, so a dropped connection costs one chunk
 * rather than the whole transfer. A session stays valid for 7 days.
 */

/** Must be a multiple of 256KB. 32MB balances round-trips against retry cost. */
const CHUNK_SIZE = 32 * 1024 * 1024;
const MAX_ATTEMPTS_PER_CHUNK = 5;

export interface ResumableProgress {
	/** Bytes GCS has committed. */
	uploaded: number;
	total: number;
	/** 0–100, rounded. */
	percent: number;
}

export class ResumableUploadError extends Error {
	constructor(
		message: string,
		readonly status?: number
	) {
		super(message);
		this.name = 'ResumableUploadError';
	}
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Ask GCS how many bytes of this session are already committed.
 * Returns the next byte offset to send, or 'complete'.
 */
async function queryCommittedOffset(
	sessionUrl: string,
	total: number
): Promise<number | 'complete'> {
	const res = await fetch(sessionUrl, {
		method: 'PUT',
		headers: { 'Content-Range': `bytes */${total}` },
	});

	if (res.status === 200 || res.status === 201) return 'complete';
	if (res.status === 308) {
		const range = res.headers.get('Range');
		// No Range header means nothing has been committed yet.
		if (!range) return 0;
		// 'bytes=0-33554431' → next offset is 33554432
		const end = Number(range.split('-')[1]);
		return Number.isFinite(end) ? end + 1 : 0;
	}
	throw new ResumableUploadError(
		`Could not resume upload (status ${res.status})`,
		res.status
	);
}

/**
 * Upload `file` to an already-opened GCS resumable session.
 *
 * @param onProgress called after each committed chunk — safe to drive a progress bar.
 * @param signal     abort to cancel; the session can be resumed later from the same URI.
 */
export async function uploadResumable(
	file: File | Blob,
	sessionUrl: string,
	opts: {
		contentType?: string;
		onProgress?: (p: ResumableProgress) => void;
		signal?: AbortSignal;
	} = {}
): Promise<void> {
	const total = file.size;
	if (total === 0) throw new ResumableUploadError('File is empty');

	const report = (uploaded: number) =>
		opts.onProgress?.({
			uploaded,
			total,
			percent: Math.round((uploaded / total) * 100),
		});

	let offset = 0;
	// Per-chunk attempts reset when we resume at a new offset, so a chunk that
	// keeps failing could otherwise retry forever. This budget bounds the whole
	// transfer, and only resets when real forward progress is made.
	let retriesSinceProgress = 0;
	let furthestOffset = 0;
	const MAX_RETRIES_WITHOUT_PROGRESS = 12;

	while (offset < total) {
		if (opts.signal?.aborted) throw new ResumableUploadError('Upload canceled');
		if (offset > furthestOffset) {
			furthestOffset = offset;
			retriesSinceProgress = 0;
		}

		const end = Math.min(offset + CHUNK_SIZE, total);
		const chunk = file.slice(offset, end);
		const isLast = end === total;

		let attempt = 0;
		let committed = false;

		while (!committed) {
			attempt++;
			try {
				const res = await fetch(sessionUrl, {
					method: 'PUT',
					headers: {
						'Content-Range': `bytes ${offset}-${end - 1}/${total}`,
						...(opts.contentType ? { 'Content-Type': opts.contentType } : {}),
					},
					body: chunk,
					signal: opts.signal,
				});

				if (res.status === 308) {
					// Chunk accepted, more to send. Trust GCS's offset over our own.
					const range = res.headers.get('Range');
					const nextFromServer = range ? Number(range.split('-')[1]) + 1 : end;
					offset = Number.isFinite(nextFromServer) ? nextFromServer : end;
					committed = true;
					report(offset);
				} else if (res.status === 200 || res.status === 201) {
					if (!isLast) {
						// GCS finalized early — the byte count it received disagrees with
						// ours. Better to fail loudly than record a truncated genome.
						throw new ResumableUploadError(
							'Storage finalized the upload before all bytes were sent'
						);
					}
					offset = total;
					committed = true;
					report(total);
				} else if (res.status === 404 || res.status === 410) {
					// The session is gone (expired or canceled) and cannot be resumed.
					throw new ResumableUploadError(
						'Upload session expired. Please start the upload again.',
						res.status
					);
				} else if (res.status >= 500 || res.status === 429) {
					throw new ResumableUploadError(
						`Storage error ${res.status}`,
						res.status
					);
				} else {
					throw new ResumableUploadError(
						`Upload rejected (status ${res.status})`,
						res.status
					);
				}
			} catch (err) {
				if (opts.signal?.aborted)
					throw new ResumableUploadError('Upload canceled');

				const status =
					err instanceof ResumableUploadError ? err.status : undefined;
				// A dead session or an outright rejection will not get better by retrying.
				const fatal = status === 404 || status === 410 || (status !== undefined && status >= 400 && status < 500 && status !== 429);
				retriesSinceProgress++;
				if (
					fatal ||
					attempt >= MAX_ATTEMPTS_PER_CHUNK ||
					retriesSinceProgress >= MAX_RETRIES_WITHOUT_PROGRESS
				) {
					throw err instanceof Error
						? err
						: new ResumableUploadError(String(err));
				}

				// Transient: back off, re-establish where GCS actually is, and retry.
				await sleep(Math.min(1000 * 2 ** (attempt - 1), 15000));
				const resumeAt = await queryCommittedOffset(sessionUrl, total);
				if (resumeAt === 'complete') {
					offset = total;
					committed = true;
					report(total);
				} else {
					offset = resumeAt;
					// Recompute the chunk from the real offset on the next loop.
					break;
				}
			}
		}
	}
}
