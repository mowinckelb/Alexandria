import { DEFAULT_SYSTEM_CONFIG, type SystemConfig } from '@/lib/types/system-config';

export interface AxiomViolation {
  code: string;
  message: string;
  path: string;
}

export interface AxiomValidationResult {
  valid: boolean;
  violations: AxiomViolation[];
}

const REQUIRED_PHASES = ['input', 'output'];
const REQUIRED_AGENTS = ['editor', 'orchestrator'];
const REQUIRED_COMPONENTS = ['constitution', 'plm', 'vault'];

function hasAll(required: string[], actual: string[]): string[] {
  const set = new Set(actual.map((item) => item.toLowerCase()));
  return required.filter((item) => !set.has(item));
}

export function validateSystemConfigAxioms(config: SystemConfig): AxiomValidationResult {
  const violations: AxiomViolation[] = [];

  if (!config?.axioms?.dataSovereignty) {
    violations.push({
      code: 'AXIOM_DATA_SOVEREIGNTY',
      message: 'dataSovereignty must remain true.',
      path: 'axioms.dataSovereignty'
    });
  }

  const missingPhases = hasAll(REQUIRED_PHASES, config?.axioms?.phases || []);
  if (missingPhases.length > 0) {
    violations.push({
      code: 'AXIOM_PHASES',
      message: `Missing required phases: ${missingPhases.join(', ')}`,
      path: 'axioms.phases'
    });
  }

  const missingAgents = hasAll(REQUIRED_AGENTS, config?.axioms?.agents || []);
  if (missingAgents.length > 0) {
    violations.push({
      code: 'AXIOM_AGENTS',
      message: `Missing required agents: ${missingAgents.join(', ')}`,
      path: 'axioms.agents'
    });
  }

  const missingComponents = hasAll(REQUIRED_COMPONENTS, config?.axioms?.components || []);
  if (missingComponents.length > 0) {
    violations.push({
      code: 'AXIOM_COMPONENTS',
      message: `Missing required components: ${missingComponents.join(', ')}`,
      path: 'axioms.components'
    });
  }

  if ((config?.infrastructure?.editorMode || '').toLowerCase() !== 'always-on') {
    violations.push({
      code: 'AXIOM_EDITOR_ALWAYS_ON',
      message: 'Editor must run in always-on mode.',
      path: 'infrastructure.editorMode'
    });
  }

  if (!(config?.axioms?.inputNodes || []).includes('author')) {
    violations.push({
      code: 'AXIOM_AUTHOR_INPUT',
      message: 'Author input node is required.',
      path: 'axioms.inputNodes'
    });
  }

  if (!(config?.axioms?.outputNodes || []).includes('author')) {
    violations.push({
      code: 'AXIOM_AUTHOR_OUTPUT',
      message: 'Author output node is required.',
      path: 'axioms.outputNodes'
    });
  }

  return {
    valid: violations.length === 0,
    violations
  };
}

export function buildMergedSystemConfig(configPatch: Record<string, unknown>): SystemConfig {
  return {
    ...DEFAULT_SYSTEM_CONFIG,
    ...configPatch,
    axioms: {
      ...DEFAULT_SYSTEM_CONFIG.axioms,
      ...(configPatch.axioms as Record<string, unknown> | undefined)
    },
    editor: {
      ...DEFAULT_SYSTEM_CONFIG.editor,
      ...(configPatch.editor as Record<string, unknown> | undefined)
    },
    orchestrator: {
      ...DEFAULT_SYSTEM_CONFIG.orchestrator,
      ...(configPatch.orchestrator as Record<string, unknown> | undefined)
    },
    plm: {
      ...DEFAULT_SYSTEM_CONFIG.plm,
      ...(configPatch.plm as Record<string, unknown> | undefined)
    },
    memories: {
      ...DEFAULT_SYSTEM_CONFIG.memories,
      ...(configPatch.memories as Record<string, unknown> | undefined)
    },
    vault: {
      ...DEFAULT_SYSTEM_CONFIG.vault,
      ...(configPatch.vault as Record<string, unknown> | undefined)
    },
    infrastructure: {
      ...DEFAULT_SYSTEM_CONFIG.infrastructure,
      ...(configPatch.infrastructure as Record<string, unknown> | undefined)
    },
    privacy: {
      ...DEFAULT_SYSTEM_CONFIG.privacy,
      ...(configPatch.privacy as Record<string, unknown> | undefined)
    }
  };
}

export function applySystemConfigPatch(baseConfig: SystemConfig, configPatch: Record<string, unknown>): SystemConfig {
  return {
    ...baseConfig,
    ...configPatch,
    axioms: {
      ...baseConfig.axioms,
      ...(configPatch.axioms as Record<string, unknown> | undefined)
    },
    editor: {
      ...baseConfig.editor,
      ...(configPatch.editor as Record<string, unknown> | undefined)
    },
    orchestrator: {
      ...baseConfig.orchestrator,
      ...(configPatch.orchestrator as Record<string, unknown> | undefined)
    },
    plm: {
      ...baseConfig.plm,
      ...(configPatch.plm as Record<string, unknown> | undefined)
    },
    memories: {
      ...baseConfig.memories,
      ...(configPatch.memories as Record<string, unknown> | undefined)
    },
    vault: {
      ...baseConfig.vault,
      ...(configPatch.vault as Record<string, unknown> | undefined)
    },
    infrastructure: {
      ...baseConfig.infrastructure,
      ...(configPatch.infrastructure as Record<string, unknown> | undefined)
    },
    privacy: {
      ...baseConfig.privacy,
      ...(configPatch.privacy as Record<string, unknown> | undefined)
    }
  };
}
