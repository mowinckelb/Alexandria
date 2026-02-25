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
  createEmptyConstitutionSections,
  deriveTrainingView,
  deriveInferenceView
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

    const s = constitution.sections;
    const parts: string[] = [];

    if (s.identity?.selfConcept) {
      parts.push(`IDENTITY: ${s.identity.selfConcept}`);
    }
    if (s.values?.core?.length) {
      parts.push(`CORE VALUES: ${s.values.core.map(v => v.name).join(', ')}`);
    }
    if (s.models?.decisionPatterns?.length) {
      parts.push(`DECISION PATTERNS: ${s.models.decisionPatterns.slice(0, 5).join('; ')}`);
    }
    if (s.worldview?.beliefs?.length) {
      parts.push(`WORLDVIEW: ${s.worldview.beliefs.slice(0, 3).join('; ')}`);
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
    rawEntries: Array<{ content: string; created_at: string }>;
  }> {
    const results = {
      trainingPairs: [] as Array<{ user_content: string; assistant_content: string; quality_score: number }>,
      personalityProfile: null as Record<string, unknown> | null,
      editorNotes: [] as Array<{ type: string; content: string; topic?: string }>,
      rawEntries: [] as Array<{ content: string; created_at: string }>
    };

    // Get training pairs — pull many more for deep extraction
    if (sourceData === 'training_pairs' || sourceData === 'both') {
      const { data: pairs } = await supabase
        .from('training_pairs')
        .select('user_content, assistant_content, quality_score')
        .eq('user_id', userId)
        .gte('quality_score', 0.3)
        .order('quality_score', { ascending: false })
        .limit(500);

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

    // Get ALL editor notes (observations, mental_models, questions, gaps)
    if (includeEditorNotes) {
      const { data: notes } = await supabase
        .from('editor_notes')
        .select('type, content, topic')
        .eq('user_id', userId)
        .limit(300);

      results.editorNotes = notes || [];
    }

    // Get raw processed entries for maximum signal extraction
    const { data: entries } = await supabase
      .from('entries')
      .select('content, created_at')
      .eq('user_id', userId)
      .not('content', 'is', null)
      .order('created_at', { ascending: true })
      .limit(200);

    results.rawEntries = (entries || []).filter(e => e.content && e.content.trim().length > 0);

    return results;
  }

  private async performExtraction(sources: {
    trainingPairs: Array<{ user_content: string; assistant_content: string; quality_score: number }>;
    personalityProfile: Record<string, unknown> | null;
    editorNotes: Array<{ type: string; content: string; topic?: string }>;
    rawEntries?: Array<{ content: string; created_at: string }>;
  }): Promise<{ sections: ConstitutionSections }> {

    // Keep prompt under ~40k chars to avoid timeouts
    const trainingContext = sources.trainingPairs.slice(0, 40).map(p =>
      `Q: "${p.user_content.slice(0, 200)}"\nA: "${p.assistant_content.slice(0, 400)}"`
    ).join('\n---\n');

    const profileContext = sources.personalityProfile
      ? JSON.stringify(sources.personalityProfile, null, 2).slice(0, 3000)
      : 'No personality profile available.';

    const notesContext = sources.editorNotes.slice(0, 50).map(n =>
      `[${n.type}] ${n.content.slice(0, 200)}${n.topic ? ` (${n.topic})` : ''}`
    ).join('\n');

    const rawEntryContext = (sources.rawEntries || []).slice(0, 15).map((e, i) => {
      const truncated = e.content.length > 1500 ? e.content.slice(0, 1500) + '...' : e.content;
      return `[Entry ${i + 1}]\n${truncated}`;
    }).join('\n---\n');

    const { text: response } = await generateText({
      model: getQualityModel(),
      system: `You are extracting the most comprehensive, detailed CONSTITUTION possible from extensive data about a person (the Author). This Author has uploaded roughly 100 hours of dense voice memos plus other written content. Your job is to squeeze MAXIMUM SIGNAL from every piece of data.

A Constitution is a cognitive fingerprint — the complete operating manual for how this specific person thinks, decides, values, and behaves. It must be so detailed and specific that another intelligence reading it could accurately PREDICT this person's response to any novel situation.

CRITICAL: This Constitution must be EXTENSIVE. Generic platitudes have ZERO value. Every single entry must be concrete, specific, and grounded in evidence from the data. If you can't trace an insight back to something in the data, don't include it.

The Constitution has exactly 5 sections:

1. WORLDVIEW — What they actually believe about reality. Specific causal models they use. Contrarian stances and where they diverge from mainstream thinking. Their epistemology: how they evaluate truth, what sources they trust, what counts as evidence vs noise. Their theories about how systems (social, economic, technological, biological) work. What they think is broken in the world and why.

2. VALUES — Precise hierarchy, not a flat list. What they would sacrifice comfort, money, or relationships for. What makes them viscerally angry or energised. The difference between what they SAY they value and what their BEHAVIOUR reveals they value. Specific aesthetic preferences. What they find beautiful, what they find ugly. Their relationship to money, status, time, attention.

3. MODELS — Their actual decision heuristics with concrete examples. How they handle uncertainty and ambiguity. When they trust intuition vs analysis. Their specific mental models — named frameworks they return to repeatedly. How they evaluate people, opportunities, risks. Their reasoning patterns under pressure. Cognitive shortcuts they rely on. How they learn and update beliefs.

4. IDENTITY — How they ACTUALLY communicate — specific vocabulary, sentence patterns, rhetorical devices, humour style, level of directness. Their relationship to authority, status, expertise, and institutions. The narrative they tell themselves about who they are. How their self-concept has evolved. How they present to different audiences. Their emotional patterns and triggers.

5. SHADOWS — The genuinely uncomfortable stuff. Where their stated values contradict their actions. What they systematically misjudge. Where their self-model is most wrong. Patterns they repeat despite knowing better. Blind spots they'd resist acknowledging. Defence mechanisms.

GO DEEP AND LONG. Extract 15-40 items per array field. The more data the Author has provided, the longer and more detailed each section should be. Every entry should be a full sentence or two — not a phrase. "selfConcept" and "communicationStyle" should each be a substantial multi-paragraph description, not a single sentence. This is a COMPREHENSIVE document.

Return JSON matching this EXACT structure:
{
  "worldview": {
    "beliefs": ["Full sentence describing a specific belief grounded in evidence from the data"],
    "epistemology": ["Full sentence about how they evaluate truth and knowledge"]
  },
  "values": {
    "core": [{"name": "string", "description": "Detailed description with concrete examples from the data"}],
    "preferences": [{"name": "string", "description": "Detailed description with examples"}],
    "repulsions": ["Specific thing they find unacceptable, with context"]
  },
  "models": {
    "mentalModels": [{"name": "string", "domain": "string", "description": "Detailed explanation of how they apply this model"}],
    "decisionPatterns": ["Full description of a specific decision pattern with examples"]
  },
  "identity": {
    "selfConcept": "EXTENSIVE multi-paragraph first-person description of who they are, how they see themselves, their story, their relationship to the world",
    "communicationStyle": "DETAILED multi-paragraph description of exactly how they communicate — tone, vocabulary, rhythm, quirks, patterns, what they emphasise, how they structure arguments",
    "roles": ["Specific role they inhabit with context about how they perform it"],
    "trustModel": "Detailed description of how they build, extend, and withdraw trust"
  },
  "shadows": {
    "contradictions": ["Specific contradiction between stated value and observed behaviour"],
    "blindSpots": ["Specific pattern they miss or misjudge, with evidence"],
    "dissonance": ["Where their self-model diverges from reality, with examples"]
  }
}

Return ONLY the JSON object. Make it as long and detailed as the data supports.`,
      messages: [
        {
          role: 'user',
          content: `AVAILABLE DATA — analyze ALL of it thoroughly:\n\nRAW ENTRIES (Author's own words — voice memos, notes, uploads):\n${rawEntryContext || 'No raw entries available.'}\n\nTRAINING PAIRS (extracted Author voice/opinions):\n${trainingContext || 'No training pairs available.'}\n\nPERSONALITY PROFILE:\n${profileContext}\n\nEDITOR NOTES (observations about Author):\n${notesContext || 'No editor notes available.'}\n\nRemember: Extract MAXIMUM signal. Be exhaustive. Every section should be extensive.`
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
      const validated = ConstitutionSectionsSchema.safeParse(parsed);
      if (validated.success) {
        return { sections: validated.data };
      }

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
      worldview: {
        beliefs: parsed.worldview?.beliefs || defaults.worldview.beliefs,
        epistemology: parsed.worldview?.epistemology || defaults.worldview.epistemology,
      },
      values: {
        core: parsed.values?.core || defaults.values.core,
        preferences: parsed.values?.preferences || defaults.values.preferences,
        repulsions: parsed.values?.repulsions || defaults.values.repulsions,
      },
      models: {
        mentalModels: parsed.models?.mentalModels || defaults.models.mentalModels,
        decisionPatterns: parsed.models?.decisionPatterns || defaults.models.decisionPatterns,
      },
      identity: {
        selfConcept: parsed.identity?.selfConcept || defaults.identity.selfConcept,
        communicationStyle: parsed.identity?.communicationStyle || defaults.identity.communicationStyle,
        roles: parsed.identity?.roles || defaults.identity.roles,
        trustModel: parsed.identity?.trustModel,
      },
      shadows: {
        contradictions: parsed.shadows?.contradictions || defaults.shadows.contradictions,
        blindSpots: parsed.shadows?.blindSpots || defaults.shadows.blindSpots,
        dissonance: parsed.shadows?.dissonance || defaults.shadows.dissonance,
      },
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
    if (typeof target === 'object' && target !== null && typeof data === 'object' && data !== null) {
      for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
        const existing = (target as Record<string, unknown>)[key];
        if (Array.isArray(existing) && Array.isArray(val)) {
          (target as Record<string, unknown[]>)[key] = [...existing, ...val];
        } else {
          (target as Record<string, unknown>)[key] = val;
        }
      }
    }
  }

  private updateInSection(sections: ConstitutionSections, section: keyof ConstitutionSections, data: unknown): void {
    (sections as Record<string, unknown>)[section] = data;
  }

  private removeFromSection(_sections: ConstitutionSections, _section: keyof ConstitutionSections, _data: unknown): void {
    // No-op: section-level removal handled by updateInSection with filtered data
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
      system: `You are analyzing whether to update an Author's Constitution based on new information.

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
}`,
      messages: [
        {
          role: 'user',
          content: `CURRENT CONSTITUTION:\n${constitution.content}\n\nNEW TRIGGER:\nType: ${trigger.type}\nContext: ${trigger.context}\nContent: ${trigger.content}`
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

  /**
   * Derive and save Training/Inference views from the existing Canon.
   * Called by constitution-refresh cron. Does NOT re-extract or overwrite Canon.
   */
  async deriveViews(userId: string): Promise<{ version: number } | null> {
    const constitution = await this.getConstitution(userId);
    if (!constitution) return null;

    await this.saveToVault(userId, constitution, constitution.content);
    return { version: constitution.version };
  }

  /**
   * Public method for Editor to save incremental constitution updates.
   * Only saves Canon — Training/Inference derived later during full refresh.
   */
  async saveNewVersion(
    userId: string,
    sections: ConstitutionSections,
    content: string,
    changeSummary: string
  ): Promise<Constitution> {
    const current = await this.getConstitution(userId);
    const constitution = await this.saveConstitution(userId, sections, content, changeSummary, current?.id);
    await this.saveCanonToVault(userId, constitution, content);
    return constitution;
  }

  /**
   * Save only the Canon view to vault (used for incremental delta updates)
   */
  private async saveCanonToVault(userId: string, constitution: Constitution, markdown: string): Promise<void> {
    try {
      await saveToVault(
        userId,
        `constitution/v${constitution.version}.md`,
        markdown,
        'constitution',
        { metadata: { version: constitution.version, createdAt: constitution.createdAt }, allowOverwrite: true }
      );
      await saveToVault(
        userId,
        'constitution/current.md',
        markdown,
        'constitution',
        { metadata: { version: constitution.version }, allowOverwrite: true }
      );
      console.log(`[ConstitutionManager] Saved Canon to Vault: v${constitution.version}`);
    } catch (error) {
      console.error('[ConstitutionManager] Vault save failed:', error);
    }
  }

  /**
   * Save Canon + derive Training and Inference views.
   * Only called during full periodic re-extraction (constitution-refresh),
   * NOT on every incremental delta update from processEntry.
   */
  private async saveToVault(userId: string, constitution: Constitution, markdown: string): Promise<void> {
    await this.saveCanonToVault(userId, constitution, markdown);

    try {
      const trainingView = deriveTrainingView(constitution.sections);
      await saveToVault(
        userId,
        'constitution/training.md',
        trainingView.fullText,
        'constitution',
        { metadata: { version: constitution.version, view: 'training' }, allowOverwrite: true }
      );

      const inferenceView = deriveInferenceView(constitution.sections);
      const inferenceText = Object.entries(inferenceView.sections)
        .map(([section, text]) => `[${section.toUpperCase()}]\n${text}`)
        .join('\n\n');
      await saveToVault(
        userId,
        'constitution/inference.md',
        inferenceText,
        'constitution',
        { metadata: { version: constitution.version, view: 'inference' }, allowOverwrite: true }
      );

      console.log(`[ConstitutionManager] Derived Training + Inference views: v${constitution.version}`);
    } catch (error) {
      console.error('[ConstitutionManager] Derived views save failed:', error);
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
  // Constitution Gap Scoring (Phase C Tier 2)
  // ==========================================================================

  async recomputeGapScores(userId: string): Promise<Array<{
    section: 'worldview' | 'values' | 'models' | 'identity' | 'shadows';
    gapScore: number;
    priority: 'high' | 'medium' | 'low';
    trainingPairCount: number;
    avgQualityScore: number | null;
    evidenceCount: number;
  }>> {
    const nowIso = new Date().toISOString();
    const constitution = await this.getConstitution(userId);

    const sectionCoverage = {
      worldview: !!constitution && (
        (constitution.sections.worldview?.beliefs?.length || 0) > 0 ||
        (constitution.sections.worldview?.epistemology?.length || 0) > 0
      ),
      values: !!constitution && (
        (constitution.sections.values?.core?.length || 0) > 0 ||
        (constitution.sections.values?.preferences?.length || 0) > 0
      ),
      models: !!constitution && (
        (constitution.sections.models?.mentalModels?.length || 0) > 0 ||
        (constitution.sections.models?.decisionPatterns?.length || 0) > 0
      ),
      identity: !!constitution && (constitution.sections.identity?.selfConcept?.trim().length || 0) > 0,
      shadows: !!constitution && (
        (constitution.sections.shadows?.contradictions?.length || 0) > 0 ||
        (constitution.sections.shadows?.blindSpots?.length || 0) > 0
      )
    } satisfies Record<'worldview' | 'values' | 'models' | 'identity' | 'shadows', boolean>;

    const [{ data: evaluations }, { data: trainingPairs }] = await Promise.all([
      supabase
        .from('rlaif_evaluations')
        .select('constitution_section, overall_confidence')
        .eq('user_id', userId),
      supabase
        .from('training_pairs')
        .select('quality_score')
        .eq('user_id', userId)
        .limit(500)
    ]);

    const evalBySection: Record<'worldview' | 'values' | 'models' | 'identity' | 'shadows', { count: number; avgConfidence: number }> = {
      worldview: { count: 0, avgConfidence: 0 },
      values: { count: 0, avgConfidence: 0 },
      models: { count: 0, avgConfidence: 0 },
      identity: { count: 0, avgConfidence: 0 },
      shadows: { count: 0, avgConfidence: 0 }
    };

    for (const row of evaluations || []) {
      const section = row.constitution_section as keyof typeof evalBySection;
      if (!evalBySection[section]) continue;
      evalBySection[section].count += 1;
      evalBySection[section].avgConfidence += Number(row.overall_confidence) || 0;
    }
    for (const key of Object.keys(evalBySection) as Array<keyof typeof evalBySection>) {
      const bucket = evalBySection[key];
      if (bucket.count > 0) bucket.avgConfidence = bucket.avgConfidence / bucket.count;
    }

    const trainingPairCount = (trainingPairs || []).length;
    const avgQualityScore = trainingPairCount > 0
      ? (trainingPairs || []).reduce((sum, pair) => sum + (Number(pair.quality_score) || 0), 0) / trainingPairCount
      : null;

    const rows = (['values', 'models', 'identity', 'worldview', 'shadows'] as const).map((section) => {
      const evidence = evalBySection[section];
      const missingPenalty = sectionCoverage[section] ? 0.05 : 0.45;
      const evidencePenalty = evidence.count < 3 ? 0.35 : evidence.count < 10 ? 0.2 : 0.05;
      const confidencePenalty = evidence.avgConfidence < 0.55 ? 0.25 : evidence.avgConfidence < 0.75 ? 0.15 : 0.05;

      const gapScore = Math.min(1, Number((missingPenalty + evidencePenalty + confidencePenalty).toFixed(4)));
      const priority: 'high' | 'medium' | 'low' = gapScore >= 0.7 ? 'high' : gapScore >= 0.4 ? 'medium' : 'low';

      return {
        user_id: userId,
        section,
        subsection: null,
        priority,
        training_pair_count: trainingPairCount,
        avg_quality_score: avgQualityScore,
        gap_score: gapScore,
        evidence_count: evidence.count,
        last_evaluated: nowIso
      };
    });

    await supabase.from('constitution_gaps').delete().eq('user_id', userId);
    await supabase.from('constitution_gaps').insert(rows);

    return rows.map((r) => ({
      section: r.section,
      gapScore: r.gap_score,
      priority: r.priority,
      trainingPairCount: r.training_pair_count,
      avgQualityScore: r.avg_quality_score,
      evidenceCount: r.evidence_count
    }));
  }

  async getGapSummary(
    userId: string,
    options: { recompute?: boolean } = {}
  ): Promise<Array<{
    section: 'worldview' | 'values' | 'models' | 'identity' | 'shadows';
    gapScore: number;
    priority: 'high' | 'medium' | 'low';
    trainingPairCount: number;
    avgQualityScore: number | null;
    evidenceCount: number;
    lastEvaluated: string | null;
  }>> {
    if (options.recompute) {
      const recomputed = await this.recomputeGapScores(userId);
      return recomputed.map((r) => ({
        ...r,
        lastEvaluated: new Date().toISOString()
      }));
    }

    const { data } = await supabase
      .from('constitution_gaps')
      .select('section, priority, training_pair_count, avg_quality_score, gap_score, evidence_count, last_evaluated')
      .eq('user_id', userId)
      .order('gap_score', { ascending: false });

    if (!data || data.length === 0) {
      return this.getGapSummary(userId, { recompute: true });
    }

    return data.map((row) => ({
      section: row.section as 'worldview' | 'values' | 'models' | 'identity' | 'shadows',
      gapScore: Number(row.gap_score) || 0,
      priority: row.priority as 'high' | 'medium' | 'low',
      trainingPairCount: row.training_pair_count || 0,
      avgQualityScore: row.avg_quality_score,
      evidenceCount: row.evidence_count || 0,
      lastEvaluated: row.last_evaluated || null
    }));
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  private calculateCoverage(sections: ConstitutionSections): number {
    const checks = [
      (sections.worldview?.beliefs?.length || 0) > 0,
      (sections.worldview?.epistemology?.length || 0) > 0,
      (sections.values?.core?.length || 0) > 0,
      (sections.values?.preferences?.length || 0) > 0,
      (sections.models?.mentalModels?.length || 0) > 0,
      (sections.models?.decisionPatterns?.length || 0) > 0,
      !!sections.identity?.selfConcept,
      !!sections.identity?.communicationStyle,
      (sections.shadows?.contradictions?.length || 0) > 0,
      (sections.shadows?.blindSpots?.length || 0) > 0,
    ];

    return checks.filter(Boolean).length / checks.length;
  }

  private getSectionStatus(sections: ConstitutionSections): { filled: string[]; empty: string[] } {
    const status: Record<string, boolean> = {
      worldview: (sections.worldview?.beliefs?.length || 0) > 0 || (sections.worldview?.epistemology?.length || 0) > 0,
      values: (sections.values?.core?.length || 0) > 0,
      models: (sections.models?.mentalModels?.length || 0) > 0 || (sections.models?.decisionPatterns?.length || 0) > 0,
      identity: !!sections.identity?.selfConcept,
      shadows: (sections.shadows?.contradictions?.length || 0) > 0 || (sections.shadows?.blindSpots?.length || 0) > 0,
    };

    return {
      filled: Object.entries(status).filter(([, v]) => v).map(([k]) => k),
      empty: Object.entries(status).filter(([, v]) => !v).map(([k]) => k)
    };
  }

  sectionsToMarkdown(sections: ConstitutionSections): string {
    const lines: string[] = [];

    lines.push('# Constitution\n');

    // Worldview
    lines.push('## Worldview\n');
    if (sections.worldview?.beliefs?.length > 0) {
      sections.worldview.beliefs.forEach(b => lines.push(`- ${b}`));
    }
    if (sections.worldview?.epistemology?.length > 0) {
      lines.push('\n### Epistemology\n');
      sections.worldview.epistemology.forEach(e => lines.push(`- ${e}`));
    }
    if (!sections.worldview?.beliefs?.length && !sections.worldview?.epistemology?.length) {
      lines.push('_Not yet defined._');
    }
    lines.push('');

    // Values
    lines.push('## Values\n');
    if (sections.values?.core?.length > 0) {
      lines.push('### Core\n');
      sections.values.core.forEach(v => lines.push(`- **${v.name}**: ${v.description}`));
      lines.push('');
    }
    if (sections.values?.preferences?.length > 0) {
      lines.push('### Preferences\n');
      sections.values.preferences.forEach(v => lines.push(`- **${v.name}**: ${v.description}`));
      lines.push('');
    }
    if (sections.values?.repulsions?.length > 0) {
      lines.push('### Repulsions\n');
      sections.values.repulsions.forEach(r => lines.push(`- ${r}`));
      lines.push('');
    }
    if (!sections.values?.core?.length && !sections.values?.preferences?.length) {
      lines.push('_Not yet defined._\n');
    }

    // Models
    lines.push('## Models\n');
    if (sections.models?.mentalModels?.length > 0) {
      sections.models.mentalModels.forEach(m => {
        lines.push(`- **${m.name}** (${m.domain}): ${m.description}`);
      });
      lines.push('');
    }
    if (sections.models?.decisionPatterns?.length > 0) {
      lines.push('### Decision Patterns\n');
      sections.models.decisionPatterns.forEach(d => lines.push(`- ${d}`));
      lines.push('');
    }
    if (!sections.models?.mentalModels?.length && !sections.models?.decisionPatterns?.length) {
      lines.push('_Not yet defined._\n');
    }

    // Identity
    lines.push('## Identity\n');
    if (sections.identity?.selfConcept) {
      lines.push(sections.identity.selfConcept);
      lines.push('');
    }
    if (sections.identity?.communicationStyle) {
      lines.push(`**Communication style:** ${sections.identity.communicationStyle}\n`);
    }
    if (sections.identity?.roles?.length > 0) {
      lines.push('**Roles:** ' + sections.identity.roles.join(', ') + '\n');
    }
    if (sections.identity?.trustModel) {
      lines.push(`**Trust model:** ${sections.identity.trustModel}\n`);
    }
    if (!sections.identity?.selfConcept) {
      lines.push('_Not yet defined._\n');
    }

    // Shadows
    lines.push('## Shadows\n');
    if (sections.shadows?.contradictions?.length > 0) {
      lines.push('### Contradictions\n');
      sections.shadows.contradictions.forEach(c => lines.push(`- ${c}`));
      lines.push('');
    }
    if (sections.shadows?.blindSpots?.length > 0) {
      lines.push('### Blind Spots\n');
      sections.shadows.blindSpots.forEach(b => lines.push(`- ${b}`));
      lines.push('');
    }
    if (sections.shadows?.dissonance?.length > 0) {
      lines.push('### Theory-Reality Dissonance\n');
      sections.shadows.dissonance.forEach(d => lines.push(`- ${d}`));
      lines.push('');
    }
    if (!sections.shadows?.contradictions?.length && !sections.shadows?.blindSpots?.length) {
      lines.push('_Not yet observed._\n');
    }

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
