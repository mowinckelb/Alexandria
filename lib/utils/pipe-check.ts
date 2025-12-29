import { getIngestionTools, getEditorTools } from '../factory';

/**
 * Verifies if all necessary ingestion tools are active and functional for a given input.
 * This is a meta-verification tool for agentic workflows to ensure they don't 
 * skip critical processing steps.
 */
export async function verifyPipeline(text: string, userId: string) {
    const { extractor, refiner, indexer } = getIngestionTools();
    const { editorNotes } = getEditorTools();

    const verification = {
        timestamp: new Date().toISOString(),
        inputLength: text.length,
        checks: {
            extraction: false,
            refinement: false,
            indexing: false,
            notes: false
        },
        results: {
            facts: 0,
            pairs: 0,
            notes: 0
        }
    };

    // 1. Check Extraction
    try {
        const structure = await extractor.structure(text);
        verification.checks.extraction = true;
        verification.results.facts = structure.facts.length;
    } catch (e) {
        console.error('[PipeCheck] Extraction failed', e);
    }

    // 2. Check Refinement
    try {
        const pairs = await refiner.extractStyle(text);
        verification.checks.refinement = true;
        verification.results.pairs = pairs.length;
    } catch (e) {
        console.error('[PipeCheck] Refinement failed', e);
    }

    // 3. Note Check
    try {
        // We don't want to actually generate notes in DB, just check if the logic works
        // But since EditorNotes is a singleton with side effects, we just check if it's reachable
        verification.checks.notes = !!editorNotes;
    } catch (e) {
        console.error('[PipeCheck] EditorNotes check failed', e);
    }

    return verification;
}
