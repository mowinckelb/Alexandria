import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getIngestionTools, getEditorTools } from '@/lib/factory';
import OpenAI from 'openai';
import { bufferToFile } from '@/lib/utils/audio-chunker';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function updateJobProgress(jobId: string, progress: number) {
  await supabase.from('processing_jobs').update({ progress }).eq('id', jobId);
}

async function completeJob(jobId: string, result: Record<string, unknown>) {
  await supabase.from('processing_jobs').update({
    status: 'completed',
    progress: 100,
    result,
    completed_at: new Date().toISOString()
  }).eq('id', jobId);
}

async function failJob(jobId: string, error: string) {
  await supabase.from('processing_jobs').update({
    status: 'failed',
    error,
    completed_at: new Date().toISOString()
  }).eq('id', jobId);
}

async function transcribeAudio(buffer: Buffer, fileName: string, jobId: string): Promise<string> {
  const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;
  if (!ASSEMBLYAI_API_KEY) throw new Error('ASSEMBLYAI_API_KEY not configured');
  
  const sizeMB = buffer.length / 1024 / 1024;
  console.log(`[ProcessQueue] Transcribing ${fileName} (${sizeMB.toFixed(1)}MB) via AssemblyAI`);
  
  // Step 1: Upload audio to AssemblyAI
  await updateJobProgress(jobId, 15);
  const uploadRes = await fetch('https://api.assemblyai.com/v2/upload', {
    method: 'POST',
    headers: { 'Authorization': ASSEMBLYAI_API_KEY },
    body: new Uint8Array(buffer)
  });
  if (!uploadRes.ok) throw new Error(`AssemblyAI upload failed: ${uploadRes.status}`);
  const { upload_url } = await uploadRes.json();
  
  // Step 2: Request transcription
  await updateJobProgress(jobId, 25);
  const transcriptRes = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: { 
      'Authorization': ASSEMBLYAI_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ audio_url: upload_url })
  });
  if (!transcriptRes.ok) throw new Error(`AssemblyAI transcript request failed: ${transcriptRes.status}`);
  const { id: transcriptId } = await transcriptRes.json();
  
  // Step 3: Poll for completion
  let transcript = null;
  while (!transcript) {
    await new Promise(r => setTimeout(r, 3000)); // Wait 3s between polls
    
    const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
      headers: { 'Authorization': ASSEMBLYAI_API_KEY }
    });
    const data = await pollRes.json();
    
    if (data.status === 'completed') {
      transcript = data.text;
      await updateJobProgress(jobId, 70);
    } else if (data.status === 'error') {
      throw new Error(`AssemblyAI error: ${data.error}`);
    } else {
      // Still processing - update progress estimate
      await updateJobProgress(jobId, Math.min(65, 25 + Math.random() * 30));
    }
  }
  
  return transcript;
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
  
  if (currentChunk.trim()) chunks.push(currentChunk.trim());
  return chunks.length > 0 ? chunks : [text];
}

async function processText(text: string, userId: string, jobId: string) {
  const { extractor, indexer, refiner } = getIngestionTools();
  const { editorNotes } = getEditorTools();
  
  const results = {
    chunksProcessed: 0,
    factsExtracted: 0,
    memoryItemsStored: 0,
    trainingPairsGenerated: 0,
    editorNotesGenerated: 0
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
        } catch {}
      }

      try {
        const trainingPairs = await refiner.extractStyle(chunk);
        for (const pair of trainingPairs) {
          const { error } = await supabase.from('training_pairs').insert({
            user_id: userId,
            system_prompt: pair.system_prompt,
            user_content: pair.user_content,
            assistant_content: pair.assistant_content,
            quality_score: pair.quality_score
          });
          if (!error) results.trainingPairsGenerated++;
        }
      } catch {}

      try {
        const notes = await editorNotes.analyzeAndGenerateNotes(chunk, userId);
        results.editorNotesGenerated += notes.length;
      } catch {}

      results.chunksProcessed++;
      
      // Update progress (text processing is ~30% of work, 70-100)
      const progress = Math.floor(70 + (i + 1) / chunks.length * 30);
      await updateJobProgress(jobId, progress);
    } catch (e) {
      console.error(`[ProcessQueue] Chunk ${i + 1} failed:`, e);
    }
  }

  return results;
}

export async function POST(req: Request) {
  // Optional auth check for cron
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Allow without auth for now, but log
    console.log('[ProcessQueue] No cron auth, processing anyway');
  }

  try {
    // Get next pending job
    const { data: jobs, error } = await supabase.rpc('get_next_pending_job');
    
    if (error) {
      console.error('[ProcessQueue] Failed to get job:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ message: 'No pending jobs' });
    }

    const job = jobs[0];
    console.log(`[ProcessQueue] Processing job ${job.id}: ${job.file_name}`);

    try {
      // Download file from storage
      await updateJobProgress(job.id, 5);
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('carbon-uploads')
        .download(job.storage_path);

      if (downloadError || !fileData) {
        throw new Error(`Download failed: ${downloadError?.message}`);
      }

      const buffer = Buffer.from(await fileData.arrayBuffer());
      await updateJobProgress(job.id, 10);
      console.log(`[ProcessQueue] Downloaded ${(buffer.length / 1024 / 1024).toFixed(1)}MB`);

      let extractedText = '';
      const contextPrefix = job.context ? `[Context: ${job.context}]\n\n` : '';

      // Handle audio files
      if (job.file_type.startsWith('audio/') || job.file_name.match(/\.(mp3|m4a|wav|webm|ogg|flac)$/i)) {
        extractedText = await transcribeAudio(buffer, job.file_name, job.id);
      }
      // Handle PDF
      else if (job.file_type === 'application/pdf' || job.file_name.endsWith('.pdf')) {
        const pdfFile = bufferToFile(buffer, job.file_name, 'application/pdf');
        const uploadedFile = await openai.files.create({ file: pdfFile, purpose: 'assistants' });
        
        const assistant = await openai.beta.assistants.create({
          name: 'PDF Extractor',
          instructions: 'Extract ALL text from the PDF. Return ONLY the text.',
          model: 'gpt-4o',
          tools: [{ type: 'file_search' }]
        });

        const thread = await openai.beta.threads.create({
          messages: [{
            role: 'user',
            content: 'Extract all text from this PDF.',
            attachments: [{ file_id: uploadedFile.id, tools: [{ type: 'file_search' }] }]
          }]
        });

        const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
          assistant_id: assistant.id
        }, { pollIntervalMs: 2000 });

        if (run.status === 'completed') {
          const messages = await openai.beta.threads.messages.list(thread.id);
          const msg = messages.data.find(m => m.role === 'assistant');
          if (msg?.content[0]?.type === 'text') {
            extractedText = msg.content[0].text.value;
          }
        }

        await openai.beta.assistants.delete(assistant.id);
        await openai.files.delete(uploadedFile.id);
        await updateJobProgress(job.id, 70);
      }
      // Handle text
      else if (job.file_type.startsWith('text/') || job.file_name.match(/\.(txt|md|json|csv)$/i)) {
        extractedText = buffer.toString('utf-8');
        await updateJobProgress(job.id, 70);
      }
      else {
        throw new Error(`Unsupported file type: ${job.file_type}`);
      }

      if (!extractedText.trim()) {
        throw new Error('No text extracted');
      }

      // Store raw entry
      await supabase.from('entries').insert({
        user_id: job.user_id,
        content: extractedText.substring(0, 100000),
        source: job.file_type.startsWith('audio/') ? 'upload:audio' : 
                job.file_type === 'application/pdf' ? 'upload:pdf' : 'upload:text',
        metadata: {
          fileName: job.file_name,
          fileType: job.file_type,
          fileSize: job.file_size,
          jobId: job.id,
          context: job.context
        }
      });

      // Process text
      const results = await processText(contextPrefix + extractedText, job.user_id, job.id);

      // Clean up storage
      await supabase.storage.from('carbon-uploads').remove([job.storage_path]);

      // Complete job
      await completeJob(job.id, {
        textLength: extractedText.length,
        ...results
      });

      console.log(`[ProcessQueue] Job ${job.id} completed`);
      return NextResponse.json({ success: true, jobId: job.id, results });

    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      console.error(`[ProcessQueue] Job ${job.id} failed:`, e);
      await failJob(job.id, errorMsg);
      return NextResponse.json({ error: errorMsg, jobId: job.id }, { status: 500 });
    }

  } catch (e) {
    console.error('[ProcessQueue] Error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// GET to check queue status
export async function GET() {
  const { data, error } = await supabase
    .from('processing_jobs')
    .select('status, count:id')
    .in('status', ['pending', 'processing']);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const pending = data?.find(d => d.status === 'pending')?.count || 0;
  const processing = data?.find(d => d.status === 'processing')?.count || 0;

  return NextResponse.json({ pending, processing });
}
