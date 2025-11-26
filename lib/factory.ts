import { GroqRefiner } from './modules/subjective/refiner';
import { GroqExtractor } from './modules/objective/extractor';
import { TogetherTuner } from './modules/subjective/tuner';
import { SupabaseIndexer } from './modules/objective/indexer';

// Singletons
const refiner = new GroqRefiner();
const extractor = new GroqExtractor();
const tuner = new TogetherTuner();
const indexer = new SupabaseIndexer();

export function getIngestionTools() {
  return { refiner, extractor, tuner, indexer };
}

export function getBrainTools() {
  return { indexer };
}

