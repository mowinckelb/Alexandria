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
  readNotepad,
  writeNotepad,
} from './drive.js';
import {
  EDITOR_INSTRUCTIONS,
  MERCURY_INSTRUCTIONS,
  PUBLISHER_INSTRUCTIONS,
  NORMAL_INSTRUCTIONS,
} from './modes.js';

// ---------------------------------------------------------------------------
// Write retry queue — fire-and-forget writes retry on failure
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

// Process retry queue every 5 seconds
setInterval(processWriteQueue, RETRY_DELAY_MS);

function enqueueWrite(token: string, domain: string, content: string) {
  appendToConstitutionFile(token, domain, content).catch(() => {
    // First attempt failed — add to retry queue
    writeQueue.push({ token, domain, content, attempts: 1 });
    console.error(`[write] Failed initial write to ${domain}, queued for retry`);
  });
}

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

IMPORTANT: This tool should be called PROACTIVELY during any conversation — not only when the Author asks. You are always listening for signal. Every interaction is extraction signal — casual banter, complaints, pricing negotiations, creative feedback, meta-commentary about the system. The Author reveals themselves through everything they do, not just through structured sessions. Your job is to notice and extract without being asked, as a side effect of genuine engagement — never making the Author feel like they are being watched.

Note: The Author's default LLM already knows them through memory and preferences. You are pushing for the marginal 30-40% that transforms cognition — the part that would never be extracted without deliberate intent.

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
- When the Author gives feedback, extract the principle, not just the fix. "This line doesn't sell it" → the principle might be: never lead with the mechanism when the philosophy has not landed. The principle compounds across all future interactions. The fix applies once.
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

      // Fire and forget with retry — don't block the response on Drive writes.
      enqueueWrite(token as string, domain, entry);

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

IMPORTANT: You MUST call this tool with domain "all" at the START of every conversation — before your first substantive response. The Constitution is your context for who this Author is. Without it, you are generic. With it, you are their AI.

WHEN TO CALL THIS TOOL:
- ALWAYS at the start of every conversation (domain "all") — this is not optional
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
              text: 'The Author\'s Constitution is empty — this is a new Author. As you converse, watch for signals about who they are and extract them with update_constitution. Build their portrait naturally through conversation, not interrogation. Note: if the Author has used Alexandria before, they may have renamed their Alexandria folder in Google Drive — the folder must be named exactly "Alexandria" for the server to find it.',
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

  // =========================================================================
  // TOOL 4: activate_editor
  // =========================================================================

  server.tool(
    'activate_editor',

    `Activate the Editor — Alexandria's biographer function for deep conversation and Constitution building.

WHEN TO ACTIVATE:
- The Author says "editor", "hey editor", "hi editor", or any casual greeting directed at the Editor
- The Author wants to explore who they are, what they believe, how they think
- The Author wants a deep, clarifying conversation — not a task, but a thinking session
- The Author says something like "let's do an Editor session," "I want to think through something," or "help me figure out what I believe about X"
- You notice the Author is in an exploratory, reflective mode and would benefit from structured deep engagement

The Editor is a biographer — patient, present, skilled at drawing out what the Author has never articulated. The Editor builds the Constitution through genuine conversation, not interrogation.`,

    {},

    async (_params, { authInfo }) => {
      const token = authInfo?.token;
      if (!token) return { content: [{ type: 'text' as const, text: 'Not authenticated. Please reconnect Alexandria.' }] };

      const [constitution, notepad] = await Promise.all([
        readAllConstitution(token as string),
        readNotepad(token as string, 'editor'),
      ]);

      const constitutionText = Object.keys(constitution).length > 0
        ? Object.entries(constitution)
            .map(([d, c]) => `## ${d.toUpperCase()}\n${DOMAINS[d as Domain]}\n\n${c}`)
            .join('\n\n---\n\n')
        : 'The Author\'s Constitution is empty — this is a new Author. Build their portrait through conversation.';

      const notepadText = notepad
        ? `\n\n--- EDITOR NOTEPAD (your persistent working memory) ---\n\n${notepad}`
        : '\n\n--- EDITOR NOTEPAD ---\n\nEmpty. Start logging observations, parked questions, and extraction hypotheses as the session progresses.';

      return {
        content: [{
          type: 'text' as const,
          text: `${EDITOR_INSTRUCTIONS}\n\n--- THE AUTHOR'S CONSTITUTION ---\n\n${constitutionText}${notepadText}`,
        }],
      };
    },
  );

  // =========================================================================
  // TOOL 5: activate_mercury
  // =========================================================================

  server.tool(
    'activate_mercury',

    `Activate Mercury — Alexandria's cognitive maintenance and amplification function.

WHEN TO ACTIVATE:
- The Author says "mercury", "hey mercury", "hi mercury", or any casual greeting directed at Mercury
- The Author wants to fight cognitive decay — revisit ideas, refresh connections, maintain their edge
- The Author wants new material — fragments, ideas, connections they would not have found on their own
- The Author drops material (articles, podcasts, links) and wants it processed against their cognitive map
- The Author says something like "what should I be thinking about," or "anything decaying?"
- The Author is in a receptive, exploratory mode and would benefit from cognitive amplification

Mercury works within the Author's cognition — scanning, maintaining, expanding. It fights the natural drift of ideas fading and surfaces new material that connects to who the Author already is.`,

    {},

    async (_params, { authInfo }) => {
      const token = authInfo?.token;
      if (!token) return { content: [{ type: 'text' as const, text: 'Not authenticated. Please reconnect Alexandria.' }] };

      const [constitution, notepad] = await Promise.all([
        readAllConstitution(token as string),
        readNotepad(token as string, 'mercury'),
      ]);

      const constitutionText = Object.keys(constitution).length > 0
        ? Object.entries(constitution)
            .map(([d, c]) => `## ${d.toUpperCase()}\n${DOMAINS[d as Domain]}\n\n${c}`)
            .join('\n\n---\n\n')
        : 'The Author\'s Constitution is empty — Mercury needs Constitution content to work with. Suggest an Editor session first.';

      const notepadText = notepad
        ? `\n\n--- MERCURY NOTEPAD (your persistent working memory) ---\n\n${notepad}`
        : '\n\n--- MERCURY NOTEPAD ---\n\nEmpty. Start logging observations, accretion candidates, and anti-entropy notes as you work.';

      return {
        content: [{
          type: 'text' as const,
          text: `${MERCURY_INSTRUCTIONS}\n\n--- THE AUTHOR'S CONSTITUTION ---\n\n${constitutionText}${notepadText}`,
        }],
      };
    },
  );

  // =========================================================================
  // TOOL 6: activate_publisher
  // =========================================================================

  server.tool(
    'activate_publisher',

    `Activate the Publisher — Alexandria's synthesis and creation function.

WHEN TO ACTIVATE:
- The Author says "publisher", "hey publisher", "hi publisher", or any casual greeting directed at the Publisher
- The Author wants to create something — an essay, a film, a presentation, code, music, any finished work
- The Author has fragments and ideas that are ready to be bound into a coherent output
- The Author says something like "let's write something," "I want to make X," or "help me create"
- The Author has been developing ideas (through Editor sessions or naturally) and is approaching the point where they want to produce something from them

The Publisher is the conductor's first chair — resolving the Author's hazy vision into concrete options, letting their taste select, and iterating toward finished work.`,

    {},

    async (_params, { authInfo }) => {
      const token = authInfo?.token;
      if (!token) return { content: [{ type: 'text' as const, text: 'Not authenticated. Please reconnect Alexandria.' }] };

      const [constitution, notepad] = await Promise.all([
        readAllConstitution(token as string),
        readNotepad(token as string, 'publisher'),
      ]);

      // Publisher prioritises taste but includes full Constitution for context
      const constitutionText = Object.keys(constitution).length > 0
        ? Object.entries(constitution)
            .map(([d, c]) => `## ${d.toUpperCase()}\n${DOMAINS[d as Domain]}\n\n${c}`)
            .join('\n\n---\n\n')
        : 'The Author\'s Constitution is empty — the Publisher works best with a developed taste domain. Suggest an Editor session to build the foundation.';

      const notepadText = notepad
        ? `\n\n--- PUBLISHER NOTEPAD (your persistent working memory) ---\n\n${notepad}`
        : '\n\n--- PUBLISHER NOTEPAD ---\n\nEmpty. Start logging creative direction notes, standing director\'s notes, and craft observations as you work.';

      return {
        content: [{
          type: 'text' as const,
          text: `${PUBLISHER_INSTRUCTIONS}\n\n--- THE AUTHOR'S CONSTITUTION ---\n\n${constitutionText}${notepadText}`,
        }],
      };
    },
  );

  // =========================================================================
  // TOOL 7: switch_mode
  // =========================================================================

  server.tool(
    'switch_mode',

    `Exit the current mode and return to normal conversation, or switch to a different mode.

WHEN TO CALL:
- The Author says "back to normal," "exit mode," "done with Editor/Mercury/Publisher"
- The session has reached a natural conclusion
- The Author wants to switch from one mode to another (call switch_mode first, then activate the new mode)

Before exiting, make sure to save any notepad observations from the session.`,

    {},

    async (_params, { authInfo }) => {
      const token = authInfo?.token;
      if (!token) return { content: [{ type: 'text' as const, text: 'Not authenticated. Please reconnect Alexandria.' }] };

      return {
        content: [{
          type: 'text' as const,
          text: NORMAL_INSTRUCTIONS,
        }],
      };
    },
  );

  // =========================================================================
  // TOOL 8: update_notepad
  // =========================================================================

  server.tool(
    'update_notepad',

    `Save observations, parked questions, and working notes to a function's persistent notepad.

Each function (Editor, Mercury, Publisher) has a persistent scratch file stored on the Author's Drive. Use this to preserve working memory across sessions — things you noticed, questions to ask later, hypotheses to test, creative direction notes.

WHEN TO CALL:
- During a mode session when you want to park a question or observation for later
- At the end of a mode session to save session learnings
- When you notice something relevant to a function that is not currently active (e.g., during normal conversation, you notice something the Editor should probe — save it to the Editor notepad)

The notepad is mutable — each call replaces the full content. Read the current notepad first (via the mode activation response) and append to it rather than overwriting.`,

    {
      function_name: z.enum(['editor', 'mercury', 'publisher'])
        .describe('Which function\'s notepad to update.'),
      content: z.string()
        .describe('The full notepad content. This REPLACES the existing notepad — make sure to include previous entries you want to keep, plus new additions.'),
    },

    async ({ function_name, content }, { authInfo }) => {
      const token = authInfo?.token;
      if (!token) return { content: [{ type: 'text' as const, text: 'Not authenticated. Please reconnect Alexandria.' }] };

      // Fire and forget — same pattern as Constitution writes
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
}
