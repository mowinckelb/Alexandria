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
  const { extractor, indexer, refiner } = getIngestionTools();
  const { editorNotes } = getEditorTools();
  const supabase = getSupabase();
  
  const results = {
    chunksProcessed: 0,
    factsExtracted: 0,
    memoryItemsStored: 0,
    trainingPairsGenerated: 0,
    editorNotesGenerated: 0,
    errors: [] as string[]
  };

  const chunks = chunkText(text);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    try {
      // 1. Extract structured information (Memory)
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

      // 2. Generate training pairs (Soul)
      if (supabase) {
        try {
          const trainingPairs = await refiner.extractStyle(chunk);
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
          results.errors.push(`Training pair generation failed: ${e instanceof Error ? e.message : 'Unknown'}`);
        }
      }

      // 3. Generate editor notes (Questions, Observations, Gaps)
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
    // Handle PDF via OpenAI Assistants API (native PDF parsing for max fidelity)
    else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      console.log(`[Upload Carbon] Processing PDF via Assistants API: ${fileName}`);
      
      const openai = getOpenAI();
      if (!openai) {
        return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
      }

      try {
        // 1. Upload file to OpenAI
        const uploadedFile = await openai.files.create({
          file: file,
          purpose: 'assistants'
        });
        console.log(`[Upload Carbon] File uploaded: ${uploadedFile.id}`);

        // 2. Create assistant for text extraction
        const assistant = await openai.beta.assistants.create({
          name: 'PDF Text Extractor',
          instructions: 'Extract ALL text from the uploaded PDF document. Return ONLY the extracted text, preserving the original structure and formatting as much as possible. Do not add any commentary, headers, or description. Just the raw text from the document.',
          model: 'gpt-4o',
          tools: [{ type: 'file_search' }]
        });

        // 3. Create thread with file
        const thread = await openai.beta.threads.create({
          messages: [
            {
              role: 'user',
              content: 'Extract all text from this PDF document. Return only the text content, no commentary.',
              attachments: [
                {
                  file_id: uploadedFile.id,
                  tools: [{ type: 'file_search' }]
                }
              ]
            }
          ]
        });

        // 4. Run the assistant
        let run = await openai.beta.threads.runs.create(thread.id, {
          assistant_id: assistant.id
        });

        // 5. Poll for completion (max 120 seconds)
        const maxWait = 120000;
        const startTime = Date.now();
        const runId = run.id;
        while (run.status === 'queued' || run.status === 'in_progress') {
          if (Date.now() - startTime > maxWait) {
            throw new Error('PDF processing timed out');
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
          // @ts-expect-error - OpenAI SDK types are inconsistent
          run = await openai.beta.threads.runs.retrieve(thread.id, runId);
        }

        if (run.status !== 'completed') {
          throw new Error(`Run failed with status: ${run.status}`);
        }

        // 6. Get the response
        const messages = await openai.beta.threads.messages.list(thread.id);
        const assistantMessage = messages.data.find(m => m.role === 'assistant');
        
        if (assistantMessage && assistantMessage.content[0]?.type === 'text') {
          extractedText = assistantMessage.content[0].text.value;
        }

        // 7. Cleanup
        await openai.beta.assistants.delete(assistant.id);
        await openai.files.delete(uploadedFile.id);

      } catch (pdfError) {
        console.error('[Upload Carbon] Assistants API error:', pdfError);
        return NextResponse.json({ 
          error: `PDF processing failed: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}` 
        }, { status: 400 });
      }
    }
    // Handle images via Vision API
    else if (fileType.startsWith('image/')) {
      console.log(`[Upload Carbon] Processing image via Vision API: ${fileName}`);
      
      const openai = getOpenAI();
      if (!openai) {
        return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString('base64');
      const mimeType = fileType || 'application/octet-stream';
      
      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Extract ALL text from this image. Return ONLY the extracted text, preserving the original structure and formatting as much as possible. Do not add any commentary or description.'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${base64}`
                  }
                }
              ]
            }
          ],
          max_tokens: 4096
        });
        
        extractedText = response.choices[0]?.message?.content || '';
      } catch (visionError) {
        console.error('[Upload Carbon] Vision API error:', visionError);
        return NextResponse.json({ 
          error: 'Failed to extract text from image. Try a clearer image or convert to text manually.' 
        }, { status: 400 });
      }
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

    // Store raw carbon to entries (axiomatic data preservation)
    const supabase = getSupabase();
    if (supabase) {
      const sourceType = fileType.startsWith('audio/') ? 'upload:audio' 
        : (fileType === 'application/pdf' || fileName.endsWith('.pdf')) ? 'upload:pdf'
        : fileType.startsWith('image/') ? 'upload:image'
        : 'upload:text';
      
      const { error: entryError } = await supabase.from('entries').insert({
        user_id: userId,
        content: extractedText.substring(0, 100000), // Store up to 100k chars
        source: sourceType,
        metadata: {
          fileName,
          fileType,
          fileSize: file.size,
          extractedLength: extractedText.length,
          uploadedAt: new Date().toISOString()
        }
      });
      
      if (entryError) {
        console.error('[Upload Carbon] Failed to store raw entry:', entryError);
        // Non-fatal - continue processing
      } else {
        console.log(`[Upload Carbon] Stored raw carbon entry (${sourceType})`);
      }
    }

    // Process the extracted text
    const results = await processText(extractedText, userId, `file:${fileName}`);

    return NextResponse.json({
      success: true,
      fileName,
      textLength: extractedText.length,
      rawCarbonStored: true,
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
