/**
 * Model & Provider Configuration
 * 
 * Centralized model selection. Model-agnostic by design (Axiom).
 * 
 * Priority chain: Anthropic (if key set) → Groq → Fireworks fallback
 * 
 * Env vars:
 *   ANTHROPIC_API_KEY  - Anthropic (Claude) — best quality, recommended
 *   GROQ_API_KEY       - Groq (Llama) — fast and free-tier friendly
 *   FIREWORKS_API_KEY  - Fireworks AI — PLM fine-tuning + inference (Kimi K2.5)
 *   OPENAI_API_KEY     - OpenAI — Whisper, Assistants, Vision
 */

import { type LanguageModel } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { createFireworks } from '@ai-sdk/fireworks';
import { createAnthropic } from '@ai-sdk/anthropic';
import OpenAI from 'openai';

// ============================================================================
// Provider Instances
// ============================================================================

export const groqProvider = createGroq({ apiKey: process.env.GROQ_API_KEY });
export const fireworksProvider = createFireworks({ apiKey: process.env.FIREWORKS_API_KEY });
export const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const anthropicProvider = process.env.ANTHROPIC_API_KEY
  ? createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

// ============================================================================
// PLM Base Model (Fireworks)
// ============================================================================

export const PLM_BASE_MODEL = 'accounts/fireworks/models/kimi-k2p5';

// ============================================================================
// Model Getters — priority: Anthropic → Groq → Fireworks
// ============================================================================

/**
 * Quality model for Editor, Orchestrator, extraction, RLAIF.
 * Uses Claude if ANTHROPIC_API_KEY is set, otherwise Groq.
 */
export function getQualityModel(): LanguageModel {
  if (anthropicProvider) {
    return anthropicProvider('claude-sonnet-4-6') as LanguageModel;
  }
  const modelId = process.env.GROQ_QUALITY_MODEL || 'llama-3.3-70b-versatile';
  return groqProvider(modelId) as LanguageModel;
}

/**
 * Fast model for quick tasks (RLAIF scoring, simple extraction).
 * Uses Sonnet for fast too — Haiku 4 not yet available.
 */
export function getFastModel(): LanguageModel {
  if (anthropicProvider) {
    return anthropicProvider('claude-sonnet-4-6') as LanguageModel;
  }
  const modelId = process.env.GROQ_FAST_MODEL || 'llama-3.1-8b-instant';
  return groqProvider(modelId) as LanguageModel;
}

/**
 * Fallback when primary provider rate-limits.
 */
export function getFallbackQualityModel(): LanguageModel {
  if (anthropicProvider) {
    return anthropicProvider('claude-sonnet-4-6') as LanguageModel;
  }
  return fireworksProvider('accounts/fireworks/models/llama-v3p1-70b-instruct') as LanguageModel;
}

export function getModelConfig() {
  const provider = anthropicProvider ? 'anthropic' : 'groq';
  return {
    provider,
    quality: anthropicProvider ? 'claude-sonnet-4-6' : (process.env.GROQ_QUALITY_MODEL || 'llama-3.3-70b-versatile'),
    fast: anthropicProvider ? 'claude-sonnet-4-6' : (process.env.GROQ_FAST_MODEL || 'llama-3.1-8b-instant'),
    embeddings: 'BAAI/bge-base-en-v1.5',
    plm: PLM_BASE_MODEL,
  };
}

export const groq = groqProvider;
