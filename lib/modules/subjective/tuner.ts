/**
 * TogetherTuner: Handles file upload and fine-tuning via Together AI API
 * 
 * Uses raw fetch with FormData/Blob to avoid SDK issues in serverless environments.
 * Per ALEXANDRIA_CONTEXT.md: "Do NOT use the together-ai SDK for Training/Uploads in serverless"
 */

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

  /**
   * Upload JSONL training data to Together AI
   * 
   * Together AI uses a two-step upload process:
   * 1. POST to /files with URL params → returns 302 redirect with signed URL
   * 2. PUT the file content to the signed URL
   */
  async upload(jsonl: string, filename?: string): Promise<UploadResult | null> {
    if (!this.apiKey) {
      console.error('[TogetherTuner] TOGETHER_API_KEY not set');
      return null;
    }

    const finalFilename = filename || `training-${Date.now()}.jsonl`;
    const fileSize = new Blob([jsonl]).size;
    
    console.log(`[TogetherTuner] Uploading ${finalFilename} (${fileSize} bytes)`);

    try {
      // Step 1: Get signed upload URL
      const params = new URLSearchParams({
        file_name: finalFilename,
        purpose: 'fine-tune',
      });
      const fullUrl = `${this.baseUrl}/files?${params}`;

      const signedResponse = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        redirect: 'manual', // Important: don't follow the redirect
        body: params.toString(),
      });

      if (signedResponse.status !== 302) {
        const errorText = await signedResponse.text();
        console.error(`[TogetherTuner] Failed to get signed URL: ${signedResponse.status} - ${errorText}`);
        throw new Error(`Failed to get signed upload URL: ${signedResponse.status}`);
      }

      const uploadUrl = signedResponse.headers.get('location');
      const fileId = signedResponse.headers.get('x-together-file-id');

      if (!uploadUrl || !fileId) {
        console.error('[TogetherTuner] Missing upload URL or file ID in response headers');
        throw new Error('Missing upload URL or file ID in response');
      }

      console.log(`[TogetherTuner] Got signed URL, file ID: ${fileId}`);

      // Step 2: Upload the file content to the signed URL
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': `${fileSize}`,
        },
        body: jsonl,
      });

      if (uploadResponse.status !== 200) {
        const errorText = await uploadResponse.text();
        console.error(`[TogetherTuner] File upload failed: ${uploadResponse.status} - ${errorText}`);
        throw new Error(`File upload failed: ${uploadResponse.status}`);
      }

      console.log(`[TogetherTuner] Upload successful: ${fileId}`);

      return {
        fileId,
        filename: finalFilename,
        bytes: fileSize
      };
    } catch (error) {
      console.error('[TogetherTuner] Upload error:', error);
      return null;
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
    } = {}
  ): Promise<TrainingJobResult | null> {
    if (!this.apiKey) {
      console.error('[TogetherTuner] TOGETHER_API_KEY not set');
      return null;
    }

    // Use Reference model for fine-tuning (this is the base for training)
    // If previousModelId is a fine-tuned model, we can continue from it
    const baseModel = previousModelId || 'meta-llama/Meta-Llama-3.1-8B-Instruct-Reference';
    
    // Default to LoRA fine-tuning (faster, cheaper, good for personalization)
    const useLora = options.lora !== false;

    const requestBody: Record<string, unknown> = {
      training_file: fileId,
      model: baseModel,
      n_epochs: options.nEpochs || 3,
      suffix: `ghost-${userId.slice(0, 8)}-${Date.now()}`,
      // LoRA parameters
      lora: useLora,
    };

    // Add optional LoRA hyperparameters
    if (useLora) {
      if (options.loraR) requestBody.lora_r = options.loraR;
      if (options.loraAlpha) requestBody.lora_alpha = options.loraAlpha;
    }

    // Add optional training hyperparameters
    if (options.learningRate) requestBody.learning_rate = options.learningRate;
    if (options.batchSize) requestBody.batch_size = options.batchSize;

    try {
      console.log(`[TogetherTuner] Starting fine-tune job with base model: ${baseModel}`);
      console.log(`[TogetherTuner] LoRA: ${useLora}, Epochs: ${requestBody.n_epochs}`);

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
      return null;
    }
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
        output_name: job.output_name,
        created_at: job.created_at,
        updated_at: job.updated_at,
        finished_at: job.finished_at,
        error: job.error,
        epochs_completed: job.epochs_completed,
        total_epochs: job.total_epochs,
        steps_completed: job.steps_completed,
        fine_tuned_model: job.fine_tuned_model || job.output_name
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
