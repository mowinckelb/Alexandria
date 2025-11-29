// @CRITICAL: Module initialization - all processing depends on these modules loading
// Verify: modules load without error, functions return expected types
import { GroqRefiner } from './modules/subjective/refiner';
import { GroqExtractor } from './modules/objective/extractor';
import { TogetherTuner } from './modules/subjective/tuner';
import { SupabaseIndexer } from './modules/objective/indexer';
import { FeedbackProcessor } from './modules/rlhf/feedback-processor';
import { PersonalityExtractor } from './modules/migration/personality-extractor';
import { Distiller } from './modules/migration/distiller';
import { MigrationOrchestrator } from './modules/migration/orchestrator';
import { AdaptiveMigrationOrchestrator } from './modules/migration/adaptive-orchestrator';
import { RLAIFAmplifier } from './modules/migration/rlaif-amplifier';
import { RewardCalibrator } from './modules/migration/reward-calibrator';
import { DynamicAssessor } from './modules/migration/dynamic-assessor';
import { TrainingAssessor } from './modules/training/training-assessor';
import { DecisionEditor } from './modules/core/decision-editor';
import { EditorNotes } from './modules/core/editor-notes';

// Singletons
const refiner = new GroqRefiner();
const extractor = new GroqExtractor();
const tuner = new TogetherTuner();
const indexer = new SupabaseIndexer();
const feedbackProcessor = new FeedbackProcessor();
const personalityExtractor = new PersonalityExtractor();
const distiller = new Distiller();
const migrationOrchestrator = new MigrationOrchestrator();
const adaptiveMigrationOrchestrator = new AdaptiveMigrationOrchestrator();
const rlaifAmplifier = new RLAIFAmplifier();
const rewardCalibrator = new RewardCalibrator();
const dynamicAssessor = new DynamicAssessor();
const trainingAssessor = new TrainingAssessor();
const decisionEditor = new DecisionEditor();
const editorNotes = new EditorNotes();

export function getIngestionTools() {
  return { refiner, extractor, tuner, indexer };
}

export function getBrainTools() {
  return { refiner, extractor, indexer };
}

export function getRLHFTools() {
  return { feedbackProcessor };
}

export function getMigrationTools() {
  return { 
    personalityExtractor, 
    distiller, 
    migrationOrchestrator,
    adaptiveMigrationOrchestrator,
    rlaifAmplifier,
    rewardCalibrator,
    dynamicAssessor
  };
}

export function getTrainingTools() {
  return { trainingAssessor, tuner };
}

export function getCoreTools() {
  return { decisionEditor, editorNotes };
}

export function getEditorTools() {
  return { editorNotes };
}

