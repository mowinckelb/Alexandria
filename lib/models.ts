/**
 * Model & Provider Configuration
 * 
 * Centralized model selection. Model-agnostic by design (Axiom).
 * 
 * Priority chain: Anthropic (if key set) → Groq → Together AI fallback
 * 
 * Env vars:
 *   ANTHROPIC_API_KEY  - Anthropic (Claude) — best quality, recommended
 *   GROQ_API_KEY       - Groq (Llama) — fast and free-tier friendly
 *   TOGETHER_API_KEY   - Together AI — embeddings, PLM fine-tuning, fallback LLM
 *   OPENAI_API_KEY     - OpenAI — Whisper, Assistants, Vision
 */

import { type LanguageModel } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { createTogetherAI } from '@ai-sdk/togetherai';
import { createAnthropic } from '@ai-sdk/anthropic';
import Together from 'together-ai';
import OpenAI from 'openai';

// ============================================================================
// Provider Instances
// ============================================================================

export const groqProvider = createGroq({ apiKey: process.env.GROQ_API_KEY });
export const togetherProvider = createTogetherAI({ apiKey: process.env.TOGETHER_API_KEY });
export const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const togetherClient = new Together({ apiKey: process.env.TOGETHER_API_KEY });

const anthropicProvider = process.env.ANTHROPIC_API_KEY
  ? createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

// ============================================================================
// Model Getters — priority: Anthropic → Groq → Together
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
  return togetherProvider('meta-llama/Llama-3.3-70B-Instruct-Turbo') as LanguageModel;
}

export function getModelConfig() {
  const provider = anthropicProvider ? 'anthropic' : 'groq';
  return {
    provider,
    quality: anthropicProvider ? 'claude-sonnet-4-6' : (process.env.GROQ_QUALITY_MODEL || 'llama-3.3-70b-versatile'),
    fast: anthropicProvider ? 'claude-sonnet-4-6' : (process.env.GROQ_FAST_MODEL || 'llama-3.1-8b-instant'),
    embeddings: 'BAAI/bge-base-en-v1.5',
    plm: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
  };
}

export const groq = groqProvider;

