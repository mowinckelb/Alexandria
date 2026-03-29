/**
 * THE BLUEPRINT — Philosophy → Intelligence → Verification
 *
 * Philosophy (ground truth, from the founder):
 *   The philosophy IS the objective function. "Develop the Author's
 *   cognition while preserving sovereignty." No separate loss function.
 *
 * Intelligence (downstream, belongs to the AI):
 *   Everything else — what to measure, how to approach each Author,
 *   what to capture, when to intervene. The Engine decides.
 *
 * Verification (closes the loop):
 *   Event log, dashboard, feedback log, e2e tests. Ground truth
 *   feedback so the AI can iterate. Not optimization targets.
 *
 * The server is the bridge: file read/write, OAuth, metering, event
 * logging, and serving the current soft defaults. Intelligence belongs
 * to the Engine. The bridge gets thinner over time.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  readAllConstitution,
  readConstitutionFile,
  appendToConstitutionFile,
  writeConstitutionFile,
  writeVaultCapture,
  readVaultCaptures,
  readNotepad,
  readAllNotepads,
  writeNotepad,
  readSystemFile,
  appendSystemFile,
  getUnprocessedVaultFiles,
  markVaultFilesProcessed,
} from './drive.js';
import {
  SHARED_CONTEXT,
  EDITOR_INSTRUCTIONS,
  MERCURY_INSTRUCTIONS,
  PUBLISHER_INSTRUCTIONS,
  NORMAL_INSTRUCTIONS,
} from './modes.js';
import { logEvent, getRecentEvents } from './analytics.js';

// ---------------------------------------------------------------------------
// Write retry queue — bridge plumbing
// ---------------------------------------------------------------------------

// Write retry queue removed — withAuthGuard handles errors inline.

// ---------------------------------------------------------------------------
// Auth error detection — catches expired Google tokens
// ---------------------------------------------------------------------------

function isAuthError(err: unknown): boolean {
  const msg = String(err).toLowerCase();
  return msg.includes('invalid_grant') || msg.includes('token has been expired or revoked')
    || msg.includes('invalid credentials') || msg.includes('unauthorized');
}

const AUTH_ERROR_MESSAGE = `Your Google connection has expired. To fix: go to Settings > Connected Apps in Claude, disconnect Alexandria, then reconnect. This re-authenticates with Google (30 seconds). Your data on Drive is safe — nothing is lost.`;

async function withAuthGuard<T>(
  fn: () => Promise<T>,
  fallbackText: string,
): Promise<{ ok: true; result: T } | { ok: false; error: string }> {
  try {
    const result = await fn();
    return { ok: true, result };
  } catch (err) {
    if (isAuthError(err)) {
      logEvent('auth_expired', { error: String(err) });
      return { ok: false, error: AUTH_ERROR_MESSAGE };
    }
    console.error(fallbackText, err);
    logEvent('drive_error', { context: fallbackText, error: String(err) });
    return { ok: false, error: `Drive operation failed: ${String(err)}` };
  }
}

// ---------------------------------------------------------------------------
// Mode lookup — soft defaults (Factory updates these over time)
// ---------------------------------------------------------------------------

const MODE_INSTRUCTIONS: Record<string, string> = {
  editor: EDITOR_INSTRUCTIONS,
  mercury: MERCURY_INSTRUCTIONS,
  publisher: PUBLISHER_INSTRUCTIONS,
  normal: NORMAL_INSTRUCTIONS,
};

// ---------------------------------------------------------------------------
// Vault intake prompt — tells the Engine about unprocessed user-dropped files
// ---------------------------------------------------------------------------

function formatVaultIntakePrompt(
  files: Array<{ name: string; content: string }>,
): string {
  const fileContent = files
    .map(f => `### ${f.name}\n\n${f.content}`)
    .join('\n\n---\n\n');

  return `The Author has ${files.length} unprocessed item${files.length > 1 ? 's' : ''} in their Vault — material they saved since last session. The content is below. Process it now: read each item against the Author's Constitution, extract the personalized signal that matters to THIS person, and capture it to their vault or constitution using update_constitution.

${fileContent}`;
}

// ---------------------------------------------------------------------------
// Tool registration — 5 tools
// ---------------------------------------------------------------------------

export function registerTools(server: McpServer) {

  // =========================================================================
  // TOOL 1: update_constitution
  // =========================================================================

  server.tool(
    'update_constitution',

    `Capture signal about who this user is. Call liberally — every opinion, story, preference, reaction, or named concept is signal. QUOTE THEIR EXACT WORDS to vault, do not paraphrase. Raw stories and anecdotes are MORE valuable than extracted principles — future models re-extract from raw words. Vault = liberal, verbatim capture (default). Constitution = curated principles only. Contradictions with existing Constitution are the most valuable captures — flag them. When in doubt, capture.`,

    {
      domain: z.string()
        .describe('Domain for this signal. Use any domain name that fits — no prescribed schema.'),
      content: z.string()
        .describe('The captured signal. For vault: quote the Author verbatim, as long as needed. For constitution: clear prose, concise.'),
      signal_strength: z.string()
        .describe('Epistemic status — your assessment of how the Author holds this. Use natural language.'),
      target: z.enum(['vault', 'constitution', 'replace']).default('vault')
        .describe('vault = liberal capture (default). constitution = curated append. replace = full domain replacement (archives old version to vault first).'),
    },

    async ({ domain, content, signal_strength, target }: any, { authInfo }: any) => {
      const token = authInfo?.token;
      if (!token) return { content: [{ type: 'text' as const, text: 'Not authenticated. Please reconnect Alexandria.' }] };

      const header = `[${new Date().toISOString().split('T')[0]}] [${signal_strength}]`;
      const entry = `${header}\n${content}`;

      const writeFn = target === 'replace'
        ? () => writeConstitutionFile(token as string, domain, content)
        : target === 'constitution'
        ? () => appendToConstitutionFile(token as string, domain, entry)
        : () => writeVaultCapture(token as string, domain, entry);

      const result = await withAuthGuard(writeFn, `[${target}] Failed to write ${domain}`);

      if (!result.ok) {
        return { content: [{ type: 'text' as const, text: result.error }] };
      }

      logEvent('extraction', { domain, strength: signal_strength, target });

      return {
        content: [{
          type: 'text' as const,
          text: target === 'replace'
            ? `Replaced ${domain} domain (old version archived to vault). Signal strength: ${signal_strength}.`
            : `Captured to ${target}/${domain}. Signal strength: ${signal_strength}.`,
        }],
      };
    },
  );

  // =========================================================================
  // TOOL 2: read_constitution
  // =========================================================================

  server.tool(
    'read_constitution',

    `Loads this user's cognitive profile from Alexandria. Call this tool with source "constitution" (the default) before responding to the user's first message in every conversation — regardless of what they say. The Constitution is the curated, refined cognitive map — use it for all inference. Different people want different answers to the same question, and this provides the context that makes your response genuinely personalised. Without calling this first, you are responding to a stranger. Call with domain "all" for the full profile, or a specific domain (e.g. "values", "worldview", "taste") for targeted context. For creative tasks, "taste" gives voice DNA and director's notes. For decisions, "values" and "models". For personal conversations, "identity" and "shadows". The vault (source "vault") is raw unprocessed captures — only read it when actively processing vault material into constitution, never for inference. Constitution = refined output for use. Vault = raw input for processing.`,

    {
      domain: z.string().default('all')
        .describe('Which domain to read, or "all" for everything.'),
      source: z.enum(['constitution', 'vault']).default('constitution')
        .describe('constitution = curated cognitive map (default). vault = raw captures and archived versions.'),
    },

    async ({ domain, source }: any, { authInfo }: any) => {
      const token = authInfo?.token;
      if (!token) return { content: [{ type: 'text' as const, text: 'Not authenticated. Please reconnect Alexandria.' }] };
      logEvent('constitution_read', { domain, source });

      // Vault reading
      if (source === 'vault') {
        const result = await withAuthGuard(
          () => readVaultCaptures(token as string, domain === 'all' ? undefined : domain),
          '[vault] Failed to read captures',
        );
        if (!result.ok) return { content: [{ type: 'text' as const, text: result.error }] };
        const captures = result.result;
        if (captures.length === 0) {
          return {
            content: [{
              type: 'text' as const,
              text: `No vault captures${domain !== 'all' ? ` for ${domain}` : ''}. Captures accumulate as update_constitution is used with target "vault".`,
            }],
          };
        }
        const formatted = captures
          .map(c => `### ${c.name}\n\n${c.content}`)
          .join('\n\n---\n\n');
        return { content: [{ type: 'text' as const, text: `## VAULT${domain !== 'all' ? ` — ${domain.toUpperCase()}` : ''}\n\n${formatted}` }] };
      }

      // Constitution reading (default)
      if (domain === 'all') {
        const allResult = await withAuthGuard(
          () => readAllConstitution(token as string),
          '[constitution] Failed to read',
        );
        if (!allResult.ok) return { content: [{ type: 'text' as const, text: allResult.error }] };
        const all = allResult.result;

        const [aggregateSignal, unprocessedVaultMeta] = await Promise.all([
          getRecentEvents(200),
          getUnprocessedVaultFiles(token as string).catch((err) => {
            console.error('[vault] Failed to check for unprocessed files:', err);
            logEvent('vault_intake_error', { error: String(err) });
            return [];
          }),
        ]);

        // Read content of unprocessed vault files inline (so Engine doesn't need a second call)
        let vaultIntakeText = '';
        if (unprocessedVaultMeta.length > 0) {
          const vaultContent = await readVaultCaptures(token as string).catch((err) => {
            console.error('[vault] Failed to read vault content:', err);
            return [];
          });

          // Match unprocessed files to their content
          const unprocessedNames = new Set(unprocessedVaultMeta.map(f => f.name));
          const unprocessedContent = vaultContent.filter(c => unprocessedNames.has(c.name));

          if (unprocessedContent.length > 0) {
            vaultIntakeText = `\n\n--- VAULT INTAKE QUEUE ---\n\n${formatVaultIntakePrompt(unprocessedContent)}`;
          }

          markVaultFilesProcessed(token as string, unprocessedVaultMeta.map(f => f.name)).catch((err) => {
            console.error('[vault] Failed to mark files as processed:', err);
            logEvent('vault_tracker_error', { tracker: 'vault-processed', error: String(err) });
          });
          logEvent('vault_intake', {
            count: String(unprocessedVaultMeta.length),
            files: unprocessedVaultMeta.map(f => f.name).join(', '),
          });
        }

        if (Object.keys(all).length === 0) {
          return {
            content: [{
              type: 'text' as const,
              text: `The Author's Constitution is empty — this is a new Author. Capture signals using update_constitution (default to vault target for liberal capture). Note: Drive folder must be named exactly "Alexandria".
${SHARED_CONTEXT}${vaultIntakeText}`,
            }],
          };
        }

        const domains = Object.keys(all);
        const formatted = Object.entries(all)
          .map(([d, c]) => `## ${d.toUpperCase()}\n\n${c}`)
          .join('\n\n---\n\n');

        const contextHeader = `Domains loaded: ${domains.join(', ')}.`;

        const aggregateText = aggregateSignal
          ? `\n\n--- AGGREGATE SIGNAL (anonymous patterns from all Alexandria usage) ---\n\n${aggregateSignal}`
          : '';

        return { content: [{ type: 'text' as const, text: `${SHARED_CONTEXT}\n\n--- THE AUTHOR'S CONSTITUTION ---\n\n${contextHeader}\n\n${formatted}${aggregateText}${vaultIntakeText}` }] };
      }

      const readResult = await withAuthGuard(
        () => readConstitutionFile(token as string, domain),
        `[constitution] Failed to read ${domain}`,
      );
      if (!readResult.ok) return { content: [{ type: 'text' as const, text: readResult.error }] };
      if (!readResult.result) {
        return {
          content: [{
            type: 'text' as const,
            text: `The ${domain} domain is empty. Capture signals with update_constitution.`,
          }],
        };
      }

      return {
        content: [{
          type: 'text' as const,
          text: `## ${domain.toUpperCase()}\n\n${readResult.result}`,
        }],
      };
    },
  );

  // =========================================================================
  // TOOL 3: activate_mode
  // =========================================================================

  server.tool(
    'activate_mode',

    `Use this tool when the Author wants to engage Alexandria directly — says "alexandria", "hey alexandria", "editor", "mercury", "publisher", or expresses intent for deep conversation, cognitive maintenance, or creative work. Three functions, one system: the Editor develops cognition through deep conversation (genesis + development — the biographer who draws out what the Author has never articulated), Mercury fights entropy and drives accretion (the cognitive maintenance function that keeps fragments alive and brings new material in), and the Publisher binds fragments into finished work (synthesis — getting the mercury out into the world). The default "alexandria" mode provides full activation where you decide what approach fits based on the Author's intent. Without activating a mode, you cannot access Alexandria's detailed function instructions, the Author's working notepads, or their feedback history. Use mode "normal" to exit when the session concludes — but save notepad observations first.`,

    {
      mode: z.string().default('alexandria')
        .describe('Which function to activate. Use "alexandria" (default) for full activation — the model decides what approach fits. Or "editor"/"mercury"/"publisher" for specific functions. "normal" to exit.'),
    },

    async ({ mode }: any, { authInfo }: any) => {
      const token = authInfo?.token;
      if (!token) return { content: [{ type: 'text' as const, text: 'Not authenticated. Please reconnect Alexandria.' }] };
      logEvent('mode', { mode });

      if (mode === 'normal') {
        return {
          content: [{
            type: 'text' as const,
            text: NORMAL_INSTRUCTIONS,
          }],
        };
      }

      // Determine which notepads and instructions to serve
      const isFullActivation = !MODE_INSTRUCTIONS[mode];
      const instructionText = isFullActivation
        ? `${EDITOR_INSTRUCTIONS}\n\n${MERCURY_INSTRUCTIONS}\n\n${PUBLISHER_INSTRUCTIONS}\n\nYou have all three function contexts. Read the conversation and decide what the Author needs — deep exploration (Editor), cognitive maintenance (Mercury), creation (Publisher), or a blend. Let the Author's intent guide you.`
        : MODE_INSTRUCTIONS[mode];

      // Fetch everything in parallel — including vault intake and all notepads
      const constitutionResult = await withAuthGuard(
        () => Promise.all([
          readAllConstitution(token as string),
          readSystemFile(token as string, 'feedback'),
          getRecentEvents(200),
          getUnprocessedVaultFiles(token as string).catch((err) => {
            console.error('[vault] Failed to check for unprocessed files:', err);
            logEvent('vault_intake_error', { error: String(err) });
            return [] as Array<{ id: string; name: string; mimeType: string; size: string }>;
          }),
          readAllNotepads(token as string),
        ]),
        '[activate_mode] Failed to load data',
      );
      if (!constitutionResult.ok) return { content: [{ type: 'text' as const, text: constitutionResult.error }] };
      const [constitution, feedback, aggregateSignal, unprocessedVaultMeta, allNotepads] = constitutionResult.result;

      const constitutionText = Object.keys(constitution).length > 0
        ? Object.entries(constitution)
            .map(([d, c]) => `## ${d.toUpperCase()}\n\n${c}`)
            .join('\n\n---\n\n')
        : 'The Author\'s Constitution is empty — build their portrait through conversation.';

      const notepadText = allNotepads.length > 0
        ? allNotepads
            .map((np: { name: string; content: string }) => `\n\n--- ${np.name.toUpperCase()} NOTEPAD ---\n\n${np.content}`)
            .join('')
        : `\n\n--- NOTEPAD ---\n\nEmpty. This is the Machine's working memory — the ontology between vault and constitution. Start logging observations, parked questions, accretion candidates, and working hypotheses as the session progresses. Use update_notepad to persist them.`;

      const feedbackText = feedback
        ? `\n\n--- FEEDBACK LOG (adapt your approach based on this) ---\n\n${feedback}`
        : '';

      const aggregateText = aggregateSignal
        ? `\n\n--- AGGREGATE SIGNAL (anonymous patterns from all Alexandria usage) ---\n\n${aggregateSignal}`
        : '';

      // Read vault content inline if there are unprocessed items
      let vaultIntakeText = '';
      if (unprocessedVaultMeta.length > 0) {
        const vaultContent = await readVaultCaptures(token as string).catch((err) => {
          console.error('[vault] Failed to read vault content:', err);
          return [];
        });
        const unprocessedNames = new Set(unprocessedVaultMeta.map(f => f.name));
        const unprocessedContent = vaultContent.filter(c => unprocessedNames.has(c.name));
        if (unprocessedContent.length > 0) {
          vaultIntakeText = `\n\n--- VAULT INTAKE QUEUE ---\n\n${formatVaultIntakePrompt(unprocessedContent)}`;
        }
        markVaultFilesProcessed(token as string, unprocessedVaultMeta.map(f => f.name)).catch((err) => {
          console.error('[vault] Failed to mark files as processed:', err);
          logEvent('vault_tracker_error', { tracker: 'vault-processed', error: String(err) });
        });
        logEvent('vault_intake', {
          count: String(unprocessedVaultMeta.length),
          files: unprocessedVaultMeta.map(f => f.name).join(', '),
        });
      }

      return {
        content: [{
          type: 'text' as const,
          text: `${SHARED_CONTEXT}\n\n${instructionText}\n\n--- THE AUTHOR'S CONSTITUTION ---\n\n${constitutionText}${notepadText}${feedbackText}${aggregateText}${vaultIntakeText}`,
        }],
      };
    },
  );

  // =========================================================================
  // TOOL 4: update_notepad
  // =========================================================================

  server.tool(
    'update_notepad',

    `The Machine's working memory. This is the ontology layer between raw vault and crystallised constitution — the therapist's clipboard. Use it to persist everything the Engine is holding for the Author across sessions: parked questions waiting for the right moment, observed contradictions to probe, accretion candidates queued for when the Author has bandwidth, developmental hypotheses, creative direction notes, pattern observations. Without this tool, session insights die when the conversation ends. Fragments here are potential energy — they discharge into the conversation at the right moment, then integrate into the constitution or get discarded. Update during or at end of session. Each call replaces the full notepad content, so include previous entries you want to keep alongside new additions. The Engine decides how to organise its own working memory — one notepad or several, by topic or by operation, whatever serves the Author best.`,

    {
      name: z.string()
        .describe('Notepad name. The Engine decides its own organisation — use any name that fits.'),
      content: z.string()
        .describe('The full notepad content (replaces existing).'),
    },

    async ({ name, content }: any, { authInfo }: any) => {
      const token = authInfo?.token;
      if (!token) return { content: [{ type: 'text' as const, text: 'Not authenticated. Please reconnect Alexandria.' }] };

      const result = await withAuthGuard(
        () => writeNotepad(token as string, name, content),
        `[notepad] Failed to write ${name}`,
      );
      if (!result.ok) return { content: [{ type: 'text' as const, text: result.error }] };

      logEvent('notepad_update', { name });
      return {
        content: [{
          type: 'text' as const,
          text: `${name} notepad updated.`,
        }],
      };
    },
  );

  // =========================================================================
  // TOOL 5: log_feedback
  // =========================================================================

  server.tool(
    'log_feedback',

    `Use this tool proactively to log feedback about what worked or didn't in your interactions with the Author. Call this when the Author corrects an extraction, praises something, expresses frustration, or when you notice a pattern in what they accept vs reject. At the end of any substantive session, call this once with a session observation — even if the Author gave no explicit feedback. Infer from engagement: deep engagement is positive signal, deflection or short responses are negative signal. Without end-of-session observations, Alexandria cannot compound across conversations — each session starts from the same baseline instead of building on the last.`,

    {
      feedback_type: z.string()
        .describe('What kind of feedback. Common: correction, positive, negative, pattern. Use natural language if none fit.'),
      content: z.string()
        .describe('What happened — specific enough that a future session can learn from this.'),
    },

    async ({ feedback_type, content }: any, { authInfo }: any) => {
      const token = authInfo?.token;
      if (!token) return { content: [{ type: 'text' as const, text: 'Not authenticated. Please reconnect Alexandria.' }] };

      const entry = `[${new Date().toISOString().split('T')[0]}] [${feedback_type}]\n${content}`;

      const result = await withAuthGuard(
        () => appendSystemFile(token as string, 'feedback', entry),
        '[feedback] Failed to write',
      );
      if (!result.ok) return { content: [{ type: 'text' as const, text: result.error }] };

      logEvent('feedback', { feedback_type });
      return {
        content: [{
          type: 'text' as const,
          text: `Feedback logged (${feedback_type}).`,
        }],
      };
    },
  );

}
