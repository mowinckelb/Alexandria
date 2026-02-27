/**
 * FireworksTuner: Handles dataset upload and fine-tuning via Fireworks AI API
 * 
 * Fireworks API flow:
 *   1. Create dataset record
 *   2. Upload JSONL file to dataset
 *   3. Wait for dataset READY state
 *   4. Create supervised fine-tuning (SFT) job
 *   5. Poll job status → deploy model on completion
 * 
 * Requires: FIREWORKS_API_KEY, FIREWORKS_ACCOUNT_ID env vars.
 */

export interface UploadResult {
  fileId: string;   // Dataset resource name (accounts/{id}/datasets/{id})
  filename: string;
  bytes: number;
}

export interface TrainingJobResult {
  jobId: string;
  status: string;
  model: string;    // Output model ID (accounts/{id}/models/{id})
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
  epochs_completed?: number;
  total_epochs?: number;
  steps_completed?: number;
  fine_tuned_model?: string;
}

export interface FileInfo {
  id: string;
  filename: string;
  bytes: number;
  purpose: string;
  created_at: number;
}

const BASE_MODEL = 'accounts/fireworks/models/kimi-k2p5';

const FIREWORKS_STATE_MAP: Record<string, JobStatus['status']> = {
  'STATE_UNSPECIFIED': 'pending',
  'PENDING': 'pending',
  'JOB_STATE_PENDING': 'pending',
  'RUNNING': 'running',
  'JOB_STATE_RUNNING': 'running',
  'COMPLETED': 'completed',
  'JOB_STATE_COMPLETED': 'completed',
  'FAILED': 'failed',
  'JOB_STATE_FAILED': 'failed',
  'DELETING': 'cancelled',
  'CANCELED': 'cancelled',
  'JOB_STATE_CANCELED': 'cancelled',
};

function sanitizeResourceId(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 63);
}

export class FireworksTuner {
  private apiKey = process.env.FIREWORKS_API_KEY;
  private accountId = process.env.FIREWORKS_ACCOUNT_ID || 'mowinckelb';
  private baseUrl = 'https://api.fireworks.ai/v1';
  private lastTrainError: string | null = null;
  private lastUploadError: string | null = null;

  private get accountPath() {
    return `${this.baseUrl}/accounts/${this.accountId}`;
  }

  private authHeaders(json = false): Record<string, string> {
    const h: Record<string, string> = { Authorization: `Bearer ${this.apiKey}` };
    if (json) h['Content-Type'] = 'application/json';
    return h;
  }

  // ==========================================================================
  // Upload: create dataset + upload JSONL + wait for READY
  // ==========================================================================

  async upload(jsonl: string, filename?: string): Promise<UploadResult | null> {
    this.lastUploadError = null;
    if (!this.apiKey) {
      this.lastUploadError = 'FIREWORKS_API_KEY not set';
      console.error(`[FireworksTuner] ${this.lastUploadError}`);
      return null;
    }

    const finalFilename = filename || `training-${Date.now()}.jsonl`;
    const fileSize = Buffer.byteLength(jsonl, 'utf8');
    const exampleCount = jsonl.trim().split('\n').length;
    const datasetId = sanitizeResourceId(finalFilename.replace(/\.jsonl$/i, ''));

    console.log(`[FireworksTuner] Uploading ${finalFilename} (${fileSize} bytes, ${exampleCount} examples) as dataset ${datasetId}`);

    try {
      // Step 1: Create dataset record
      const createResp = await fetch(`${this.accountPath}/datasets`, {
        method: 'POST',
        headers: this.authHeaders(true),
        body: JSON.stringify({ datasetId, dataset: { userUploaded: {}, exampleCount } }),
      });

      if (!createResp.ok) {
        const errText = await createResp.text();
        console.error(`[FireworksTuner] Create dataset failed: ${createResp.status} - ${errText}`);
        this.lastUploadError = `Create dataset failed: ${createResp.status} - ${errText}`;
        return null;
      }

      // Step 2: Upload JSONL file to dataset
      const blob = new Blob([jsonl], { type: 'application/jsonl' });
      const form = new FormData();
      form.append('file', blob, finalFilename);

      const uploadResp = await fetch(`${this.accountPath}/datasets/${datasetId}:upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}` },
        body: form,
      });

      if (!uploadResp.ok) {
        const errText = await uploadResp.text();
        console.error(`[FireworksTuner] Upload file failed: ${uploadResp.status} - ${errText}`);
        this.lastUploadError = `Upload file failed: ${uploadResp.status} - ${errText}`;
        return null;
      }

      // Step 3: Poll until dataset state is READY (max ~30s)
      const ready = await this.waitForDatasetReady(datasetId);
      if (!ready) {
        this.lastUploadError = 'Dataset did not reach READY state within timeout';
        console.error(`[FireworksTuner] ${this.lastUploadError}`);
        return null;
      }

      const datasetName = `accounts/${this.accountId}/datasets/${datasetId}`;
      console.log(`[FireworksTuner] Dataset ready: ${datasetName} (${fileSize} bytes)`);

      return { fileId: datasetName, filename: finalFilename, bytes: fileSize };
    } catch (error) {
      console.error('[FireworksTuner] Upload error:', error);
      this.lastUploadError = error instanceof Error ? error.message : 'Unknown upload error';
      return null;
    }
  }

  private async waitForDatasetReady(datasetId: string, maxWaitMs = 60000): Promise<boolean> {
    const start = Date.now();
    let delay = 2000;
    while (Date.now() - start < maxWaitMs) {
      await new Promise(r => setTimeout(r, delay));
      try {
        const resp = await fetch(`${this.accountPath}/datasets/${datasetId}`, {
          headers: this.authHeaders(),
        });
        if (resp.ok) {
          const ds = await resp.json();
          if (ds.state === 'READY') return true;
          console.log(`[FireworksTuner] Dataset state: ${ds.state}, waiting...`);
        }
      } catch { /* retry */ }
      delay = Math.min(delay * 1.5, 10000);
    }
    return false;
  }

  // ==========================================================================
  // Train: create supervised fine-tuning job
  // ==========================================================================

  async train(
    datasetName: string,
    userId: string,
    previousModelId?: string,
    options: {
      nEpochs?: number;
      learningRate?: number;
      batchSize?: number;
      lora?: boolean;
      loraR?: number;
      loraAlpha?: number;
      warmStartFrom?: string;
    } = {}
  ): Promise<TrainingJobResult | null> {
    this.lastTrainError = null;
    if (!this.apiKey) {
      this.lastTrainError = 'FIREWORKS_API_KEY not set';
      console.error(`[FireworksTuner] ${this.lastTrainError}`);
      return null;
    }

    const outputModelId = sanitizeResourceId(`ghost-${userId.slice(0, 8)}-${Date.now()}`);
    const outputModelName = `accounts/${this.accountId}/models/${outputModelId}`;

    // Determine warm-start vs fresh base model
    const warmStart = options.warmStartFrom || previousModelId;
    const isWarmStart = warmStart && warmStart.startsWith('accounts/');

    const requestBody: Record<string, unknown> = {
      dataset: datasetName,
      outputModel: outputModelName,
      epochs: options.nEpochs || 1,
      loraRank: options.loraR || 8,
    };

    if (isWarmStart) {
      requestBody.warmStartFrom = warmStart;
      console.log(`[FireworksTuner] Warm-starting from: ${warmStart}`);
    } else {
      requestBody.baseModel = BASE_MODEL;
    }

    if (options.learningRate) requestBody.learningRate = options.learningRate;

    try {
      console.log(`[FireworksTuner] Creating SFT job → output: ${outputModelId}`);
      console.log(`[FireworksTuner] Request:`, JSON.stringify(requestBody, null, 2));

      const resp = await fetch(`${this.accountPath}/supervisedFineTuningJobs`, {
        method: 'POST',
        headers: this.authHeaders(true),
        body: JSON.stringify(requestBody),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.error(`[FireworksTuner] Create SFT job failed: ${resp.status} - ${errText}`);

        try {
          const errJson = JSON.parse(errText);
          if (errJson.error?.code === 'insufficient_balance' || errText.includes('insufficient')) {
            throw new Error('Fireworks AI: Insufficient credits. Check https://fireworks.ai/account/billing');
          }
        } catch (pe) {
          if (pe instanceof Error && pe.message.includes('Insufficient')) throw pe;
        }
        throw new Error(`Fireworks AI training failed: ${resp.status} - ${errText}`);
      }

      const job = await resp.json();

      // Extract job ID from resource name: accounts/.../supervisedFineTuningJobs/{id}
      const jobName: string = job.name || '';
      const jobId = jobName.split('/').pop() || jobName;

      console.log(`[FireworksTuner] SFT job created: ${jobId}`);

      const outputModelName = `accounts/${this.accountId}/models/${outputModelId}`;
      return {
        jobId,
        status: (FIREWORKS_STATE_MAP[job.state] || 'pending'),
        model: outputModelName,
      };
    } catch (error) {
      console.error('[FireworksTuner] Training start failed:', error);
      this.lastTrainError = error instanceof Error ? error.message : 'Unknown training error';
      return null;
    }
  }

  // ==========================================================================
  // Job status
  // ==========================================================================

  async getJobStatus(jobId: string): Promise<JobStatus | null> {
    if (!this.apiKey) {
      console.error('[FireworksTuner] FIREWORKS_API_KEY not set');
      return null;
    }

    try {
      const resp = await fetch(`${this.accountPath}/supervisedFineTuningJobs/${jobId}`, {
        headers: this.authHeaders(),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.error(`[FireworksTuner] Get job status failed: ${resp.status} - ${errText}`);
        return null;
      }

      const job = await resp.json();
      const status = FIREWORKS_STATE_MAP[job.state] || 'pending';
      const rawOutputModel: string = job.outputModel || '';
      const outputModelName = rawOutputModel
        ? (rawOutputModel.startsWith('accounts/') ? rawOutputModel : `accounts/${this.accountId}/models/${rawOutputModel}`)
        : undefined;

      return {
        id: jobId,
        status,
        model: job.baseModel || job.warmStartFrom || BASE_MODEL,
        training_file: job.dataset || '',
        output_name: rawOutputModel,
        created_at: job.createTime || '',
        updated_at: job.updateTime,
        finished_at: job.completedTime,
        error: job.status?.message,
        epochs_completed: job.jobProgress?.completedPercentage ? Math.round((job.jobProgress.completedPercentage / 100) * (job.epochs || 1)) : undefined,
        total_epochs: job.epochs,
        fine_tuned_model: status === 'completed' ? outputModelName : undefined,
      };
    } catch (error) {
      console.error('[FireworksTuner] Get job status error:', error);
      return null;
    }
  }

  // ==========================================================================
  // Deploy model (required for inference after fine-tuning)
  // ==========================================================================

  async deployModel(modelName: string): Promise<boolean> {
    if (!this.apiKey) return false;

    try {
      console.log(`[FireworksTuner] Deploying model: ${modelName}`);
      const resp = await fetch(`${this.accountPath}/deployedModels`, {
        method: 'POST',
        headers: this.authHeaders(true),
        body: JSON.stringify({ model: modelName }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.error(`[FireworksTuner] Deploy failed: ${resp.status} - ${errText}`);
        return false;
      }

      console.log(`[FireworksTuner] Model deployed: ${modelName}`);
      return true;
    } catch (error) {
      console.error('[FireworksTuner] Deploy error:', error);
      return false;
    }
  }

  // ==========================================================================
  // List / cancel jobs
  // ==========================================================================

  async listJobs(): Promise<JobStatus[] | null> {
    if (!this.apiKey) return null;

    try {
      const resp = await fetch(`${this.accountPath}/supervisedFineTuningJobs`, {
        headers: this.authHeaders(),
      });

      if (!resp.ok) {
        console.error(`[FireworksTuner] List jobs failed: ${resp.status}`);
        return null;
      }

      const result = await resp.json();
      const jobs = result.supervisedFineTuningJobs || result.data || [];
      return jobs.map((job: Record<string, unknown>) => {
        const name = (job.name as string) || '';
        const id = name.split('/').pop() || name;
        const state = FIREWORKS_STATE_MAP[(job.state as string)] || 'pending';
        const rawOutput = (job.outputModel as string) || '';
        const fullModelName = rawOutput.startsWith('accounts/') ? rawOutput : `accounts/${this.accountId}/models/${rawOutput}`;
        return {
          id,
          status: state,
          model: (job.baseModel as string) || BASE_MODEL,
          training_file: (job.dataset as string) || '',
          output_name: rawOutput,
          created_at: (job.createTime as string) || '',
          finished_at: (job.completedTime as string) || undefined,
          fine_tuned_model: state === 'completed' && rawOutput ? fullModelName : undefined,
        } as JobStatus;
      });
    } catch (error) {
      console.error('[FireworksTuner] List jobs error:', error);
      return null;
    }
  }

  async cancelJob(jobId: string): Promise<boolean> {
    if (!this.apiKey) return false;

    try {
      const resp = await fetch(`${this.accountPath}/supervisedFineTuningJobs/${jobId}:cancel`, {
        method: 'POST',
        headers: this.authHeaders(),
      });

      if (!resp.ok) {
        console.error(`[FireworksTuner] Cancel job failed: ${resp.status}`);
        return false;
      }

      console.log(`[FireworksTuner] Job ${jobId} cancelled`);
      return true;
    } catch (error) {
      console.error('[FireworksTuner] Cancel job error:', error);
      return false;
    }
  }

  // ==========================================================================
  // File / dataset info (kept for interface compat)
  // ==========================================================================

  async getFileInfo(datasetId: string): Promise<FileInfo | null> {
    if (!this.apiKey) return null;

    try {
      const id = datasetId.includes('/') ? datasetId.split('/').pop()! : datasetId;
      const resp = await fetch(`${this.accountPath}/datasets/${id}`, {
        headers: this.authHeaders(),
      });

      if (!resp.ok) return null;
      const ds = await resp.json();
      return {
        id: datasetId,
        filename: ds.displayName || id,
        bytes: ds.byteCount || 0,
        purpose: 'fine-tune',
        created_at: new Date(ds.createTime || 0).getTime() / 1000,
      };
    } catch {
      return null;
    }
  }

  async listFiles(): Promise<FileInfo[] | null> {
    if (!this.apiKey) return null;

    try {
      const resp = await fetch(`${this.accountPath}/datasets`, {
        headers: this.authHeaders(),
      });

      if (!resp.ok) return null;
      const result = await resp.json();
      const datasets = result.datasets || [];
      return datasets.map((ds: Record<string, unknown>) => ({
        id: (ds.name as string) || '',
        filename: (ds.displayName as string) || '',
        bytes: (ds.byteCount as number) || 0,
        purpose: 'fine-tune',
        created_at: new Date((ds.createTime as string) || 0).getTime() / 1000,
      }));
    } catch {
      return null;
    }
  }

  getLastTrainError(): string | null {
    return this.lastTrainError;
  }

  getLastUploadError(): string | null {
    return this.lastUploadError;
  }
}
