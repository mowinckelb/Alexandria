export interface ModelConfig {
  provider: 'anthropic' | 'openai' | 'google' | 'local' | string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  endpoint?: string;
}

export interface SystemConfig {
  version: string;
  createdAt: string;
  updatedAt: string;
  paused?: boolean;

  axioms: {
    phases: string[];
    inputNodes: string[];
    outputNodes: string[];
    agents: string[];
    components: string[];
    dataSovereignty: boolean;
    privacy: string;
  };

  editor: {
    questioningStyle: 'socratic' | 'direct' | 'proactive';
    proactiveFrequencyHours: number;
    constitutionUpdateThreshold: number;
    rlAIFStrictness: 'strict' | 'moderate' | 'flexible';
    model: ModelConfig;
  };

  orchestrator: {
    weightingStrategy: 'dynamic' | 'fixed' | 'query-adaptive';
    fixedWeights?: Record<string, number>;
    model: ModelConfig;
    fallbackModel?: ModelConfig;
  };

  plm: {
    trainingProvider: 'fireworks' | 'replicate' | 'openai' | 'local';
    baseModel: string;
    retrainingFrequency: 'weekly' | 'monthly' | 'on-demand';
    maturityThresholds: Record<string, number>;
  };

  memories: {
    graphProvider: string;
    vectorProvider: string;
    entityExtractionModel: string;
  };

  vault: {
    storageProvider: 'supabase' | 's3' | 'local';
    encryptionEnabled: boolean;
    backupFrequency: string;
  };

  infrastructure: {
    deployment: 'cloud' | 'local' | 'hybrid';
    editorMode: 'always-on' | 'scheduled';
    orchestratorMode: 'serverless' | 'always-on';
    backgroundWorker: 'vercel-cron' | 'inngest' | 'temporal';
  };

  privacy: {
    externalAPIEnabled: boolean;
    defaultPrivacyLevel: string;
    allowedExternalQueries: string[];
    pricingPerQuery?: number;
  };
}

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  version: 'default-v1',
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
  axioms: {
    phases: ['input', 'output'],
    inputNodes: ['author', 'llm', 'api'],
    outputNodes: ['author', 'llm', 'api'],
    agents: ['editor', 'orchestrator'],
    components: ['constitution', 'plm', 'vault'],
    dataSovereignty: true,
    privacy: 'hidden-inputs-exposed-outputs'
  },
  editor: {
    questioningStyle: 'socratic',
    proactiveFrequencyHours: 24,
    constitutionUpdateThreshold: 0.7,
    rlAIFStrictness: 'moderate',
    model: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      temperature: 0.7
    }
  },
  orchestrator: {
    weightingStrategy: 'query-adaptive',
    model: {
      provider: 'fireworks',
      model: 'accounts/fireworks/models/kimi-k2p5',
      temperature: 0.7
    }
  },
  plm: {
    trainingProvider: 'fireworks',
    baseModel: 'accounts/fireworks/models/kimi-k2p5',
    retrainingFrequency: 'on-demand',
    maturityThresholds: {
      worldview: 0.7,
      values: 0.8,
      models: 0.7,
      identity: 0.75,
      shadows: 0.6
    }
  },
  memories: {
    graphProvider: 'none',
    vectorProvider: 'supabase-pgvector',
    entityExtractionModel: 'llama-3.3-70b-versatile'
  },
  vault: {
    storageProvider: 'supabase',
    encryptionEnabled: true,
    backupFrequency: 'daily'
  },
  infrastructure: {
    deployment: 'cloud',
    editorMode: 'always-on',
    orchestratorMode: 'serverless',
    backgroundWorker: 'vercel-cron'
  },
  privacy: {
    externalAPIEnabled: false,
    defaultPrivacyLevel: 'personal',
    allowedExternalQueries: []
  }
};
