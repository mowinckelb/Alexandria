import { GroqRefiner } from './modules/subjective/refiner';
import { GroqExtractor } from './modules/objective/extractor';
import { TogetherTuner } from './modules/subjective/tuner';
import { SupabaseIndexer } from './modules/objective/indexer';
import { FeedbackProcessor } from './modules/rlhf/feedback-processor';

// Singletons
const refiner = new GroqRefiner();
const extractor = new GroqExtractor();
const tuner = new TogetherTuner();
const indexer = new SupabaseIndexer();
const feedbackProcessor = new FeedbackProcessor();

export function getIngestionTools() {
  return { refiner, extractor, tuner, indexer };
}

export function getBrainTools() {
  return { refiner, extractor, indexer };
}

export function getRLHFTools() {
  return { feedbackProcessor };
}

