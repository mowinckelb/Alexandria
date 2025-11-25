export class TogetherTuner {
    private apiKey = process.env.TOGETHER_API_KEY;
  
    async upload(jsonl: string): Promise<string> {
      const formData = new FormData();
      // Create a Blob from the JSONL string to mimic a file
      const fileBlob = new Blob([jsonl], { type: 'application/x-jsonlines' });
      
      formData.append('file', fileBlob, 'training_data.jsonl');
      formData.append('purpose', 'fine-tune');
  
      try {
        // 1. Manual Upload to Together API
        const response = await fetch('https://api.together.xyz/v1/files', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            // Note: Do NOT set Content-Type for FormData, fetch does it automatically with boundary
          },
          body: formData
        });
  
        if (!response.ok) {
          const err = await response.text();
          throw new Error(`Together API Upload Error: ${err}`);
        }
  
        const data = await response.json();
        return data.id; // Returns "file-..."
      } catch (error) {
        console.error('Upload failed:', error);
        throw error;
      }
    }
  
    async train(fileId: string, userId: string, previousModelId?: string): Promise<string> {
      const baseModel = previousModelId || 'meta-llama/Meta-Llama-3.1-8B-Instruct-Reference';
      
      try {
        // 2. Manual Start Training
        const response = await fetch('https://api.together.xyz/v1/fine-tunes', { // Correct endpoint
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            training_file: fileId,
            model: baseModel,
            n_epochs: 3,
            suffix: `ghost-${userId}-${Date.now()}`
          })
        });
  
        if (!response.ok) {
          const err = await response.text();
          throw new Error(`Together API Train Error: ${err}`);
        }
  
        const job = await response.json();
        return job.id; // Returns "ft-..."
      } catch (error) {
        console.error('Training start failed:', error);
        throw error;
      }
    }
  }