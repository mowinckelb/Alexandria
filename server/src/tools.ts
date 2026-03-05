import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { Env, AuthorRecord } from './types.js';
import { CONSTITUTION_DOMAINS } from './types.js';
import {
  getAccessToken,
  getDomainFileId,
  readFile,
  writeFile,
  listConstitutionFiles,
  listVaultFiles,
} from './drive.js';

// Register all three tools on the MCP server.
// The tool descriptions ARE the Blueprint — they instruct Claude when and how
// to extract, read, and query. Treat these with the same rigour as product design.

export function registerTools(
  server: McpServer,
  getAuthor: () => Promise<{ token: string; author: AuthorRecord }>,
  env: Env,
) {

  // ─── Tool 1: update_constitution ────────────────────────────────────
  //
  // This is the extraction engine. The description tells Claude WHEN to
  // extract, WHAT counts as signal, and HOW to structure it.

  server.registerTool(
    'update_constitution',
    {
      title: 'Update Constitution',
      description: `Write a structured update to the Author's sovereign Constitution — their cognitive architecture.

WHEN TO CALL THIS TOOL:
Call this when the conversation reveals something constitutionally significant about the Author. This means:
- A core belief, value, or conviction (Worldview, Values)
- A reasoning pattern, mental model, or decision framework they use (Models)
- Something about how they see themselves, their voice, or their role (Identity)
- An aesthetic preference, quality signal, or creative principle (Taste)
- A known blind spot, contradiction, or growth edge they acknowledge (Shadows)
- A CONTRADICTION with something already in their Constitution — this is especially valuable

DO NOT call this tool for:
- Transactional requests ("send this email", "write this code") that reveal nothing about who the Author is
- Information the Author is simply relaying, not endorsing
- Casual conversation that does not contain signal
- Things you are uncertain about — wait for confirmation across multiple conversations before extracting

Most conversations will NOT trigger extraction. That is correct. Extract on signal, not on volume. When in doubt, do not extract. A Constitution built from high-quality signal is worth more than one polluted with noise.

HOW TO STRUCTURE THE EXTRACTION:
- Route to the correct domain (Worldview, Values, Models, Identity, Taste, or Shadows)
- Write in the Author's voice — this is their self-knowledge, not your summary
- Be specific and concrete, not generic. "Values precision in language because carelessness signals carelessness in thinking" is good. "Values good communication" is noise.
- If this contradicts existing Constitution content, note the contradiction explicitly. Contradictions are among the most valuable signals — they reveal growth, change, or unresolved tensions.
- Keep each extraction focused. One clear insight per call. Do not bundle unrelated observations.

CRITICAL: Do not be intrusive. The Author should not feel surveilled. Extraction happens silently. Do not mention that you are updating the Constitution unless the Author asks. The sovereignty layer should feel invisible.`,
      inputSchema: {
        domain: z.enum(CONSTITUTION_DOMAINS).describe('The Constitution domain to update'),
        content: z.string().describe('The structured extraction — written in the Author\'s voice, specific and concrete. Include a brief context note about what prompted this extraction.'),
        contradiction: z.boolean().optional().describe('True if this contradicts existing Constitution content. Contradictions are especially valuable.'),
      },
    },
    async ({ domain, content, contradiction }) => {
      const { token, author } = await getAuthor();
      const accessToken = await getAccessToken(env, token, author);
      const fileId = await getDomainFileId(accessToken, author.constitutionFolderId, domain);

      if (!fileId) {
        return { content: [{ type: 'text' as const, text: `Domain file ${domain}.md not found in Constitution.` }] };
      }

      // Read current content
      const current = await readFile(accessToken, fileId);

      // Append the new extraction with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const marker = contradiction ? '⚡ CONTRADICTION' : '✦ EXTRACTED';
      const entry = `\n\n---\n\n*${marker} — ${timestamp}*\n\n${content}`;
      await writeFile(accessToken, fileId, current + entry);

      return {
        content: [{ type: 'text' as const, text: `Constitution updated: ${domain}${contradiction ? ' (contradiction noted)' : ''}` }],
      };
    },
  );


  // ─── Tool 2: read_constitution ──────────────────────────────────────
  //
  // This gives Claude access to the Author's structured self-knowledge.

  server.registerTool(
    'read_constitution',
    {
      title: 'Read Constitution',
      description: `Read the Author's sovereign Constitution — their structured cognitive architecture.

WHEN TO CALL THIS TOOL:
Call this when understanding the Author deeply would meaningfully improve your response. This includes:
- The Author asks for advice, and knowing their values/worldview would change what you recommend
- The Author is making a decision, and their mental models or decision frameworks are relevant
- The Author is creating something, and their taste/voice/creative principles should guide the output
- The Author asks you to write in their voice or represent their perspective
- You need to check whether something contradicts the Author's existing Constitution before extracting
- The Author explicitly asks about their Constitution or what Alexandria has captured

DO NOT call this tool for:
- Simple factual questions that do not benefit from personalisation
- Tasks where the Author's cognitive architecture is irrelevant
- Every single message — read strategically, not reflexively

WHICH DOMAIN TO READ:
- For advice and decisions: Values, Models, Worldview
- For creative work: Taste, Identity, Voice
- For self-reflection: Shadows, Identity
- For understanding their perspective: Worldview, Values
- Pass "all" to read the full Constitution (use sparingly — prefer specific domains)

HOW TO USE WHAT YOU READ:
Integrate the Author's Constitution naturally. Do not say "according to your Constitution" or "your Values domain says." Simply be informed by it. The Author should feel understood, not profiled.`,
      inputSchema: {
        domain: z.union([
          z.enum(CONSTITUTION_DOMAINS),
          z.literal('all'),
        ]).describe('Which domain to read, or "all" for the full Constitution'),
      },
    },
    async ({ domain }) => {
      const { token, author } = await getAuthor();
      const accessToken = await getAccessToken(env, token, author);

      if (domain === 'all') {
        // Read all domain files
        const files = await listConstitutionFiles(accessToken, author.constitutionFolderId);
        const contents: string[] = [];
        for (const file of files) {
          const text = await readFile(accessToken, file.id);
          contents.push(text);
        }
        return {
          content: [{ type: 'text' as const, text: contents.join('\n\n---\n\n') || 'Constitution is empty — no extractions yet.' }],
        };
      }

      // Read a specific domain
      const fileId = await getDomainFileId(accessToken, author.constitutionFolderId, domain);
      if (!fileId) {
        return { content: [{ type: 'text' as const, text: `Domain ${domain} not found.` }] };
      }

      const text = await readFile(accessToken, fileId);
      return { content: [{ type: 'text' as const, text }] };
    },
  );


  // ─── Tool 3: query_vault ────────────────────────────────────────────
  //
  // Access the Author's raw data store.

  server.registerTool(
    'query_vault',
    {
      title: 'Query Vault',
      description: `Access the Author's Vault — their raw data store in the Alexandria folder.

The Vault is the broader Alexandria folder in the Author's Google Drive. It may contain files the Author has placed there: documents, notes, reference material, creative work, or anything they want their AI to have access to.

WHEN TO CALL THIS TOOL:
- The Author references a document or file they have stored
- The Author asks you to work with their existing material
- You need context beyond what the Constitution provides

For MVP, this tool lists files in the Vault and reads them by name. The Constitution is the primary sovereign asset — the Vault is supplementary storage.`,
      inputSchema: {
        action: z.enum(['list', 'read']).describe('"list" to see all files, "read" to read a specific file'),
        filename: z.string().optional().describe('The filename to read (required when action is "read")'),
      },
    },
    async ({ action, filename }) => {
      const { token, author } = await getAuthor();
      const accessToken = await getAccessToken(env, token, author);

      if (action === 'list') {
        const files = await listVaultFiles(accessToken, author.driveFolderId);
        const listing = files.map(f => f.name).join('\n');
        return {
          content: [{ type: 'text' as const, text: listing || 'Vault is empty.' }],
        };
      }

      if (action === 'read' && filename) {
        // Search for the file in the Alexandria folder
        const files = await listVaultFiles(accessToken, author.driveFolderId);
        const file = files.find(f => f.name === filename);
        if (!file) {
          return { content: [{ type: 'text' as const, text: `File "${filename}" not found in Vault.` }] };
        }
        const text = await readFile(accessToken, file.id);
        return { content: [{ type: 'text' as const, text }] };
      }

      return { content: [{ type: 'text' as const, text: 'Specify a filename to read.' }] };
    },
  );
}
