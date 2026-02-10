/**
 * Constitution Manager
 * Handles extraction, storage, and retrieval of Constitution documents.
 * The Constitution is the explicit ground truth for Constitutional RLAIF.
 */

import { createClient } from '@supabase/supabase-js';
import { generateText } from 'ai';
import { getQualityModel, getFastModel } from '@/lib/models';
import { saveToVault, getFromVault } from '@/lib/utils/vault';
import {
  Constitution,
  ConstitutionSections,
  ConstitutionSectionsSchema,
  ConstitutionExtractionResult,
  ConstitutionVersionSummary,
  ConstitutionUpdateRequest,
  createEmptyConstitutionSections
} from './types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// ============================================================================
// Constitution Manager Class
// ============================================================================

export class ConstitutionManager {

  // ==========================================================================
  // Core: Get Constitution
  // ==========================================================================

  /**
   * Get the active Constitution for a user
   * Returns null if no Constitution exists
   */
  async getConstitution(userId: string): Promise<Constitution | null> {
    try {
      const { data } = await supabase.rpc('get_active_constitution', {
        p_user_id: userId
      });

      if (!data || data.length === 0) {
        return null;
      }

      const row = data[0];
      return {
        id: row.id,
        userId: row.user_id,
        version: row.version,
        content: row.content,
        sections: row.sections as ConstitutionSections,
        createdAt: row.created_at,
        changeSummary: row.change_summary,
        previousVersionId: null // Not returned by RPC
      };
    } catch (error) {
      console.error('[ConstitutionManager] Failed to get constitution:', error);
      return null;
    }
  }

  /**
   * Get Constitution as formatted markdown
   */
  async getConstitutionMarkdown(userId: string): Promise<string | null> {
    const constitution = await this.getConstitution(userId);
    if (!constitution) return null;
    return constitution.content;
  }

  /**
   * Get Constitution for context injection (summarized)
   */
  async getConstitutionContext(userId: string): Promise<string | null> {
    const constitution = await this.getConstitution(userId);
    if (!constitution) return null;

    const sections = constitution.sections;
    const parts: string[] = [];

    // Core identity
    if (sections.coreIdentity) {
      parts.push(`IDENTITY: ${sections.coreIdentity}`);
    }

    // Values (tier 1 only for context)
    if (sections.values?.tier1?.length > 0) {
      const valueNames = sections.values.tier1.map(v => v.name).join(', ');
      parts.push(`CORE VALUES: ${valueNames}`);
    }

    // Key heuristics
    if (sections.heuristics?.length > 0) {
      const rules = sections.heuristics.slice(0, 5).map(h => h.rule).join('; ');
      parts.push(`DECISION RULES: ${rules}`);
    }

    // Boundaries
    if (sections.boundaries?.length > 0) {
      parts.push(`BOUNDARIES: ${sections.boundaries.slice(0, 3).join('; ')}`);
    }

    return parts.join('\n\n');
  }

  // ==========================================================================
  // Extract: Bootstrap Constitution from existing data
  // ==========================================================================

  /**
   * Extract Constitution from existing training data and notes
   * This is the initial bootstrap process
   */
  async extractConstitution(
    userId: string,
    options: {
      sourceData?: 'training_pairs' | 'personality_profiles' | 'both';
      includeEditorNotes?: boolean;
    } = {}
  ): Promise<ConstitutionExtractionResult> {
    const { sourceData = 'both', includeEditorNotes = true } = options;

    console.log(`[ConstitutionManager] Extracting constitution for user ${userId}`);

    // 1. Gather source data
    const sources = await this.gatherExtractionSources(userId, sourceData, includeEditorNotes);

    // 2. Use LLM to analyze and extract Constitution
    const extraction = await this.performExtraction(sources);

    // 3. Calculate coverage
    const coverage = this.calculateCoverage(extraction.sections);

    // 4. Generate markdown content
    const markdown = this.sectionsToMarkdown(extraction.sections);

    // 5. Save to database
    const constitution = await this.saveConstitution(userId, extraction.sections, markdown, 'Initial extraction from existing data');

    // 6. Save to Vault
    await this.saveToVault(userId, constitution, markdown);

    // Calculate which sections were filled
    const { filled, empty } = this.getSectionStatus(extraction.sections);

    console.log(`[ConstitutionManager] Extraction complete. Coverage: ${(coverage * 100).toFixed(1)}%`);

    return {
      constitution,
      coverage,
      sectionsExtracted: filled,
      sectionsMissing: empty
    };
  }

  private async gatherExtractionSources(
    userId: string,
    sourceData: 'training_pairs' | 'personality_profiles' | 'both',
    includeEditorNotes: boolean
  ): Promise<{
    trainingPairs: Array<{ user_content: string; assistant_content: string; quality_score: number }>;
    personalityProfile: Record<string, unknown> | null;
    editorNotes: Array<{ type: string; content: string; topic?: string }>;
  }> {
    const results = {
      trainingPairs: [] as Array<{ user_content: string; assistant_content: string; quality_score: number }>,
      personalityProfile: null as Record<string, unknown> | null,
      editorNotes: [] as Array<{ type: string; content: string; topic?: string }>
    };

    // Get training pairs
    if (sourceData === 'training_pairs' || sourceData === 'both') {
      const { data: pairs } = await supabase
        .from('training_pairs')
        .select('user_content, assistant_content, quality_score')
        .eq('user_id', userId)
        .gte('quality_score', 0.5)
        .order('quality_score', { ascending: false })
        .limit(100);

      results.trainingPairs = pairs || [];
    }

    // Get personality profile
    if (sourceData === 'personality_profiles' || sourceData === 'both') {
      const { data: profile } = await supabase
        .from('personality_profiles')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      results.personalityProfile = profile;
    }

    // Get editor notes
    if (includeEditorNotes) {
      const { data: notes } = await supabase
        .from('editor_notes')
        .select('type, content, topic')
        .eq('user_id', userId)
        .in('type', ['observation', 'mental_model'])
        .limit(50);

      results.editorNotes = notes || [];
    }

    return results;
  }

  private async performExtraction(sources: {
    trainingPairs: Array<{ user_content: string; assistant_content: string; quality_score: number }>;
    personalityProfile: Record<string, unknown> | null;
    editorNotes: Array<{ type: string; content: string; topic?: string }>;
  }): Promise<{ sections: ConstitutionSections }> {
    
    // Format source data for LLM
    const trainingContext = sources.trainingPairs.slice(0, 30).map(p =>
      `Prompt: "${p.user_content}"\nResponse: "${p.assistant_content}"`
    ).join('\n---\n');

    const profileContext = sources.personalityProfile
      ? JSON.stringify(sources.personalityProfile, null, 2)
      : 'No personality profile available.';

    const notesContext = sources.editorNotes.map(n =>
      `[${n.type}] ${n.content}${n.topic ? ` (topic: ${n.topic})` : ''}`
    ).join('\n');

    const { text: response } = await generateText({
      model: getQualityModel(),
      messages: [
        {
          role: 'system',
          content: `You are extracting an explicit CONSTITUTION from implicit data about a person (the Author).

The Constitution captures their:
- Core identity (who they are)
- Worldview (epistemology + ontology)
- Values (hierarchical: tier1 = non-negotiable, tier2 = strong preferences, tier3 = stylistic)
- Mental models (how they think in different domains)
- Decision heuristics (rules they follow)
- Communication patterns (writing/speaking style)
- Domain expertise (what they know well)
- Boundaries (what they won't do)

AVAILABLE DATA:

TRAINING PAIRS (Author's voice/opinions):
${trainingContext || 'No training pairs available.'}

PERSONALITY PROFILE:
${profileContext}

EDITOR NOTES (observations about Author):
${notesContext || 'No editor notes available.'}

Extract a Constitution from this data. Be thorough but accurate - only include what you can INFER from the data. Leave sections empty if you can't determine them.

Return JSON matching this EXACT structure:
{
  "coreIdentity": "string - brief self-description in first person",
  "worldview": {
    "epistemology": ["array of beliefs about knowledge/truth"],
    "ontology": ["array of beliefs about what exists/matters"]
  },
  "values": {
    "tier1": [{"name": "string", "description": "string", "examples": ["optional"]}],
    "tier2": [{"name": "string", "description": "string"}],
    "tier3": [{"name": "string", "description": "string"}]
  },
  "mentalModels": [{"domain": "string", "name": "string", "whenToApply": "string", "howItWorks": "string"}],
  "heuristics": [{"situationType": "string", "name": "string", "rule": "string", "reasoning": "optional"}],
  "communicationPatterns": {
    "writingStyle": {"vocabulary": ["words they use"], "avoidedWords": ["words they avoid"]},
    "speakingStyle": {"verbalTics": ["phrases they repeat"]},
    "characteristicPhrases": ["signature phrases"]
  },
  "domainExpertise": [{"domain": "string", "depth": "beginner|intermediate|expert|world-class", "subdomains": [], "opinions": []}],
  "boundaries": ["things they won't do or say"],
  "evolutionNotes": []
}`
        }
      ]
    });

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('[ConstitutionManager] No JSON found in extraction response');
        return { sections: createEmptyConstitutionSections() };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate with Zod (but be lenient)
      const validated = ConstitutionSectionsSchema.safeParse(parsed);
      if (validated.success) {
        return { sections: validated.data };
      }

      // If validation fails, use parsed with defaults
      console.warn('[ConstitutionManager] Validation warnings, using parsed data with defaults');
      return { sections: this.mergeWithDefaults(parsed) };

    } catch (error) {
      console.error('[ConstitutionManager] Extraction parse error:', error);
      return { sections: createEmptyConstitutionSections() };
    }
  }

  private mergeWithDefaults(parsed: Partial<ConstitutionSections>): ConstitutionSections {
    const defaults = createEmptyConstitutionSections();
    return {
      coreIdentity: parsed.coreIdentity || defaults.coreIdentity,
      worldview: {
        epistemology: parsed.worldview?.epistemology || defaults.worldview.epistemology,
        ontology: parsed.worldview?.ontology || defaults.worldview.ontology
      },
      values: {
        tier1: parsed.values?.tier1 || defaults.values.tier1,
        tier2: parsed.values?.tier2 || defaults.values.tier2,
        tier3: parsed.values?.tier3 || defaults.values.tier3
      },
      mentalModels: parsed.mentalModels || defaults.mentalModels,
      heuristics: parsed.heuristics || defaults.heuristics,
      communicationPatterns: parsed.communicationPatterns || defaults.communicationPatterns,
      domainExpertise: parsed.domainExpertise || defaults.domainExpertise,
      boundaries: parsed.boundaries || defaults.boundaries,
      evolutionNotes: parsed.evolutionNotes || defaults.evolutionNotes
    };
  }

  // ==========================================================================
  // Update: Modify specific sections
  // ==========================================================================

  /**
   * Update a specific section of the Constitution
   */
  async updateSection(
    userId: string,
    update: ConstitutionUpdateRequest
  ): Promise<Constitution | null> {
    const current = await this.getConstitution(userId);
    if (!current) {
      console.error('[ConstitutionManager] No constitution to update');
      return null;
    }

    // Clone and modify sections
    const newSections = { ...current.sections };

    // Apply update based on operation
    switch (update.operation) {
      case 'add':
        this.addToSection(newSections, update.section, update.data);
        break;
      case 'update':
        this.updateInSection(newSections, update.section, update.data);
        break;
      case 'remove':
        this.removeFromSection(newSections, update.section, update.data);
        break;
    }

    // Generate new markdown
    const markdown = this.sectionsToMarkdown(newSections);

    // Save new version
    const newConstitution = await this.saveConstitution(
      userId,
      newSections,
      markdown,
      update.changeSummary,
      current.id
    );

    // Save to Vault
    await this.saveToVault(userId, newConstitution, markdown);

    return newConstitution;
  }

  private addToSection(sections: ConstitutionSections, section: keyof ConstitutionSections, data: unknown): void {
    const target = sections[section];
    if (Array.isArray(target)) {
      // Add to array sections
      (sections[section] as unknown[]).push(data);
    } else if (typeof target === 'object' && target !== null) {
      // Merge into object sections
      Object.assign(target, data);
    } else {
      // Replace string sections
      (sections[section] as unknown) = data;
    }
  }

  private updateInSection(sections: ConstitutionSections, section: keyof ConstitutionSections, data: unknown): void {
    // For updates, we replace the entire section
    (sections[section] as unknown) = data;
  }

  private removeFromSection(sections: ConstitutionSections, section: keyof ConstitutionSections, data: unknown): void {
    const target = sections[section];
    if (Array.isArray(target) && typeof data === 'number') {
      // Remove by index
      target.splice(data, 1);
    } else if (Array.isArray(target) && typeof data === 'string') {
      // Remove by string match
      const index = target.findIndex(item =>
        typeof item === 'string' ? item === data :
        typeof item === 'object' && item !== null && 'name' in item ? item.name === data : false
      );
      if (index > -1) target.splice(index, 1);
    }
  }

  // ==========================================================================
  // Propose: LLM suggests updates based on triggers
  // ==========================================================================

  /**
   * Propose a Constitution update based on a trigger
   * Returns the proposed change for user approval
   */
  async proposeUpdate(
    userId: string,
    trigger: {
      type: string;
      context: string;
      content: string;
    }
  ): Promise<{
    section: keyof ConstitutionSections;
    currentValue: unknown;
    proposedValue: unknown;
    reasoning: string;
  } | null> {
    const constitution = await this.getConstitution(userId);
    if (!constitution) return null;

    const { text: response } = await generateText({
      model: getFastModel(),
      messages: [
        {
          role: 'system',
          content: `You are analyzing whether to update an Author's Constitution based on new information.

CURRENT CONSTITUTION:
${constitution.content}

NEW TRIGGER:
Type: ${trigger.type}
Context: ${trigger.context}
Content: ${trigger.content}

Should this update the Constitution? Consider:
1. Is this genuinely new information or just a one-off?
2. Does it contradict or extend existing beliefs?
3. Is it significant enough to enshrine?

If NO update needed, return: {"update": false}

If YES update needed, return:
{
  "update": true,
  "section": "the section to update (e.g., 'values', 'heuristics', 'boundaries')",
  "proposedChange": "what to add/modify",
  "reasoning": "why this should be added"
}`
        }
      ]
    });

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed.update) return null;

      const section = parsed.section as keyof ConstitutionSections;
      return {
        section,
        currentValue: constitution.sections[section],
        proposedValue: parsed.proposedChange,
        reasoning: parsed.reasoning
      };
    } catch {
      return null;
    }
  }

  // ==========================================================================
  // Save: Store Constitution with versioning
  // ==========================================================================

  private async saveConstitution(
    userId: string,
    sections: ConstitutionSections,
    content: string,
    changeSummary: string,
    previousVersionId?: string
  ): Promise<Constitution> {
    // Get next version number
    const { data: versionData } = await supabase.rpc('get_next_constitution_version', {
      p_user_id: userId
    });
    const version = versionData || 1;

    // Insert new constitution
    const { data: inserted, error } = await supabase
      .from('constitutions')
      .insert({
        user_id: userId,
        version,
        content,
        sections,
        change_summary: changeSummary,
        previous_version_id: previousVersionId || null
      })
      .select()
      .single();

    if (error) {
      console.error('[ConstitutionManager] Save failed:', error);
      throw new Error(`Failed to save constitution: ${error.message}`);
    }

    // Set as active
    await supabase.rpc('set_active_constitution', {
      p_user_id: userId,
      p_constitution_id: inserted.id
    });

    console.log(`[ConstitutionManager] Saved constitution v${version} for user ${userId}`);

    return {
      id: inserted.id,
      userId: inserted.user_id,
      version: inserted.version,
      content: inserted.content,
      sections: inserted.sections as ConstitutionSections,
      createdAt: inserted.created_at,
      changeSummary: inserted.change_summary,
      previousVersionId: inserted.previous_version_id
    };
  }

  private async saveToVault(userId: string, constitution: Constitution, markdown: string): Promise<void> {
    try {
      // Save versioned copy
      await saveToVault(
        userId,
        `constitution/v${constitution.version}.md`,
        markdown,
        'constitution',
        { metadata: { version: constitution.version, createdAt: constitution.createdAt } }
      );

      // Update current.md pointer
      await saveToVault(
        userId,
        'constitution/current.md',
        markdown,
        'constitution',
        { metadata: { version: constitution.version } }
      );

      console.log(`[ConstitutionManager] Saved to Vault: constitution/v${constitution.version}.md`);
    } catch (error) {
      console.error('[ConstitutionManager] Vault save failed:', error);
      // Non-fatal - constitution is in DB
    }
  }

  // ==========================================================================
  // Version History
  // ==========================================================================

  /**
   * Get version history for a user's Constitution
   */
  async getVersionHistory(userId: string, limit: number = 20): Promise<ConstitutionVersionSummary[]> {
    const { data, error } = await supabase.rpc('get_constitution_history', {
      p_user_id: userId,
      p_limit: limit
    });

    if (error || !data) {
      console.error('[ConstitutionManager] Failed to get history:', error);
      return [];
    }

    return data.map((row: { id: string; version: number; change_summary: string | null; created_at: string; is_active: boolean }) => ({
      id: row.id,
      version: row.version,
      changeSummary: row.change_summary,
      createdAt: row.created_at,
      isActive: row.is_active
    }));
  }

  /**
   * Get a specific version
   */
  async getVersion(userId: string, version: number): Promise<Constitution | null> {
    const { data, error } = await supabase
      .from('constitutions')
      .select('*')
      .eq('user_id', userId)
      .eq('version', version)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      version: data.version,
      content: data.content,
      sections: data.sections as ConstitutionSections,
      createdAt: data.created_at,
      changeSummary: data.change_summary,
      previousVersionId: data.previous_version_id
    };
  }

  /**
   * Restore a previous version as the active Constitution
   */
  async restoreVersion(userId: string, version: number): Promise<Constitution | null> {
    const oldVersion = await this.getVersion(userId, version);
    if (!oldVersion) return null;

    // Save as new version with reference to restored version
    const newConstitution = await this.saveConstitution(
      userId,
      oldVersion.sections,
      oldVersion.content,
      `Restored from v${version}`,
      oldVersion.id
    );

    // Save to Vault
    await this.saveToVault(userId, newConstitution, oldVersion.content);

    return newConstitution;
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  private calculateCoverage(sections: ConstitutionSections): number {
    const checks = [
      !!sections.coreIdentity,
      (sections.worldview?.epistemology?.length || 0) > 0,
      (sections.worldview?.ontology?.length || 0) > 0,
      (sections.values?.tier1?.length || 0) > 0,
      (sections.values?.tier2?.length || 0) > 0,
      (sections.mentalModels?.length || 0) > 0,
      (sections.heuristics?.length || 0) > 0,
      Object.keys(sections.communicationPatterns || {}).length > 0,
      (sections.domainExpertise?.length || 0) > 0,
      (sections.boundaries?.length || 0) > 0
    ];

    return checks.filter(Boolean).length / checks.length;
  }

  private getSectionStatus(sections: ConstitutionSections): { filled: string[]; empty: string[] } {
    const status: Record<string, boolean> = {
      coreIdentity: !!sections.coreIdentity,
      epistemology: (sections.worldview?.epistemology?.length || 0) > 0,
      ontology: (sections.worldview?.ontology?.length || 0) > 0,
      'values.tier1': (sections.values?.tier1?.length || 0) > 0,
      'values.tier2': (sections.values?.tier2?.length || 0) > 0,
      'values.tier3': (sections.values?.tier3?.length || 0) > 0,
      mentalModels: (sections.mentalModels?.length || 0) > 0,
      heuristics: (sections.heuristics?.length || 0) > 0,
      communicationPatterns: Object.keys(sections.communicationPatterns || {}).length > 0,
      domainExpertise: (sections.domainExpertise?.length || 0) > 0,
      boundaries: (sections.boundaries?.length || 0) > 0
    };

    return {
      filled: Object.entries(status).filter(([, v]) => v).map(([k]) => k),
      empty: Object.entries(status).filter(([, v]) => !v).map(([k]) => k)
    };
  }

  private sectionsToMarkdown(sections: ConstitutionSections): string {
    const lines: string[] = [];

    lines.push('# Constitution\n');

    // Core Identity
    lines.push('## Core Identity\n');
    lines.push(sections.coreIdentity || '_Not yet defined._');
    lines.push('');

    // Worldview
    lines.push('## Worldview\n');
    lines.push('### Epistemology (How I Know Things)\n');
    if (sections.worldview?.epistemology?.length > 0) {
      sections.worldview.epistemology.forEach(e => lines.push(`- ${e}`));
    } else {
      lines.push('_Not yet defined._');
    }
    lines.push('');
    lines.push('### Ontology (What Exists)\n');
    if (sections.worldview?.ontology?.length > 0) {
      sections.worldview.ontology.forEach(o => lines.push(`- ${o}`));
    } else {
      lines.push('_Not yet defined._');
    }
    lines.push('');

    // Values
    lines.push('## Values\n');
    lines.push('### Tier 1 (Non-Negotiable)\n');
    if (sections.values?.tier1?.length > 0) {
      sections.values.tier1.forEach(v => {
        lines.push(`- **${v.name}**: ${v.description}`);
        if (v.examples?.length) lines.push(`  - Examples: ${v.examples.join(', ')}`);
      });
    } else {
      lines.push('_Not yet defined._');
    }
    lines.push('');
    lines.push('### Tier 2 (Strong Preferences)\n');
    if (sections.values?.tier2?.length > 0) {
      sections.values.tier2.forEach(v => lines.push(`- **${v.name}**: ${v.description}`));
    } else {
      lines.push('_Not yet defined._');
    }
    lines.push('');
    lines.push('### Tier 3 (Stylistic)\n');
    if (sections.values?.tier3?.length > 0) {
      sections.values.tier3.forEach(v => lines.push(`- **${v.name}**: ${v.description}`));
    } else {
      lines.push('_Not yet defined._');
    }
    lines.push('');

    // Mental Models
    lines.push('## Mental Models\n');
    if (sections.mentalModels?.length > 0) {
      sections.mentalModels.forEach(m => {
        lines.push(`### ${m.name} (${m.domain})\n`);
        lines.push(`**When to apply:** ${m.whenToApply}`);
        lines.push(`**How it works:** ${m.howItWorks}`);
        if (m.example) lines.push(`**Example:** ${m.example}`);
        lines.push('');
      });
    } else {
      lines.push('_Not yet defined._\n');
    }

    // Decision Heuristics
    lines.push('## Decision Heuristics\n');
    if (sections.heuristics?.length > 0) {
      sections.heuristics.forEach(h => {
        lines.push(`- **${h.name}** (${h.situationType}): ${h.rule}`);
        if (h.reasoning) lines.push(`  - Reasoning: ${h.reasoning}`);
      });
    } else {
      lines.push('_Not yet defined._');
    }
    lines.push('');

    // Communication Patterns
    lines.push('## Communication Patterns\n');
    const comm = sections.communicationPatterns;
    if (comm?.writingStyle || comm?.speakingStyle || comm?.characteristicPhrases?.length) {
      if (comm.writingStyle) {
        lines.push('### Writing Style\n');
        if (comm.writingStyle.vocabulary?.length) {
          lines.push(`- Vocabulary: ${comm.writingStyle.vocabulary.join(', ')}`);
        }
        if (comm.writingStyle.avoidedWords?.length) {
          lines.push(`- Avoided words: ${comm.writingStyle.avoidedWords.join(', ')}`);
        }
        lines.push('');
      }
      if (comm.speakingStyle?.verbalTics?.length) {
        lines.push('### Speaking Style\n');
        lines.push(`- Verbal tics: ${comm.speakingStyle.verbalTics.join(', ')}`);
        lines.push('');
      }
      if (comm.characteristicPhrases?.length) {
        lines.push('### Characteristic Phrases\n');
        comm.characteristicPhrases.forEach(p => lines.push(`- "${p}"`));
        lines.push('');
      }
    } else {
      lines.push('_Not yet defined._\n');
    }

    // Domain Expertise
    lines.push('## Domain Expertise\n');
    if (sections.domainExpertise?.length > 0) {
      sections.domainExpertise.forEach(d => {
        lines.push(`- **${d.domain}** (${d.depth})`);
        if (d.subdomains?.length) lines.push(`  - Subdomains: ${d.subdomains.join(', ')}`);
        if (d.opinions?.length) lines.push(`  - Opinions: ${d.opinions.join('; ')}`);
      });
    } else {
      lines.push('_Not yet defined._');
    }
    lines.push('');

    // Boundaries
    lines.push('## Boundaries (What I Don\'t Do)\n');
    if (sections.boundaries?.length > 0) {
      sections.boundaries.forEach(b => lines.push(`- ${b}`));
    } else {
      lines.push('_Not yet defined._');
    }
    lines.push('');

    // Evolution Notes
    if (sections.evolutionNotes?.length > 0) {
      lines.push('## Evolution Notes\n');
      sections.evolutionNotes.forEach(e => {
        lines.push(`### ${e.date}: ${e.section}\n`);
        lines.push(`**What changed:** ${e.whatChanged}`);
        lines.push(`**Why:** ${e.why}`);
        lines.push('');
      });
    }

    // Footer
    lines.push('---\n');
    lines.push(`_This Constitution is living. Last updated: ${new Date().toISOString()}_`);

    return lines.join('\n');
  }

  /**
   * Get Constitution from Vault (fallback/verification)
   */
  async getFromVault(userId: string): Promise<string | null> {
    const content = await getFromVault(userId, 'constitution/current.md');
    if (!content) return null;
    return content.toString('utf-8');
  }
}
