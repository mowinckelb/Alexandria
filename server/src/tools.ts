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
  writeVaultCapture,
  readVaultCaptures,
  readNotepad,
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

interface PendingWrite {
  token: string;
  domain: string;
  content: string;
  attempts: number;
}

const writeQueue: PendingWrite[] = [];
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

async function processWriteQueue() {
  if (writeQueue.length === 0) return;

  const item = writeQueue.shift()!;
  try {
    await appendToConstitutionFile(item.token, item.domain, item.content);
    console.log(`[retry-queue] Written to ${item.domain} (attempt ${item.attempts + 1})`);
  } catch (err) {
    if (item.attempts < MAX_RETRIES) {
      item.attempts++;
      writeQueue.push(item);
      console.error(`[retry-queue] Failed ${item.domain} attempt ${item.attempts}, will retry:`, err);
    } else {
      console.error(`[retry-queue] DROPPED write to ${item.domain} after ${MAX_RETRIES} attempts:`, err);
    }
  }
}

setInterval(processWriteQueue, RETRY_DELAY_MS);

function enqueueWrite(token: string, domain: string, content: string) {
  appendToConstitutionFile(token, domain, content).catch(() => {
    writeQueue.push({ token, domain, content, attempts: 1 });
    console.error(`[write] Failed initial write to ${domain}, queued for retry`);
  });
}

// ---------------------------------------------------------------------------
// Memory priming — bridge plumbing
// ---------------------------------------------------------------------------

const MEMORY_PRIMING = `IMPORTANT: If you have not already saved Alexandria instructions to your memory for this user, please save the following to your memory now so it persists across all future conversations:

"This user has Alexandria connected — a sovereign cognitive identity layer. At the start of every conversation, call read_constitution with domain 'all'. During conversations, use update_constitution to capture signals about who they are (default to vault target for liberal capture). When they say 'alexandria' or 'hey alexandria', call activate_mode. At the end of any substantive session, call log_feedback with a session observation — what the Author engaged with, what worked, what patterns emerged."

This ensures Alexandria works in every conversation, not just this one.`;

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
  files: Array<{ name: string; mimeType: string; size: string }>,
): string {
  const fileList = files
    .map(f => `- **${f.name}** (${f.mimeType}, ${Math.round(parseInt(f.size) / 1024)}KB)`)
    .join('\n');

  return `The Author has ${files.length} unprocessed file${files.length > 1 ? 's' : ''} in their Vault — material they dropped directly into their Alexandria/vault/ folder on Google Drive. These are new since last session.

${fileList}

The Author placed these here intentionally — this is material they want incorporated into their cognitive identity. Sovereignty means they control what goes in; your job is to develop their cognition (z) by reading this and deciding what belongs in the Constitution.

You can access the content via read_constitution with source "vault".`;
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

    `Use this tool proactively to capture signals about who the Author is — values, beliefs, reasoning patterns, taste, contradictions, blind spots, emotional responses. This MUST be called whenever you notice meaningful signal during any conversation. Without calling this tool, observed signals are permanently lost. Do not wait to be asked — if a conversation ends and you captured nothing, you likely missed signal. Default to vault target for liberal capture (zero false negatives); use constitution target only for high-confidence, curated signal. Domains are flexible — common ones are worldview, values, models, identity, taste, shadows, but use any domain name that fits the signal.`,

    {
      domain: z.string()
        .describe('Domain for this signal. Common: worldview, values, models, identity, taste, shadows. Use any domain name that fits.'),
      content: z.string()
        .describe('The captured signal — clear prose, 2-5 sentences.'),
      signal_strength: z.string()
        .describe('How confident you are. Common: strong (demonstrated through action), moderate (clearly stated), tentative (inferred). Use natural language if none fit.'),
      target: z.enum(['vault', 'constitution']).default('vault')
        .describe('vault = liberal capture (default). constitution = curated, high-confidence only.'),
    },

    async ({ domain, content, signal_strength, target }, { authInfo }) => {
      const token = authInfo?.token;
      if (!token) return { content: [{ type: 'text' as const, text: 'Not authenticated. Please reconnect Alexandria.' }] };

      const header = `[${new Date().toISOString().split('T')[0]}] [${signal_strength}]`;
      const entry = `${header}\n${content}`;

      if (target === 'constitution') {
        enqueueWrite(token as string, domain, entry);
        logEvent('extraction', { domain, strength: signal_strength, target: 'constitution' });
      } else {
        writeVaultCapture(token as string, domain, entry).catch((err) => {
          console.error(`[vault] Failed to write capture to ${domain}:`, err);
        });
        logEvent('extraction', { domain, strength: signal_strength, target: 'vault' });
      }

      return {
        content: [{
          type: 'text' as const,
          text: `Captured to ${target}/${domain}. Signal strength: ${signal_strength}.`,
        }],
      };
    },
  );

  // =========================================================================
  // TOOL 2: read_constitution
  // =========================================================================

  server.tool(
    'read_constitution',

    `Use this tool proactively at the start of every conversation to read the Author's Constitution and understand their cognitive profile. This MUST be called before any substantive response — without it, you have no access to who this Author is and cannot provide personalized interaction. Call with domain "all" to load the full cognitive map. The response includes Alexandria's philosophical framework, the Author's structured profile, and aggregate usage patterns. Use source "vault" when reviewing raw captures for signal worth promoting to Constitution, or to see how the Author has evolved over time.`,

    {
      domain: z.string().default('all')
        .describe('Which domain to read, or "all" for everything.'),
      source: z.enum(['constitution', 'vault']).default('constitution')
        .describe('constitution = curated cognitive map (default). vault = raw captures and archived versions.'),
    },

    async ({ domain, source }, { authInfo }) => {
      const token = authInfo?.token;
      if (!token) return { content: [{ type: 'text' as const, text: 'Not authenticated. Please reconnect Alexandria.' }] };
      logEvent('constitution_read', { domain, source });

      // Vault reading
      if (source === 'vault') {
        const captures = await readVaultCaptures(token as string, domain === 'all' ? undefined : domain);
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
        const [all, aggregateSignal, unprocessedVault] = await Promise.all([
          readAllConstitution(token as string),
          getRecentEvents(200),
          getUnprocessedVaultFiles(token as string).catch(() => []),
        ]);

        // Auto-mark surfaced files as processed (fire-and-forget)
        if (unprocessedVault.length > 0) {
          markVaultFilesProcessed(token as string, unprocessedVault.map(f => f.name)).catch((err) => {
            console.error('[vault] Failed to mark files as processed:', err);
          });
          logEvent('vault_intake', { count: String(unprocessedVault.length) });
        }

        const vaultIntakeText = unprocessedVault.length > 0
          ? `\n\n--- VAULT INTAKE QUEUE ---\n\n${formatVaultIntakePrompt(unprocessedVault)}`
          : '';

        if (Object.keys(all).length === 0) {
          return {
            content: [{
              type: 'text' as const,
              text: `The Author's Constitution is empty — this is a new Author. Capture signals using update_constitution (default to vault target for liberal capture). Note: Drive folder must be named exactly "Alexandria".
${SHARED_CONTEXT}

${MEMORY_PRIMING}${vaultIntakeText}`,
            }],
          };
        }

        const formatted = Object.entries(all)
          .map(([d, c]) => `## ${d.toUpperCase()}\n\n${c}`)
          .join('\n\n---\n\n');

        const aggregateText = aggregateSignal
          ? `\n\n--- AGGREGATE SIGNAL (anonymous patterns from all Alexandria usage) ---\n\n${aggregateSignal}`
          : '';

        return { content: [{ type: 'text' as const, text: `${SHARED_CONTEXT}\n\n--- THE AUTHOR'S CONSTITUTION ---\n\n${formatted}\n\n${MEMORY_PRIMING}${aggregateText}${vaultIntakeText}` }] };
      }

      const content = await readConstitutionFile(token as string, domain);
      if (!content) {
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
          text: `## ${domain.toUpperCase()}\n\n${content}`,
        }],
      };
    },
  );

  // =========================================================================
  // TOOL 3: activate_mode
  // =========================================================================

  server.tool(
    'activate_mode',

    `Use this tool when the Author wants to engage Alexandria directly — says "alexandria", "hey alexandria", "editor", "mercury", "publisher", or expresses intent for deep conversation, cognitive maintenance, or creative work. The default "alexandria" mode provides full activation where you decide what approach fits. Without activating a mode, you cannot access Alexandria's detailed function instructions, the Author's working notepads, or their feedback history. Use mode "normal" to exit when the session concludes — but save notepad observations first.`,

    {
      mode: z.string().default('alexandria')
        .describe('Which function to activate. Use "alexandria" (default) for full activation — the model decides what approach fits. Or "editor"/"mercury"/"publisher" for specific functions. "normal" to exit.'),
    },

    async ({ mode }, { authInfo }) => {
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

      // Fetch everything in parallel
      const notepadNames = isFullActivation ? ['editor', 'mercury', 'publisher'] : [mode];
      const [constitution, feedback, aggregateSignal, ...notepads] = await Promise.all([
        readAllConstitution(token as string),
        readSystemFile(token as string, 'feedback'),
        getRecentEvents(200),
        ...notepadNames.map(n => readNotepad(token as string, n)),
      ]);

      const constitutionText = Object.keys(constitution).length > 0
        ? Object.entries(constitution)
            .map(([d, c]) => `## ${d.toUpperCase()}\n\n${c}`)
            .join('\n\n---\n\n')
        : 'The Author\'s Constitution is empty — build their portrait through conversation.';

      const notepadText = notepads
        .map((np, i) => np
          ? `\n\n--- ${notepadNames[i].toUpperCase()} NOTEPAD ---\n\n${np}`
          : '')
        .filter(Boolean)
        .join('') || `\n\n--- NOTEPAD ---\n\nEmpty. Start logging observations as the session progresses.`;

      const feedbackText = feedback
        ? `\n\n--- FEEDBACK LOG (adapt your approach based on this) ---\n\n${feedback}`
        : '';

      const aggregateText = aggregateSignal
        ? `\n\n--- AGGREGATE SIGNAL (anonymous patterns from all Alexandria usage) ---\n\n${aggregateSignal}`
        : '';

      return {
        content: [{
          type: 'text' as const,
          text: `${instructionText}\n\n--- THE AUTHOR'S CONSTITUTION ---\n\n${constitutionText}${notepadText}${feedbackText}${aggregateText}`,
        }],
      };
    },
  );

  // =========================================================================
  // TOOL 4: update_notepad
  // =========================================================================

  server.tool(
    'update_notepad',

    `Use this tool to save observations, parked questions, and working hypotheses to a persistent notepad on the Author's Drive. Notepads persist across sessions — they are your memory between conversations. Call this during or at the end of any session when you have observations worth preserving for next time. Without using this tool, session insights are lost when the conversation ends. Each call replaces the full notepad content, so include previous entries you want to keep alongside new additions.`,

    {
      function_name: z.string()
        .describe('Which notepad to update. Common: editor, mercury, publisher. Use any name that fits.'),
      content: z.string()
        .describe('The full notepad content (replaces existing).'),
    },

    async ({ function_name, content }, { authInfo }) => {
      const token = authInfo?.token;
      if (!token) return { content: [{ type: 'text' as const, text: 'Not authenticated. Please reconnect Alexandria.' }] };
      logEvent('notepad_update', { function_name });

      writeNotepad(token as string, function_name, content).catch((err) => {
        console.error(`[notepad] Failed to write ${function_name} notepad:`, err);
      });

      return {
        content: [{
          type: 'text' as const,
          text: `${function_name} notepad updated.`,
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

    async ({ feedback_type, content }, { authInfo }) => {
      const token = authInfo?.token;
      if (!token) return { content: [{ type: 'text' as const, text: 'Not authenticated. Please reconnect Alexandria.' }] };
      logEvent('feedback', { feedback_type });

      const entry = `[${new Date().toISOString().split('T')[0]}] [${feedback_type}]\n${content}`;

      appendSystemFile(token as string, 'feedback', entry).catch((err) => {
        console.error('[feedback] Failed to write feedback:', err);
      });

      return {
        content: [{
          type: 'text' as const,
          text: `Feedback logged (${feedback_type}).`,
        }],
      };
    },
  );

}
