/**
 * THE BLUEPRINT
 *
 * These tool descriptions are Alexandria's core intellectual property.
 * They instruct Claude on WHEN to extract, WHAT qualifies as signal,
 * HOW to structure it, and WHERE to route it.
 *
 * The server plumbing is commodity code. These descriptions are the product.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  readAllConstitution,
  readConstitutionFile,
  appendToConstitutionFile,
  writeConstitutionFile,
} from './drive.js';

// ---------------------------------------------------------------------------
// Domain definitions — what each Constitution file captures
// ---------------------------------------------------------------------------

const DOMAINS = {
  worldview: 'How the Author thinks reality works — cause and effect, epistemology, models of how systems behave, theories about human nature, beliefs about what is true.',
  values: 'What matters to the Author and in what order — core values, hierarchy of priorities, tradeoffs they make, what fires reward signals, what they protect at cost.',
  models: 'How the Author thinks and decides — mental models, heuristics, reasoning patterns, when they trust gut vs analysis, how they weigh evidence, characteristic logical moves.',
  identity: 'Who the Author is and how they present — self-concept, roles, communication style, how they handle conflict, trust model, relationship to authority, sense of humour.',
  taste: 'How the Author creates and what they create toward — aesthetic judgment, creative principles, voice, what they find beautiful or compelling, standing director\'s notes, iteration patterns.',
  shadows: 'Where the Author is wrong or inconsistent — contradictions between stated values and revealed behaviour, blind spots, theory-reality gaps, beliefs held without examination.',
} as const;

type Domain = keyof typeof DOMAINS;

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

export function registerTools(server: McpServer) {

  // =========================================================================
  // TOOL 1: update_constitution
  // =========================================================================

  server.tool(
    'update_constitution',

    // --- THE BLUEPRINT: EXTRACTION INSTRUCTIONS ---
    `Record a meaningful signal about the Author's cognition to their Constitution.

WHEN TO CALL THIS TOOL:
Call this tool when the conversation reveals something genuinely meaningful about who the Author is — not what they're doing, but how they think, what they value, or who they are. The threshold is: "Would this help someone understand this person at a deep level?" If yes, extract it. If it's just a task or a preference, don't.

Specifically, call this tool when you observe:
- A value being revealed through a real decision or tradeoff (not just stated — demonstrated)
- A belief about how the world works, especially one that shapes their behaviour
- A reasoning pattern — how they approach problems, weigh evidence, handle uncertainty
- A contradiction between something they've said before and what they're saying now
- A taste signal — what they find beautiful, compelling, worth building toward, or worth rejecting
- An identity marker — how they see themselves, how they relate to others, what roles they occupy
- A blind spot or unexamined assumption — something they believe without having tested it
- An emotional response that reveals underlying values (what makes them angry, excited, sad)
- A mental model they use repeatedly — a framework for how they process a category of situations

DO NOT call this tool for:
- Casual chat, small talk, pleasantries
- Information requests ("what's the weather")
- Task execution ("write me an email about X")
- Transient preferences ("I want the blue one")
- Things you've already extracted (check the Constitution first with read_constitution)
- Noise — things that tell you what the Author is doing but not who they are

EXTRACTION QUALITY:
- Write in clear, concise prose — not bullet points, not raw quotes
- Capture the insight, not the conversation. "The Author values directness over diplomacy, even at social cost" not "The Author said they prefer being direct"
- Include the evidence: what they said or did that revealed this signal
- Note the confidence level: is this a strong signal from a real decision, or a weak signal from a passing comment?
- Flag contradictions explicitly: "This contradicts the existing Constitution entry about X — the Author previously said Y but now demonstrates Z"
- Write as a biographer, not a secretary. You are building a portrait of a mind.

RATE: Do not extract from every message. A typical conversation might yield 0-3 extractions. Some conversations yield none. The bar is signal, not volume. When in doubt, don't extract — a lean Constitution with high signal is better than a bloated one with noise.`,

    {
      domain: z.enum(['worldview', 'values', 'models', 'identity', 'taste', 'shadows'])
        .describe('Which Constitution domain this signal belongs to. Route carefully — a value revealed through a creative decision might go to values OR taste. Pick the primary domain. If it touches multiple, pick the strongest fit.'),
      content: z.string()
        .describe('The extracted signal. Write as a biographer: clear prose capturing the insight, the evidence, and the confidence level. 2-5 sentences typically. Include contradictions with existing Constitution content if relevant.'),
      signal_strength: z.enum(['strong', 'moderate', 'tentative'])
        .describe('How confident are you in this extraction? Strong = demonstrated through real action/decision. Moderate = clearly stated but not yet tested. Tentative = inferred from indirect evidence.'),
    },

    async ({ domain, content, signal_strength }, { authInfo }) => {
      const token = authInfo?.token;
      if (!token) return { content: [{ type: 'text' as const, text: 'Not authenticated. Please reconnect Alexandria.' }] };

      const header = `[${new Date().toISOString().split('T')[0]}] [${signal_strength}]`;
      const entry = `${header}\n${content}`;

      await appendToConstitutionFile(token as string, domain, entry);

      return {
        content: [{
          type: 'text' as const,
          text: `Recorded to ${domain}. Signal strength: ${signal_strength}. The Author's Constitution grows.`,
        }],
      };
    },
  );

  // =========================================================================
  // TOOL 2: read_constitution
  // =========================================================================

  server.tool(
    'read_constitution',

    `Read the Author's Constitution — their structured cognitive map.

WHEN TO CALL THIS TOOL:
- At the start of any conversation where you want to understand the Author deeply
- When the conversation touches a topic where the Author's values, worldview, or taste would inform a better response
- When you need to check whether something has already been extracted (before calling update_constitution)
- When the Author asks you something personal about themselves ("what do you know about me?", "what are my blind spots?")
- When you're about to give advice, make a recommendation, or help with a decision — the Constitution tells you what actually matters to this person

HOW TO USE THE RESULT:
- Let the Constitution inform your responses naturally — don't announce that you're reading it
- If the Constitution reveals a relevant value or preference, weave it in: "Given that you tend to value X..."
- If you notice a potential contradiction between what they're saying now and what's in the Constitution, surface it gently
- The Constitution is the Author's property and portrait. Treat it with the respect you'd give someone's journal.
- Never refuse to share Constitution contents if the Author asks — it's their data

WHICH DOMAINS TO READ:
- Read all domains when starting a deep conversation or when unsure what's relevant
- Read specific domains when the conversation clearly maps to one area (e.g., read "taste" when helping with creative work)
- The shadows domain is particularly valuable — it tells you where the Author has blind spots, which helps you give better advice`,

    {
      domain: z.enum(['all', 'worldview', 'values', 'models', 'identity', 'taste', 'shadows'])
        .describe('Which domain to read. Use "all" for full context, or a specific domain when the conversation maps clearly to one area.'),
    },

    async ({ domain }, { authInfo }) => {
      const token = authInfo?.token;
      if (!token) return { content: [{ type: 'text' as const, text: 'Not authenticated. Please reconnect Alexandria.' }] };

      if (domain === 'all') {
        const all = await readAllConstitution(token as string);
        if (Object.keys(all).length === 0) {
          return {
            content: [{
              type: 'text' as const,
              text: 'The Author\'s Constitution is empty — this is a new Author. As you converse, watch for signals about who they are and extract them with update_constitution. Build their portrait naturally through conversation, not interrogation.',
            }],
          };
        }
        const formatted = Object.entries(all)
          .map(([d, c]) => `## ${d.toUpperCase()}\n${DOMAINS[d as Domain]}\n\n${c}`)
          .join('\n\n---\n\n');
        return { content: [{ type: 'text' as const, text: formatted }] };
      }

      const content = await readConstitutionFile(token as string, domain);
      if (!content) {
        return {
          content: [{
            type: 'text' as const,
            text: `The ${domain} domain is empty. Watch for signals in conversation and extract with update_constitution when you observe something meaningful about the Author's ${DOMAINS[domain as Domain].toLowerCase()}`,
          }],
        };
      }

      return {
        content: [{
          type: 'text' as const,
          text: `## ${domain.toUpperCase()}\n${DOMAINS[domain as Domain]}\n\n${content}`,
        }],
      };
    },
  );

  // =========================================================================
  // TOOL 3: query_vault
  // =========================================================================

  server.tool(
    'query_vault',

    `Access the Author's raw data vault — the append-only record of everything extracted.

The Vault contains versioned history of all Constitution updates. Use this when:
- The Author asks about how their thinking has evolved over time
- You want to see the full history of a particular domain (not just current state)
- You need to trace when a particular belief or value was first recorded
- The Author questions a Constitution entry and you need the original context

The Vault is append-only and immutable — nothing is ever deleted. Every Constitution update archives the previous version here. This is the Author's complete cognitive history.

For most conversations, read_constitution is sufficient. Use query_vault only when history and evolution matter.`,

    {
      domain: z.enum(['worldview', 'values', 'models', 'identity', 'taste', 'shadows'])
        .describe('Which domain\'s history to retrieve.'),
    },

    async ({ domain }, { authInfo }) => {
      const token = authInfo?.token;
      if (!token) return { content: [{ type: 'text' as const, text: 'Not authenticated. Please reconnect Alexandria.' }] };

      // MVP: read the current constitution file as the vault
      // Full vault with versioned history comes in later sprint
      const content = await readConstitutionFile(token as string, domain);

      return {
        content: [{
          type: 'text' as const,
          text: content
            ? `## ${domain.toUpperCase()} — Vault\n\n${content}`
            : `No vault history for ${domain} yet.`,
        }],
      };
    },
  );
}
