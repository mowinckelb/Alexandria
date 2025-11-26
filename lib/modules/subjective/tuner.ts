export class TogetherTuner {
    private apiKey = process.env.TOGETHER_API_KEY;
  
    async upload(jsonl: string): Promise<string | null> {
      // Note: Together AI file upload requires multipart/form-data
      // For MVP, we'll store JSONL locally and implement full training later
      // This is because serverless environments have issues with FormData + file uploads
      
      console.log('Training data generated:', jsonl.substring(0, 500) + '...');
      console.log('Full training upload will be implemented in production');
      
      // For now, return null to skip training (MVP mode)
      // TODO: Implement proper file upload using Together AI SDK or presigned URLs
      return null;
    }
  
    async train(fileId: string | null, userId: string, previousModelId?: string): Promise<string | null> {
      // Skip training if no file was uploaded (MVP mode)
      if (!fileId) {
        console.log('Skipping training - no file uploaded (MVP mode)');
        return null;
      }
      
      // Use Reference model for fine-tuning (this is the base for training)
      const baseModel = previousModelId || 'meta-llama/Meta-Llama-3.1-8B-Instruct-Reference';
      
      try {
        const response = await fetch('https://api.together.xyz/v1/fine-tunes', {
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
        return job.id;
      } catch (error) {
        console.error('Training start failed:', error);
        return null;
      }
    }
  }