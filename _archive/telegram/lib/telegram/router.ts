/**
 * Telegram Message Router
 * Routes incoming messages to Editor or Orchestrator based on context
 */

import { createClient } from '@supabase/supabase-js';
import { TelegramMessage, TelegramClient, getTelegramClient } from './client';
import { getEditor, getOrchestrator } from '@/lib/factory';
import OpenAI from 'openai';
import { saveToVault } from '@/lib/utils/vault';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ============================================================================
// Types
// ============================================================================

export interface RouterContext {
  userId: string;
  chatId: number;
  telegramUserId: number;
  mode: 'editor' | 'orchestrator';
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ============================================================================
// User Mapping
// ============================================================================

/**
 * Get or create Alexandria user from Telegram user
 */
async function getOrCreateUser(telegramUserId: number, telegramUsername?: string): Promise<string | null> {
  // Check if mapping exists
  const { data: existing } = await supabase
    .from('telegram_users')
    .select('user_id')
    .eq('telegram_id', telegramUserId)
    .single();

  if (existing?.user_id) {
    return existing.user_id;
  }

  // Create new Alexandria user
  const { data: newUser, error: userError } = await supabase
    .from('users')
    .insert({
      email: `telegram_${telegramUserId}@alexandria.local`,
      password_hash: 'telegram_oauth', // Not used for Telegram auth
      display_name: telegramUsername || `User ${telegramUserId}`
    })
    .select('id')
    .single();

  if (userError || !newUser) {
    console.error('[Router] Failed to create user:', userError);
    return null;
  }

  // Create mapping
  const { error: mapError } = await supabase
    .from('telegram_users')
    .insert({
      telegram_id: telegramUserId,
      user_id: newUser.id,
      telegram_username: telegramUsername
    });

  if (mapError) {
    console.error('[Router] Failed to create telegram mapping:', mapError);
    // User was created, just mapping failed - still return user
  }

  console.log(`[Router] Created new user ${newUser.id} for Telegram user ${telegramUserId}`);
  return newUser.id;
}

// ============================================================================
// Conversation History
// ============================================================================

/**
 * Get recent conversation history for context
 */
async function getConversationHistory(
  userId: string,
  mode: 'editor' | 'orchestrator',
  limit: number = 10
): Promise<ConversationMessage[]> {
  const { data } = await supabase
    .from('telegram_messages')
    .select('role, content')
    .eq('user_id', userId)
    .eq('mode', mode)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!data) return [];

  // Reverse to get chronological order
  return data.reverse().map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content
  }));
}

/**
 * Store message in history
 */
async function storeMessage(
  userId: string,
  mode: 'editor' | 'orchestrator',
  role: 'user' | 'assistant',
  content: string
): Promise<void> {
  await supabase.from('telegram_messages').insert({
    user_id: userId,
    mode,
    role,
    content
  });
}

// ============================================================================
// Mode Detection
// ============================================================================

/**
 * Detect whether message is for Editor or Orchestrator
 * 
 * Editor: Author talking TO Alexandria (providing info, answering questions)
 * Orchestrator: Author wanting Alexandria to DO something or answer AS them
 */
function detectMode(text: string): 'editor' | 'orchestrator' {
  const lowerText = text.toLowerCase();

  // Explicit mode switches
  if (lowerText.startsWith('/editor') || lowerText.startsWith('/input')) {
    return 'editor';
  }
  if (lowerText.startsWith('/ghost') || lowerText.startsWith('/output') || lowerText.startsWith('/do')) {
    return 'orchestrator';
  }

  // Heuristics for Editor mode (talking TO Alexandria)
  const editorSignals = [
    'i think', 'i believe', 'i feel', 'my opinion',
    'let me tell you', 'here\'s what', 'i want you to know',
    'remember that', 'note that', 'fyi',
    'i\'m', 'i am', 'i was', 'i have', 'i had',
    'about me', 'my life', 'my story'
  ];

  // Heuristics for Orchestrator mode (wanting Alexandria to act)
  const orchestratorSignals = [
    'what would i say', 'how would i respond', 'answer as me',
    'draft a', 'write a', 'compose',
    'do this for me', 'help me with',
    'what do i think about', 'my take on'
  ];

  for (const signal of orchestratorSignals) {
    if (lowerText.includes(signal)) return 'orchestrator';
  }

  for (const signal of editorSignals) {
    if (lowerText.includes(signal)) return 'editor';
  }

  // Default to Editor (more common use case - Author providing input)
  return 'editor';
}

// ============================================================================
// Voice Message Processing
// ============================================================================

/**
 * Transcribe voice message using OpenAI Whisper
 */
async function transcribeVoice(
  client: TelegramClient,
  fileId: string,
  userId: string
): Promise<string | null> {
  try {
    // Download the voice file
    const buffer = await client.downloadFile(fileId);
    if (!buffer) {
      console.error('[Router] Failed to download voice file');
      return null;
    }

    // Save raw audio to Vault
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await saveToVault(userId, `raw/voice/${timestamp}.ogg`, buffer, 'audio');

    // Transcribe with Whisper
    // Convert Node.js Buffer to ArrayBuffer for web API compatibility
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
    const blob = new Blob([arrayBuffer], { type: 'audio/ogg' });
    const file = new File([blob], 'voice.ogg', { type: 'audio/ogg' });
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      response_format: 'text'
    });

    // Save transcript to Vault
    await saveToVault(userId, `raw/transcripts/${timestamp}.txt`, transcription, 'transcript');

    console.log(`[Router] Transcribed voice: "${transcription.substring(0, 50)}..."`);
    return transcription;
  } catch (error) {
    console.error('[Router] Transcription error:', error);
    return null;
  }
}

// ============================================================================
// Main Router
// ============================================================================

/**
 * Route incoming Telegram message to appropriate handler
 */
export async function routeMessage(message: TelegramMessage): Promise<void> {
  const client = getTelegramClient();
  const chatId = message.chat.id;
  const telegramUserId = message.from.id;

  // Get or create Alexandria user
  const userId = await getOrCreateUser(telegramUserId, message.from.username);
  if (!userId) {
    await client.sendMessage(chatId, 'Sorry, I couldn\'t set up your account. Please try again.');
    return;
  }

  // Show typing indicator
  await client.sendTyping(chatId);

  // Get the message content
  let content: string;

  if (message.text) {
    content = message.text;
  } else if (message.voice || message.audio) {
    const fileId = message.voice?.file_id || message.audio?.file_id;
    if (!fileId) {
      await client.sendMessage(chatId, 'I couldn\'t process that audio file.');
      return;
    }

    await client.sendMessage(chatId, '🎤 Transcribing your voice note...');
    const transcript = await transcribeVoice(client, fileId, userId);
    
    if (!transcript) {
      await client.sendMessage(chatId, 'Sorry, I couldn\'t transcribe that audio. Please try again.');
      return;
    }

    content = transcript;
    await client.sendMessage(chatId, `📝 Heard: "${transcript.substring(0, 100)}${transcript.length > 100 ? '...' : ''}"`);
  } else if (message.document) {
    // Handle document uploads later
    await client.sendMessage(chatId, 'Document uploads coming soon! For now, please send text or voice notes.');
    return;
  } else {
    await client.sendMessage(chatId, 'I can process text and voice messages. Send me something!');
    return;
  }

  // Handle commands
  if (content.startsWith('/')) {
    await handleCommand(content, chatId, userId, client);
    return;
  }

  // Detect mode and route
  const mode = detectMode(content);
  
  // Get conversation history
  const history = await getConversationHistory(userId, mode);

  // Store user message
  await storeMessage(userId, mode, 'user', content);

  // Process based on mode
  let response: string;

  if (mode === 'editor') {
    response = await processEditorMessage(content, userId, history);
  } else {
    response = await processOrchestratorMessage(content, userId, history);
  }

  // Store assistant response
  await storeMessage(userId, mode, 'assistant', response);

  // Send response (split if too long)
  await sendLongMessage(client, chatId, response);
}

// ============================================================================
// Message Processors
// ============================================================================

async function processEditorMessage(
  content: string,
  userId: string,
  history: ConversationMessage[]
): Promise<string> {
  const editor = getEditor();
  
  try {
    const response = await editor.converse(
      content,
      userId,
      history.map(h => ({ role: h.role, content: h.content }))
    );

    // Format response
    let message = response.message;

    // Add follow-up questions if any
    if (response.followUpQuestions?.length > 0) {
      message += '\n\n';
      response.followUpQuestions.forEach((q, i) => {
        message += `${i + 1}. ${q.question}\n`;
      });
    }

    return message;
  } catch (error) {
    console.error('[Router] Editor error:', error);
    return 'I had trouble processing that. Could you try rephrasing?';
  }
}

async function processOrchestratorMessage(
  content: string,
  userId: string,
  history: ConversationMessage[]
): Promise<string> {
  const orchestrator = getOrchestrator();

  try {
    const { response } = await orchestrator.generateResponse(
      [...history.map(h => ({ role: h.role, content: h.content })), { role: 'user' as const, content }],
      userId
    );

    return response;
  } catch (error) {
    console.error('[Router] Orchestrator error:', error);
    return 'I had trouble generating a response. Please try again.';
  }
}

// ============================================================================
// Command Handler
// ============================================================================

async function handleCommand(
  command: string,
  chatId: number,
  userId: string,
  client: TelegramClient
): Promise<void> {
  const cmd = command.split(' ')[0].toLowerCase();

  switch (cmd) {
    case '/start':
      await client.sendMessage(chatId, 
        `Welcome to Alexandria! 🏛️\n\n` +
        `I'm your personal AI that learns who you are.\n\n` +
        `• Send me voice notes or text about yourself\n` +
        `• Tell me your thoughts, opinions, stories\n` +
        `• I'll learn to think and respond like you\n\n` +
        `Commands:\n` +
        `/editor - Talk TO me (I learn about you)\n` +
        `/ghost - Talk AS you (I respond like you)\n` +
        `/status - Check your Alexandria stats\n` +
        `/help - Show this message`
      );
      break;

    case '/help':
      await client.sendMessage(chatId,
        `Alexandria Commands:\n\n` +
        `/editor - Switch to Editor mode (I learn about you)\n` +
        `/ghost - Switch to Orchestrator mode (I respond as you)\n` +
        `/status - Your stats (training pairs, memories, etc.)\n` +
        `/constitution - View your Constitution\n` +
        `/help - Show this message`
      );
      break;

    case '/status':
      await sendStatus(chatId, userId, client);
      break;

    case '/constitution':
      await sendConstitution(chatId, userId, client);
      break;

    case '/editor':
      await client.sendMessage(chatId, 
        '📝 Editor mode active.\n\nTell me about yourself. I\'m listening and learning.'
      );
      break;

    case '/ghost':
    case '/orchestrator':
      await client.sendMessage(chatId,
        '👻 Ghost mode active.\n\nAsk me to respond as you, or give me a prompt to answer in your voice.'
      );
      break;

    default:
      await client.sendMessage(chatId, `Unknown command: ${cmd}\n\nType /help for available commands.`);
  }
}

async function sendStatus(chatId: number, userId: string, client: TelegramClient): Promise<void> {
  const [pairsResult, memoriesResult, notesResult] = await Promise.all([
    supabase.from('training_pairs').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('memory_fragments').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('editor_notes').select('id', { count: 'exact', head: true }).eq('user_id', userId)
  ]);

  const stats = {
    trainingPairs: pairsResult.count || 0,
    memories: memoriesResult.count || 0,
    editorNotes: notesResult.count || 0
  };

  await client.sendMessage(chatId,
    `📊 Your Alexandria Stats\n\n` +
    `Training Pairs: ${stats.trainingPairs}\n` +
    `Memories: ${stats.memories}\n` +
    `Editor Notes: ${stats.editorNotes}\n\n` +
    `${stats.trainingPairs >= 100 ? '✅ Ready for PLM training!' : `Need ${100 - stats.trainingPairs} more pairs for training.`}`
  );
}

async function sendConstitution(chatId: number, userId: string, client: TelegramClient): Promise<void> {
  const { getConstitutionManager } = await import('@/lib/factory');
  const manager = getConstitutionManager();
  const constitution = await manager.getConstitution(userId);

  if (!constitution) {
    await client.sendMessage(chatId,
      `📜 No Constitution yet.\n\n` +
      `Keep talking to me! Once I understand you better, I'll extract your Constitution.`
    );
    return;
  }

  // Send summary
  const sections = constitution.sections;
  let summary = `📜 Your Constitution (v${constitution.version})\n\n`;

  if (sections.coreIdentity) {
    summary += `**Identity:** ${sections.coreIdentity}\n\n`;
  }

  if (sections.values?.tier1?.length > 0) {
    summary += `**Core Values:**\n`;
    sections.values.tier1.forEach(v => {
      summary += `• ${v.name}\n`;
    });
    summary += '\n';
  }

  if (sections.boundaries?.length > 0) {
    summary += `**Boundaries:**\n`;
    sections.boundaries.slice(0, 3).forEach(b => {
      summary += `• ${b}\n`;
    });
  }

  await client.sendMessage(chatId, summary, { parseMode: 'Markdown' });
}

// ============================================================================
// Helpers
// ============================================================================

async function sendLongMessage(client: TelegramClient, chatId: number, text: string): Promise<void> {
  const MAX_LENGTH = 4000; // Telegram limit is 4096

  if (text.length <= MAX_LENGTH) {
    await client.sendMessage(chatId, text);
    return;
  }

  // Split at sentence boundaries
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  let chunk = '';

  for (const sentence of sentences) {
    if ((chunk + sentence).length > MAX_LENGTH) {
      await client.sendMessage(chatId, chunk.trim());
      chunk = sentence;
    } else {
      chunk += sentence;
    }
  }

  if (chunk.trim()) {
    await client.sendMessage(chatId, chunk.trim());
  }
}
