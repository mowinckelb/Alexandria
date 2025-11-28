import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getIngestionTools, getEditorTools } from '@/lib/factory';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

const { refiner, extractor, indexer } = getIngestionTools();
const { editorNotes } = getEditorTools();

/**
 * Chunk text intelligently by paragraphs or max length
 * Preserves semantic coherence where possible
 */
function chunkText(text: string, maxChunkSize = 4000): string[] {
  // First, normalize whitespace and split by double newlines (paragraphs)
  const paragraphs = text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  const chunks: string[] = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    // If paragraph itself is too long, split it further
    if (paragraph.length > maxChunkSize) {
      // Save current chunk if exists
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      
      // Split long paragraph by sentences
      const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
      let sentenceChunk = '';
      
      for (const sentence of sentences) {
        if ((sentenceChunk + sentence).length > maxChunkSize) {
          if (sentenceChunk.trim()) {
            chunks.push(sentenceChunk.trim());
          }
          sentenceChunk = sentence;
        } else {
          sentenceChunk += ' ' + sentence;
        }
      }
      
      if (sentenceChunk.trim()) {
        currentChunk = sentenceChunk.trim();
      }
    }
    // If adding paragraph would exceed limit, save current and start new
    else if ((currentChunk + '\n\n' + paragraph).length > maxChunkSize) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = paragraph;
    }
    // Otherwise, append to current chunk
    else {
      currentChunk = currentChunk ? currentChunk + '\n\n' + paragraph : paragraph;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * POST /api/bulk-ingest
 * Process large text input through the full ingestion pipeline
 * 
 * Body: { text: string, userId: string, source?: string }
 * Returns: Summary of extraction results
 */
export async function POST(req: Request) {
  if (!supabase) {
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  try {
    const { text, userId, source = 'bulk-import' } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'text is required and must be a string' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Track results
    const results = {
      chunksProcessed: 0,
      totalChunks: 0,
      factsExtracted: 0,
      preferencesExtracted: 0,
      opinionsExtracted: 0,
      valuesExtracted: 0,
      entitiesFound: 0,
      memoryItemsStored: 0,
      trainingPairsGenerated: 0,
      editorNotesGenerated: 0,
      errors: [] as string[]
    };

    // Chunk the text
    const chunks = chunkText(text);
    results.totalChunks = chunks.length;

    console.log(`[Bulk Ingest] Processing ${chunks.length} chunks for user ${userId}`);

    // Store the raw entry for reference
    const { error: entryError } = await supabase.from('entries').insert({
      user_id: userId,
      content: text.substring(0, 50000), // Limit stored raw text
      source,
      metadata: { 
        chunks: chunks.length,
        originalLength: text.length 
      }
    });

    if (entryError) {
      console.error('[Bulk Ingest] Failed to store entry:', entryError);
    }

    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`[Bulk Ingest] Processing chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);

      try {
        // 1. Extract structured information
        const extracted = await extractor.structure(chunk);
        
        results.factsExtracted += extracted.facts.length;
        results.preferencesExtracted += (extracted.preferences?.length || 0);
        results.opinionsExtracted += (extracted.opinions?.length || 0);
        results.valuesExtracted += (extracted.values?.length || 0);
        results.entitiesFound += extracted.entities.length;

        // 2. Convert to memory items and store
        const memoryItems = extractor.toMemoryItems(extracted);
        
        for (const item of memoryItems) {
          try {
            await indexer.ingest(item, userId, {
              entities: extracted.entities,
              importance: extracted.importance
            });
            results.memoryItemsStored++;
          } catch (e) {
            const err = e instanceof Error ? e.message : 'Unknown error';
            results.errors.push(`Memory store failed: ${err}`);
          }
        }

        // 3. Generate training pairs for Soul
        try {
          const trainingPairs = await refiner.extractStyle(chunk);
          
          // Store training pairs in database
          for (const pair of trainingPairs) {
            const { error: pairError } = await supabase.from('training_pairs').insert({
              user_id: userId,
              system_prompt: pair.system_prompt,
              user_content: pair.user_content,
              assistant_content: pair.assistant_content,
              quality_score: pair.quality_score
            });

            if (!pairError) {
              results.trainingPairsGenerated++;
            }
          }
        } catch (e) {
          const err = e instanceof Error ? e.message : 'Unknown error';
          results.errors.push(`Training pair generation failed for chunk ${i + 1}: ${err}`);
        }

        // 4. Generate editor notes (questions, observations, gaps)
        try {
          const notes = await editorNotes.analyzeAndGenerateNotes(chunk, userId);
          results.editorNotesGenerated += notes.length;
        } catch (e) {
          const err = e instanceof Error ? e.message : 'Unknown error';
          results.errors.push(`Editor notes generation failed for chunk ${i + 1}: ${err}`);
        }

        results.chunksProcessed++;

      } catch (e) {
        const err = e instanceof Error ? e.message : 'Unknown error';
        results.errors.push(`Chunk ${i + 1} failed: ${err}`);
        console.error(`[Bulk Ingest] Chunk ${i + 1} error:`, e);
      }
    }

    console.log(`[Bulk Ingest] Complete:`, results);

    return NextResponse.json({
      success: true,
      summary: {
        chunksProcessed: results.chunksProcessed,
        totalChunks: results.totalChunks,
        extraction: {
          facts: results.factsExtracted,
          preferences: results.preferencesExtracted,
          opinions: results.opinionsExtracted,
          values: results.valuesExtracted,
          entities: results.entitiesFound
        },
        storage: {
          memoryItems: results.memoryItemsStored,
          trainingPairs: results.trainingPairsGenerated,
          editorNotes: results.editorNotesGenerated
        },
        errors: results.errors.length > 0 ? results.errors.slice(0, 10) : undefined
      }
    });

  } catch (error) {
    console.error('[Bulk Ingest] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
