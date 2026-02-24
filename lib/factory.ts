// @CRITICAL: Module initialization - all processing depends on these modules loading
// Verify: modules load without error, functions return expected types

// NEW: Editor + Orchestrator (consolidated architecture)
import { Editor } from './modules/core/editor';
import { Orchestrator } from './modules/core/orchestrator';

// PHASE 0: Voice Processing
import { VoiceProcessor } from './modules/voice/processor';

// PHASE 1: Constitution
import { ConstitutionManager } from './modules/constitution/manager';

// LEGACY: Keep for backward compatibility during transition
import { GroqRefiner } from './modules/subjective/refiner';
import { GroqExtractor } from './modules/objective/extractor';
import { TogetherTuner } from './modules/subjective/tuner';
import { SupabaseIndexer } from './modules/objective/indexer';
import { FeedbackProcessor } from './modules/rlhf/feedback-processor';
import { TrainingAssessor } from './modules/training/training-assessor';
import { EditorNotes } from './modules/core/editor-notes';

// ============================================================================
// NEW: Primary exports for unified architecture
// ============================================================================

// Singletons for new architecture
let editor: Editor | null = null;
let orchestrator: Orchestrator | null = null;
let voiceProcessor: VoiceProcessor | null = null;
let constitutionManager: ConstitutionManager | null = null;

/**
 * Get the Editor (biographer that converses with Author)
 * Consolidates: Extractor, Refiner, EditorNotes
 */
export function getEditor(): Editor {
  if (!editor) {
    editor = new Editor();
  }
  return editor;
}

/**
 * Get the Orchestrator (handles PLM output to Users)
 * Combines: PLM model + Memories + Constitution
 */
export function getOrchestrator(): Orchestrator {
  if (!orchestrator) {
    orchestrator = new Orchestrator();
  }
  return orchestrator;
}

/**
 * Get the VoiceProcessor (Phase 0: Voice Notes Bootstrap)
 * Handles transcription and processing of voice notes
 */
export function getVoiceProcessor(): VoiceProcessor {
  if (!voiceProcessor) {
    voiceProcessor = new VoiceProcessor();
  }
  return voiceProcessor;
}

/**
 * Get the ConstitutionManager (Phase 1: Formalize Constitution)
 * Handles extraction, storage, and retrieval of Constitution documents
 */
export function getConstitutionManager(): ConstitutionManager {
  if (!constitutionManager) {
    constitutionManager = new ConstitutionManager();
  }
  return constitutionManager;
}

// ============================================================================
// Pipeline Tools (for non-conversational data processing)
// Used by upload-carbon, bulk-ingest, process-queue, etc.
// Editor.converse() handles conversational extraction;
// these handle raw file/text ingestion pipelines.
// ============================================================================

const refiner = new GroqRefiner();
const extractor = new GroqExtractor();
const tuner = new TogetherTuner();
const indexer = new SupabaseIndexer();
const editorNotes = new EditorNotes();
const feedbackProcessor = new FeedbackProcessor();
const trainingAssessor = new TrainingAssessor();

/**
 * Get pipeline tools for raw data ingestion (files, bulk text)
 * For conversational extraction, use getEditor().converse() instead.
 */
export function getPipelineTools() {
  return { refiner, extractor, tuner, indexer, editorNotes };
}

export function getRLHFTools() {
  return { feedbackProcessor };
}

export function getTrainingTools() {
  return { trainingAssessor, tuner };
}
