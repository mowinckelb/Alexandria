/**
 * Model & Provider Configuration
 * 
 * Centralized model selection and provider instances.
 * All AI providers used across Alexandria are configured here.
 * Modules should import from here rather than creating their own provider instances.
 * 
 * Providers:
 *   Groq       - Editor, RLAIF, extraction, personality, all LLM text generation
 *   Together   - Embeddings (BAAI/bge-base-en-v1.5), PLM inference, fine-tuning
 *   OpenAI     - Whisper (audio transcription), Assistants (PDF), Vision (images)
 * 
 * Env vars:
 *   GROQ_API_KEY       - Required for all LLM operations
 *   TOGETHER_API_KEY   - Required for embeddings and PLM
 *   OPENAI_API_KEY     - Required for voice/file processing
 *   GROQ_FAST_MODEL    - Override fast model (default: llama-3.1-8b-instant)
 *   GROQ_QUALITY_MODEL - Override quality model (default: llama-3.3-70b-versatile)
 */

import { createGroq } from '@ai-sdk/groq';
import { createTogetherAI } from '@ai-sdk/togetherai';
import Together from 'together-ai';
import OpenAI from 'openai';

// ============================================================================
// Provider Instances (shared singletons)
// ============================================================================

/** Groq provider for AI SDK (text generation, structured output) */
export const groqProvider = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

/** Together AI provider for AI SDK (PLM inference) */
export const togetherProvider = createTogetherAI({
  apiKey: process.env.TOGETHER_API_KEY,
});

/** Together AI SDK client (embeddings, fine-tuning) */
export const togetherClient = new Together({
  apiKey: process.env.TOGETHER_API_KEY,
});

/** OpenAI SDK client (Whisper, Assistants, Vision) */
export const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================================
// Model Defaults
// ============================================================================

const DEFAULTS = {
  fast: 'llama-3.1-8b-instant',
  quality: 'llama-3.3-70b-versatile',
  embeddings: 'BAAI/bge-base-en-v1.5',
  plm: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
} as const;

// ============================================================================
// Model Getters
// ============================================================================

/**
 * Get the fast model (Editor conversations, RLAIF evaluation)
 * Optimized for speed over quality
 */
export function getFastModel() {
  const modelId = process.env.GROQ_FAST_MODEL || DEFAULTS.fast;
  return groqProvider(modelId);
}

/**
 * Get the quality model (Orchestrator, extraction, structured output)
 * Optimized for quality over speed
 */
export function getQualityModel() {
  const modelId = process.env.GROQ_QUALITY_MODEL || DEFAULTS.quality;
  return groqProvider(modelId);
}

/**
 * Get model IDs for logging/debugging
 */
export function getModelConfig() {
  return {
    fast: process.env.GROQ_FAST_MODEL || DEFAULTS.fast,
    quality: process.env.GROQ_QUALITY_MODEL || DEFAULTS.quality,
    embeddings: DEFAULTS.embeddings,
    plm: DEFAULTS.plm,
  };
}

// Legacy alias
export const groq = groqProvider;

