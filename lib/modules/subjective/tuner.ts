/**
 * TogetherTuner: Handles file upload and fine-tuning via Together AI API
 * 
 * Uses Python SDK for file uploads (JS SDK has a bug with signed URL uploads).
 * Requires Node.js runtime (export const runtime = 'nodejs' in route.ts).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execSync } from 'child_process';

export interface UploadResult {
  fileId: string;
  filename: string;
  bytes: number;
}

export interface TrainingJobResult {
  jobId: string;
  status: string;
  model: string;
}

export interface JobStatus {
  id: string;
  status: 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  model: string;
  training_file: string;
  output_name?: string;
  created_at: string;
  updated_at?: string;
  finished_at?: string;
  error?: string;
  // Training progress
  epochs_completed?: number;
  total_epochs?: number;
  steps_completed?: number;
  // Resulting model
  fine_tuned_model?: string;
}

export interface FileInfo {
  id: string;
  filename: string;
  bytes: number;
  purpose: string;
  created_at: number;
}

export class TogetherTuner {
  private apiKey = process.env.TOGETHER_API_KEY;
  private baseUrl = 'https://api.together.xyz/v1';
  private lastTrainError: string | null = null;
  private lastUploadError: string | null = null;
  private parseUploadOutput(raw: string): { id?: string; filename?: string; bytes?: number; error?: string } | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    // Fast path: strict JSON output.
    try {
      return JSON.parse(trimmed) as { id?: string; filename?: string; bytes?: number; error?: string };
    } catch {
      // fall through
    }

    // Some environments prepend warnings/log lines before JSON.
    const lines = trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        return JSON.parse(lines[i]) as { id?: string; filename?: string; bytes?: number; error?: string };
      } catch {
        // keep scanning
      }
    }

    // Last resort: parse trailing JSON object if present.
    const objectStart = trimmed.lastIndexOf('{');
    if (objectStart >= 0) {
      const candidate = trimmed.slice(objectStart);
      try {
        return JSON.parse(candidate) as { id?: string; filename?: string; bytes?: number; error?: string };
      } catch {
        // ignore
      }
    }

    return null;
  }

  private uploadViaApi = async (jsonl: string, filename: string, fileSize: number): Promise<UploadResult | null> => {
    this.lastUploadError = null;
    try {
      const form = new FormData();
      form.append('purpose', 'fine-tune');
      form.append('file', new Blob([jsonl], { type: 'application/jsonl' }), filename);

      const response = await fetch(`${this.baseUrl}/files`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`
        },
        body: form
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[TogetherTuner] REST upload failed: ${response.status} - ${errorText}`);
        this.lastUploadError = `REST upload failed: ${response.status} - ${errorText}`;
        return null;
      }

      const output = await response.json() as { id?: string; filename?: string; bytes?: number };
      if (!output.id) {
        console.error('[TogetherTuner] REST upload missing file id');
        this.lastUploadError = 'REST upload missing file id';
        return null;
      }

      console.log(`[TogetherTuner] REST upload successful: ${output.id} (${output.bytes || fileSize} bytes)`);
      return {
        fileId: output.id,
        filename: output.filename || filename,
        bytes: output.bytes || fileSize
      };
    } catch (error) {
      console.error('[TogetherTuner] REST upload error:', error);
      this.lastUploadError = error instanceof Error ? error.message : 'Unknown REST upload error';
      return null;
    }
  };

  /**
   * Upload JSONL training data to Together AI
   * 
   * Uses Python SDK for uploads (JS SDK has a bug with signed URL uploads).
   * Requires Python with 'together' package installed.
   */
  async upload(jsonl: string, filename?: string): Promise<UploadResult | null> {
    this.lastUploadError = null;
    if (!this.apiKey) {
      console.error('[TogetherTuner] TOGETHER_API_KEY not set');
      this.lastUploadError = 'TOGETHER_API_KEY not set';
      return null;
    }

    const finalFilename = filename || `training-${Date.now()}.jsonl`;
    const fileSize = Buffer.byteLength(jsonl, 'utf8');
    
    // Create temp file
    const tempDir = os.tmpdir();
    const tempPath = path.join(tempDir, finalFilename);
    
    console.log(`[TogetherTuner] Uploading ${finalFilename} (${fileSize} bytes) via Python SDK`);
    
    try {
      // Write JSONL to temp file
      fs.writeFileSync(tempPath, jsonl, 'utf8');
      console.log(`[TogetherTuner] Wrote temp file: ${tempPath}`);

      // Call Python helper script when available; fallback to REST upload if Python is unavailable.
      const scriptPath = path.join(process.cwd(), 'scripts', 'together-upload.py');
      const pythonCommands = ['python3', 'python'];
      for (const pythonCmd of pythonCommands) {
        try {
          const result = execSync(`${pythonCmd} "${scriptPath}" "${tempPath}"`, {
            encoding: 'utf8',
            env: { ...process.env, TOGETHER_API_KEY: this.apiKey, TOGETHER_NO_BANNER: '1' },
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 120000 // 2 minute timeout
          });

          const output = this.parseUploadOutput(result);
          if (!output) {
            console.error(`[TogetherTuner] ${pythonCmd} upload returned non-JSON output`);
            this.lastUploadError = `${pythonCmd} upload returned non-JSON output`;
            break;
          }
          if (output.error) {
            console.error(`[TogetherTuner] ${pythonCmd} upload failed:`, output.error);
            this.lastUploadError = `${pythonCmd} upload failed: ${output.error}`;
            break;
          }
          if (!output.id) {
            console.error(`[TogetherTuner] ${pythonCmd} upload returned no file id`);
            this.lastUploadError = `${pythonCmd} upload returned no file id`;
            break;
          }

          console.log(`[TogetherTuner] Upload successful via ${pythonCmd}: ${output.id} (${output.bytes} bytes)`);
          return {
            fileId: output.id,
            filename: output.filename || finalFilename,
            bytes: output.bytes || fileSize
          };
        } catch (pythonError) {
          console.warn(`[TogetherTuner] ${pythonCmd} unavailable or failed, trying fallback`, pythonError);
          this.lastUploadError = pythonError instanceof Error ? pythonError.message : `${pythonCmd} upload failed`;
        }
      };

      console.log('[TogetherTuner] Falling back to REST upload');
      return await this.uploadViaApi(jsonl, finalFilename, fileSize);
    } catch (error) {
      console.error('[TogetherTuner] Upload error:', error);
      this.lastUploadError = error instanceof Error ? error.message : 'Unknown upload error';
      return null;
    } finally {
      // Clean up temp file
      try {
        fs.unlinkSync(tempPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Get information about an uploaded file
   */
  async getFileInfo(fileId: string): Promise<FileInfo | null> {
    if (!this.apiKey) {
      console.error('[TogetherTuner] TOGETHER_API_KEY not set');
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/files/${fileId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[TogetherTuner] Get file info failed: ${response.status} - ${errorText}`);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('[TogetherTuner] Get file info error:', error);
      return null;
    }
  }

  /**
   * List all uploaded files
   */
  async listFiles(): Promise<FileInfo[] | null> {
    if (!this.apiKey) {
      console.error('[TogetherTuner] TOGETHER_API_KEY not set');
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/files`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[TogetherTuner] List files failed: ${response.status} - ${errorText}`);
        return null;
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('[TogetherTuner] List files error:', error);
      return null;
    }
  }

  /**
   * Start a fine-tuning job on Together AI
   * 
   * @param fileId - The uploaded file ID
   * @param userId - User ID for suffix naming
   * @param previousModelId - Optional: continue training from a previous fine-tuned model
   * @param options - Additional training options
   */
  async train(
    fileId: string,
    userId: string,
    previousModelId?: string,
    options: {
      nEpochs?: number;
      learningRate?: number;
      batchSize?: number;
      lora?: boolean;
      loraR?: number;
      loraAlpha?: number;
      fromCheckpoint?: string; // Previous job ID to continue from (e.g., "ft-xxx")
    } = {}
  ): Promise<TrainingJobResult | null> {
    this.lastTrainError = null;
    if (!this.apiKey) {
      console.error('[TogetherTuner] TOGETHER_API_KEY not set');
      this.lastTrainError = 'TOGETHER_API_KEY not set';
      return null;
    }

    // Use Reference model for fine-tuning (this is the base for training)
    // If previousModelId is a fine-tuned model, we can continue from it
    const baseModel = previousModelId || 'meta-llama/Llama-4-Maverick-17B-128E-Instruct';
    
    // Default to LoRA fine-tuning (faster, cheaper, good for personalization)
    const useLora = options.lora !== false;

    // Together AI expects training_type with specific structure
    // LoRA: { type: 'Lora', lora_r: number, lora_alpha: number }
    // Full: { type: 'Full' }
    const trainingType = useLora 
      ? {
          type: 'Lora',
          lora_r: options.loraR || 8,       // default rank
          lora_alpha: options.loraAlpha || 16, // default alpha
        }
      : { type: 'Full' };

    const nEpochs = options.nEpochs || 3;
    const requestBody: Record<string, unknown> = {
      training_file: fileId,
      model: baseModel,
      n_epochs: nEpochs,
      suffix: `ghost-${userId.slice(0, 8)}-${Date.now()}`,
      training_type: trainingType,
      batch_size: options.batchSize || 'max', // 'max' lets Together AI choose optimal batch size
      learning_rate: options.learningRate || 1e-5, // Default learning rate for fine-tuning
      n_checkpoints: 1, // Save at least one checkpoint at the end
      warmup_ratio: 0.1, // 10% warmup
    };

    // Continue from previous checkpoint if provided (incremental training)
    if (options.fromCheckpoint) {
      requestBody.from_checkpoint = options.fromCheckpoint;
      console.log(`[TogetherTuner] Continuing from checkpoint: ${options.fromCheckpoint}`);
    }

    try {
      console.log(`[TogetherTuner] Starting fine-tune job with base model: ${baseModel}`);
      console.log(`[TogetherTuner] LoRA: ${useLora}, Epochs: ${requestBody.n_epochs}`);
      console.log(`[TogetherTuner] Request body:`, JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${this.baseUrl}/fine-tunes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[TogetherTuner] Train failed: ${response.status} - ${errorText}`);
        
        // Parse specific error types for better user feedback
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error?.code === 'insufficient_balance') {
            throw new Error(`Together AI: Insufficient credits. Add credits at https://api.together.ai/settings/billing`);
          }
        } catch (parseError) {
          // If not JSON, use raw error
        }
        throw new Error(`Together AI training failed: ${response.status} - ${errorText}`);
      }

      const job = await response.json();
      console.log(`[TogetherTuner] Training job created: ${job.id}`);

      return {
        jobId: job.id,
        status: job.status || 'pending',
        model: baseModel
      };
    } catch (error) {
      console.error('[TogetherTuner] Training start failed:', error);
      this.lastTrainError = error instanceof Error ? error.message : 'Unknown training error';
      return null;
    }
  }

  getLastTrainError(): string | null {
    return this.lastTrainError;
  }

  getLastUploadError(): string | null {
    return this.lastUploadError;
  }

  /**
   * Get the status of a fine-tuning job
   */
  async getJobStatus(jobId: string): Promise<JobStatus | null> {
    if (!this.apiKey) {
      console.error('[TogetherTuner] TOGETHER_API_KEY not set');
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/fine-tunes/${jobId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[TogetherTuner] Get job status failed: ${response.status} - ${errorText}`);
        return null;
      }

      const job = await response.json();
      
      return {
        id: job.id,
        status: job.status,
        model: job.model,
        training_file: job.training_file,
        output_name: job.model_output_name, // Together AI uses model_output_name
        created_at: job.created_at,
        updated_at: job.updated_at,
        finished_at: job.finished_at,
        error: job.error,
        epochs_completed: job.epochs_completed,
        total_epochs: job.n_epochs, // Together AI uses n_epochs
        steps_completed: job.steps_completed,
        fine_tuned_model: job.model_output_name // This is the deployable model name
      };
    } catch (error) {
      console.error('[TogetherTuner] Get job status error:', error);
      return null;
    }
  }

  /**
   * List all fine-tuning jobs for the account
   */
  async listJobs(): Promise<JobStatus[] | null> {
    if (!this.apiKey) {
      console.error('[TogetherTuner] TOGETHER_API_KEY not set');
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/fine-tunes`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[TogetherTuner] List jobs failed: ${response.status} - ${errorText}`);
        return null;
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('[TogetherTuner] List jobs error:', error);
      return null;
    }
  }

  /**
   * Cancel a running fine-tuning job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    if (!this.apiKey) {
      console.error('[TogetherTuner] TOGETHER_API_KEY not set');
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/fine-tunes/${jobId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[TogetherTuner] Cancel job failed: ${response.status} - ${errorText}`);
        return false;
      }

      console.log(`[TogetherTuner] Job ${jobId} cancelled`);
      return true;
    } catch (error) {
      console.error('[TogetherTuner] Cancel job error:', error);
      return false;
    }
  }
}
