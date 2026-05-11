/**
 * File access gate — the single source of truth for protocol file visibility.
 *
 * Every route that serves protocol file content must go through `authorizeFileRead`
 * before returning bytes. The gate is a pure function: token validation (invite
 * codes in D1, Stripe purchases in KV) happens at the route boundary and is
 * passed in as already-validated booleans. This keeps the policy in one place
 * and makes drift between routes impossible.
 *
 * Structural rule: if a new read route is added, it MUST call this function.
 * No content is served by any other path.
 */

// ---------------------------------------------------------------------------
// Internal test artifact filter
// ---------------------------------------------------------------------------
//
// Lifecycle / smoke / CI files are published by the same /file endpoint as
// real Author files, but they are infrastructure noise — they must never
// surface in Library directories, factory signal, or dashboards. Shared here
// so every consumer of `protocol_files` applies the same filter.

export const INTERNAL_PROTOCOL_FILE_PATTERNS: RegExp[] = [
  /^lifecycle-\d+$/,
  /^ci-smoke(?:-\d+)?$/,
  /^smoke-test$/,
  /^test-check$/,
];

export function isInternalProtocolFileName(name: string): boolean {
  return INTERNAL_PROTOCOL_FILE_PATTERNS.some((p) => p.test(name));
}

// ---------------------------------------------------------------------------
// Visibility gate
// ---------------------------------------------------------------------------

export type FileReadDecision =
  | { allowed: true; reason: 'public' | 'owner' | 'authors' | 'invite' | 'paid' }
  | { allowed: false; status: 401 | 402 | 403; reason: string; body: Record<string, unknown> };

export interface FileReadContext {
  /** Caller has validated a Stripe checkout session that grants access to THIS file. */
  purchaseValid?: boolean;
  /** Caller has validated an invite code that grants access to THIS author's files. */
  inviteValid?: boolean;
}

export interface AuthorizeFileReadOpts {
  visibility: string;
  /** Numeric github_id of the file's owner. Immutable; what protocol_files.account_id holds. */
  authorGithubId: string | number;
  /** Numeric github_id of the accessor, or null if unauthenticated. */
  accessorGithubId: string | number | null;
  context?: FileReadContext;
}

/**
 * Decide whether the accessor may read the file. Pure: no DB, no KV, no I/O.
 *
 * Order of checks (each visibility lands on exactly one branch):
 *   1. public          → anyone, no auth required
 *   2. owner           → file's own author always reads, regardless of visibility
 *   3. unauthenticated → everything below requires auth; deny with 401
 *   4. authors         → any authenticated Author
 *   5. invite          → context.inviteValid required
 *   6. paid            → context.purchaseValid required
 *   7. unknown         → fail closed with 403
 */
export function authorizeFileRead(opts: AuthorizeFileReadOpts): FileReadDecision {
  const v = opts.visibility;
  const accessorId = opts.accessorGithubId == null ? null : String(opts.accessorGithubId);
  const ownerId = String(opts.authorGithubId);
  const isAuthed = accessorId !== null;
  const isOwner = isAuthed && accessorId === ownerId;

  if (v === 'public') return { allowed: true, reason: 'public' };

  if (isOwner) return { allowed: true, reason: 'owner' };

  if (!isAuthed) {
    return {
      allowed: false,
      status: 401,
      reason: 'unauthenticated',
      body: { error: 'Sign in required', visibility: v },
    };
  }

  if (v === 'authors') return { allowed: true, reason: 'authors' };

  if (v === 'invite') {
    if (opts.context?.inviteValid) return { allowed: true, reason: 'invite' };
    return {
      allowed: false,
      status: 401,
      reason: 'invite_required',
      body: { error: 'Invite code required', visibility: 'invite' },
    };
  }

  if (v === 'paid') {
    if (opts.context?.purchaseValid) return { allowed: true, reason: 'paid' };
    return {
      allowed: false,
      status: 402,
      reason: 'payment_required',
      body: { error: 'Payment required for this file', visibility: 'paid' },
    };
  }

  return {
    allowed: false,
    status: 403,
    reason: 'unknown_visibility',
    body: { error: 'Access denied', visibility: v },
  };
}
