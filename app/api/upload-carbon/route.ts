import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getIngestionTools, getEditorTools } from '@/lib/factory';
import OpenAI from 'openai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

function chunkText(text: string, maxLength = 4000): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = '';

  for (const para of paragraphs) {
    if (currentChunk.length + para.length > maxLength && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = para;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [text];
}

async function processText(text: string, userId: string, source: string) {
  const { extractor, indexer } = getIngestionTools();
  const { editorNotes } = getEditorTools();
  
  const results = {
    chunksProcessed: 0,
    factsExtracted: 0,
    memoryItemsStored: 0,
    editorNotesGenerated: 0,
    errors: [] as string[]
  };

  const chunks = chunkText(text);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    try {
      const extracted = await extractor.structure(chunk);
      results.factsExtracted += extracted.facts.length;

      const memoryItems = extractor.toMemoryItems(extracted);
      for (const item of memoryItems) {
        try {
          await indexer.ingest(item, userId, {
            entities: extracted.entities,
            importance: extracted.importance
          });
          results.memoryItemsStored++;
        } catch (e) {
          results.errors.push(`Memory store failed: ${e instanceof Error ? e.message : 'Unknown'}`);
        }
      }

      try {
        const notes = await editorNotes.analyzeAndGenerateNotes(chunk, userId);
        results.editorNotesGenerated += notes.length;
      } catch (e) {
        // Non-critical
      }

      results.chunksProcessed++;
    } catch (e) {
      results.errors.push(`Chunk ${i + 1} failed: ${e instanceof Error ? e.message : 'Unknown'}`);
    }
  }

  return results;
}

export async function POST(req: Request) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const fileType = file.type;
    const fileName = file.name;
    let extractedText = '';

    // Handle audio files
    if (fileType.startsWith('audio/') || fileName.match(/\.(mp3|m4a|wav|webm|ogg|flac)$/i)) {
      console.log(`[Upload Carbon] Transcribing audio: ${fileName}`);
      
      const openai = getOpenAI();
      if (!openai) {
        return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
      }
      
      const transcription = await openai.audio.transcriptions.create({
        file: file,
        model: 'whisper-1',
        response_format: 'text'
      });
      
      extractedText = transcription;
    }
    // Handle PDF files - temporarily disabled due to Next.js compatibility issues
    else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      return NextResponse.json({ 
        error: 'PDF support coming soon. For now, please copy text from the PDF and save as .txt file.' 
      }, { status: 400 });
    }
    // Handle text files
    else if (fileType.startsWith('text/') || fileName.match(/\.(txt|md|json|csv)$/i)) {
      console.log(`[Upload Carbon] Reading text file: ${fileName}`);
      extractedText = await file.text();
    }
    else {
      return NextResponse.json({ 
        error: `Unsupported file type: ${fileType}. Supported: audio (mp3, m4a, wav), PDF, text files.` 
      }, { status: 400 });
    }

    if (!extractedText.trim()) {
      return NextResponse.json({ error: 'No text could be extracted from file' }, { status: 400 });
    }

    console.log(`[Upload Carbon] Extracted ${extractedText.length} characters from ${fileName}`);

    // Process the extracted text
    const results = await processText(extractedText, userId, `file:${fileName}`);

    return NextResponse.json({
      success: true,
      fileName,
      textLength: extractedText.length,
      summary: results
    });

  } catch (error) {
    console.error('[Upload Carbon] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
