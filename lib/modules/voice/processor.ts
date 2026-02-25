/**
 * Voice Processor Module
 * Handles voice note transcription and processing for Phase 0 Bootstrap.
 * 
 * Flow:
 * 1. Download audio from storage
 * 2. Transcribe via Whisper API (with chunking for large files)
 * 3. Save raw audio to Vault
 * 4. Save transcript to Vault
 * 5. Process transcript through Editor.converse() for high-quality extraction
 * 6. Track progress in processing_jobs
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { getEditor } from '@/lib/factory';
import { saveToVault } from '@/lib/utils/vault';
import { needsChunking, chunkAudioBuffer, bufferToFile } from '@/lib/utils/audio-chunker';

// ============================================================================
// Types
// ============================================================================

export interface AudioFile {
  storagePath: string;  // Path in Supabase Storage
  fileName: string;     // Original filename
  context?: string;     // Optional context about the recording
}

export interface ProcessingResult {
  fileName: string;
  transcriptLength: number;
  trainingPairsGenerated: number;
  memoriesStored: number;
  editorNotesGenerated: number;
  vaultPaths: {
    audio: string;
    transcript: string;
  };
}

export interface BatchResult {
  jobId: string;
  status: 'completed' | 'failed' | 'partial';
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  results: ProcessingResult[];
  errors: string[];
  stats: {
    totalTranscriptWords: number;
    totalTrainingPairs: number;
    totalMemories: number;
    totalEditorNotes: number;
  };
}

// ============================================================================
// Voice Processor Class
// ============================================================================

export class VoiceProcessor {
  private supabase: SupabaseClient;
  private openai: OpenAI;
  
  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }
    if (!openaiKey) {
      throw new Error('OpenAI API key missing');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.openai = new OpenAI({ apiKey: openaiKey });
  }
  
  // ==========================================================================
  // Public Methods
  // ==========================================================================
  
  /**
   * Process a batch of voice files
   * Creates a job, processes each file, updates progress
   */
  async processBatch(
    files: AudioFile[],
    userId: string,
    jobId: string
  ): Promise<BatchResult> {
    const results: ProcessingResult[] = [];
    const errors: string[] = [];
    
    const stats = {
      totalTranscriptWords: 0,
      totalTrainingPairs: 0,
      totalMemories: 0,
      totalEditorNotes: 0
    };
    
    // Update job to running
    await this.updateJobStatus(jobId, 'running', 0, files.length);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        console.log(`[VoiceProcessor] Processing file ${i + 1}/${files.length}: ${file.fileName}`);
        
        const result = await this.processSingleFile(file, userId, jobId);
        results.push(result);
        
        // Update stats
        const wordCount = result.transcriptLength / 5; // Rough estimate
        stats.totalTranscriptWords += wordCount;
        stats.totalTrainingPairs += result.trainingPairsGenerated;
        stats.totalMemories += result.memoriesStored;
        stats.totalEditorNotes += result.editorNotesGenerated;
        
        // Update job progress
        await this.updateJobProgress(jobId, i + 1, {
          processedFiles: i + 1,
          lastProcessed: file.fileName,
          stats
        });
        
      } catch (error) {
        const errorMsg = `Failed to process ${file.fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(`[VoiceProcessor] ${errorMsg}`);
        errors.push(errorMsg);
        
        // Update progress even on error
        await this.updateJobProgress(jobId, i + 1, {
          processedFiles: i + 1,
          lastError: errorMsg,
          stats
        });
      }
    }
    
    // Determine final status
    const status = errors.length === 0 
      ? 'completed' 
      : errors.length === files.length 
        ? 'failed' 
        : 'partial';
    
    // Mark job complete
    await this.completeJob(jobId, status, {
      results: results.map(r => ({
        fileName: r.fileName,
        transcriptLength: r.transcriptLength,
        trainingPairs: r.trainingPairsGenerated,
        memories: r.memoriesStored
      })),
      errors,
      stats
    });

    await this.logActivity(userId, 'voice_bootstrap_completed', `Voice bootstrap ${status}: ${results.length}/${files.length} files processed`, {
      jobId,
      status,
      totalFiles: files.length,
      processedFiles: results.length,
      failedFiles: errors.length,
      stats
    });
    
    return {
      jobId,
      status,
      totalFiles: files.length,
      processedFiles: results.length,
      failedFiles: errors.length,
      results,
      errors,
      stats
    };
  }
  
  /**
   * Process a single voice file
   */
  async processSingleFile(
    file: AudioFile,
    userId: string,
    jobId?: string
  ): Promise<ProcessingResult> {
    // 1. Download from storage
    const buffer = await this.downloadFromStorage(file.storagePath);
    
    // 2. Transcribe via Whisper
    const transcript = await this.transcribe(buffer, file.fileName);
    
    // 3. Generate timestamp for Vault paths
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseName = file.fileName.replace(/\.[^.]+$/, '');
    
    // 4. Save raw audio to Vault
    const audioPath = `raw/voice/${timestamp}-${file.fileName}`;
    await saveToVault(userId, audioPath, buffer, 'audio', {
      originalName: file.fileName,
      metadata: {
        sourceStoragePath: file.storagePath,
        jobId,
        context: file.context,
        transcribedAt: new Date().toISOString()
      }
    });
    
    // 5. Save transcript to Vault
    const transcriptPath = `transcripts/${timestamp}-${baseName}.txt`;
    await saveToVault(userId, transcriptPath, transcript, 'transcript', {
      originalName: `${baseName}.txt`,
      metadata: {
        sourceStoragePath: file.storagePath,
        jobId,
        context: file.context,
        sourceAudio: file.fileName,
        wordCount: transcript.split(/\s+/).length
      }
    });

    // Store transcript as raw entry for downstream indexing and auditing.
    await this.storeTranscriptEntry(userId, transcript, file, jobId);
    
    // 6. Process transcript through Editor for high-quality extraction
    const extractionResult = await this.processTranscript(transcript, userId, file.context);
    
    return {
      fileName: file.fileName,
      transcriptLength: transcript.length,
      trainingPairsGenerated: extractionResult.trainingPairs,
      memoriesStored: extractionResult.memories,
      editorNotesGenerated: extractionResult.notes,
      vaultPaths: {
        audio: audioPath,
        transcript: transcriptPath
      }
    };
  }
  
  /**
   * Transcribe audio buffer using Whisper API
   */
  async transcribe(buffer: Buffer, fileName: string): Promise<string> {
    const mimeType = this.getMimeType(fileName);
    
    if (!needsChunking(buffer.length)) {
      // Single request
      const file = bufferToFile(buffer, fileName, mimeType);
      const transcription = await this.openai.audio.transcriptions.create({
        file: file,
        model: 'whisper-1',
        response_format: 'text'
      });
      return transcription;
    }
    
    // Large file - chunk and transcribe
    console.log(`[VoiceProcessor] Large file (${(buffer.length / 1024 / 1024).toFixed(1)}MB), chunking...`);
    const chunks = chunkAudioBuffer(buffer, fileName);
    const transcripts: string[] = [];
    
    for (const chunk of chunks) {
      console.log(`[VoiceProcessor] Transcribing chunk ${chunk.index + 1}/${chunk.totalChunks}`);
      const chunkFile = bufferToFile(chunk.buffer, `${fileName}_part${chunk.index}`, mimeType);
      const transcription = await this.openai.audio.transcriptions.create({
        file: chunkFile,
        model: 'whisper-1',
        response_format: 'text'
      });
      transcripts.push(transcription);
    }
    
    return transcripts.join(' ');
  }
  
  /**
   * Process transcript through Editor for high-quality subjective extraction
   */
  async processTranscript(
    transcript: string,
    userId: string,
    context?: string
  ): Promise<{ trainingPairs: number; memories: number; notes: number }> {
    const editor = getEditor();
    
    // Add context prefix if provided
    const textToProcess = context 
      ? `[Voice note context: ${context}]\n\n${transcript}`
      : transcript;
    
    // Chunk large transcripts to avoid overwhelming the Editor
    const chunks = this.chunkText(textToProcess, 4000);
    
    let totalTrainingPairs = 0;
    let totalNotes = 0;
    
    for (const chunk of chunks) {
      try {
        // Use Editor.converse() for high-quality extraction
        // This generates training pairs, memories, and editor notes
        const response = await editor.converse(chunk, userId, []);
        
        totalTrainingPairs += response.extraction.subjective.length;
        totalNotes += response.notepadUpdates.observations.length +
                      response.notepadUpdates.gaps.length +
                      response.notepadUpdates.mentalModels.length;
        
      } catch (error) {
        console.error('[VoiceProcessor] Editor processing failed for chunk:', error);
        // Continue with other chunks
      }
    }
    
    return {
      trainingPairs: totalTrainingPairs,
      memories: 0,
      notes: totalNotes
    };
  }
  
  // ==========================================================================
  // Job Management
  // ==========================================================================
  
  /**
   * Create a new processing job
   */
  async createJob(
    userId: string,
    jobType: string,
    totalItems: number
  ): Promise<string> {
    const { data, error } = await this.supabase
      .from('processing_jobs')
      .insert({
        user_id: userId,
        job_type: jobType,
        status: 'pending',
        total_items: totalItems,
        processed_items: 0,
        results: {}
      })
      .select('id')
      .single();
    
    if (error || !data) {
      throw new Error(`Failed to create job: ${error?.message}`);
    }
    
    return data.id;
  }
  
  /**
   * Get job status
   */
  async getJob(jobId: string): Promise<{
    id: string;
    userId: string;
    jobType: string;
    status: string;
    totalItems: number;
    processedItems: number;
    results: Record<string, unknown>;
    error: string | null;
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
  } | null> {
    const { data, error } = await this.supabase
      .from('processing_jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return {
      id: data.id,
      userId: data.user_id,
      jobType: data.job_type,
      status: data.status,
      totalItems: data.total_items,
      processedItems: data.processed_items,
      results: data.results || {},
      error: data.error,
      createdAt: data.created_at,
      startedAt: data.started_at,
      completedAt: data.completed_at
    };
  }
  
  // ==========================================================================
  // Private Helpers
  // ==========================================================================
  
  private async downloadFromStorage(storagePath: string): Promise<Buffer> {
    const { data, error } = await this.supabase.storage
      .from('carbon-uploads')
      .download(storagePath);
    
    if (error || !data) {
      throw new Error(`Failed to download ${storagePath}: ${error?.message}`);
    }
    
    return Buffer.from(await data.arrayBuffer());
  }
  
  private async updateJobStatus(
    jobId: string,
    status: string,
    processedItems: number,
    totalItems?: number
  ): Promise<void> {
    const update: Record<string, unknown> = {
      status,
      processed_items: processedItems
    };
    
    if (status === 'running') {
      update.started_at = new Date().toISOString();
    }
    
    if (totalItems !== undefined) {
      update.total_items = totalItems;
    }
    
    await this.supabase
      .from('processing_jobs')
      .update(update)
      .eq('id', jobId);
  }
  
  private async updateJobProgress(
    jobId: string,
    processedItems: number,
    results: Record<string, unknown>
  ): Promise<void> {
    await this.supabase
      .from('processing_jobs')
      .update({
        processed_items: processedItems,
        results
      })
      .eq('id', jobId);
  }
  
  private async completeJob(
    jobId: string,
    status: string,
    results: Record<string, unknown>
  ): Promise<void> {
    await this.supabase
      .from('processing_jobs')
      .update({
        status,
        results,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);
  }
  
  private getMimeType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'm4a': return 'audio/mp4';
      case 'mp3': return 'audio/mpeg';
      case 'wav': return 'audio/wav';
      case 'webm': return 'audio/webm';
      case 'ogg': return 'audio/ogg';
      case 'flac': return 'audio/flac';
      default: return 'audio/mpeg';
    }
  }
  
  private chunkText(text: string, maxLength: number): string[] {
    if (text.length <= maxLength) {
      return [text];
    }
    
    const chunks: string[] = [];
    const paragraphs = text.split(/\n\n+/);
    let currentChunk = '';
    
    for (const para of paragraphs) {
      if (currentChunk.length + para.length > maxLength && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = para;
      } else {
        currentChunk = currentChunk ? currentChunk + '\n\n' + para : para;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.length > 0 ? chunks : [text];
  }

  private async storeTranscriptEntry(
    userId: string,
    transcript: string,
    file: AudioFile,
    jobId?: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('entries')
      .insert({
        user_id: userId,
        content: transcript.substring(0, 100000),
        source: 'voice_bootstrap',
        metadata: {
          fileName: file.fileName,
          storagePath: file.storagePath,
          context: file.context || null,
          jobId: jobId || null
        }
      });

    if (error) {
      throw new Error(`Failed to store transcript entry: ${error.message}`);
    }
  }

  private async logActivity(
    userId: string,
    actionType: string,
    summary: string,
    details: Record<string, unknown>
  ): Promise<void> {
    try {
      await this.supabase.from('persona_activity').insert({
        user_id: userId,
        action_type: actionType,
        summary,
        details,
        requires_attention: false
      });
    } catch {
      // Non-blocking telemetry write.
    }
  }
}
