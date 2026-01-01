/**
 * Model Configuration
 * 
 * Centralized model selection via environment variables.
 * Change models without touching code.
 * 
 * Env vars:
 *   GROQ_FAST_MODEL   - Fast operations (Editor, RLAIF) - default: llama-3.1-8b-instant
 *   GROQ_QUALITY_MODEL - Quality operations (Orchestrator, extraction) - default: llama-3.3-70b-versatile
 */

import { groq } from '@ai-sdk/groq';

// Defaults - update these when new models release
const DEFAULTS = {
  fast: 'llama-3.1-8b-instant',
  quality: 'llama-3.3-70b-versatile'
} as const;

/**
 * Get the fast model (Editor conversations, RLAIF evaluation)
 * Optimized for speed over quality
 */
export function getFastModel() {
  const modelId = process.env.GROQ_FAST_MODEL || DEFAULTS.fast;
  return groq(modelId);
}

/**
 * Get the quality model (Orchestrator, extraction, structured output)
 * Optimized for quality over speed
 */
export function getQualityModel() {
  const modelId = process.env.GROQ_QUALITY_MODEL || DEFAULTS.quality;
  return groq(modelId);
}

/**
 * Get model IDs for logging/debugging
 */
export function getModelConfig() {
  return {
    fast: process.env.GROQ_FAST_MODEL || DEFAULTS.fast,
    quality: process.env.GROQ_QUALITY_MODEL || DEFAULTS.quality
  };
}

// Re-export for direct use if needed
export { groq };

