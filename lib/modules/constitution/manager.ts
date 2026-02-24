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
          content: `You are extracting a CONSTITUTION from data about a person (the Author).

The Constitution has exactly 5 sections:

1. WORLDVIEW — What they believe about reality. How things work. What exists and matters. How they know things.
2. VALUES — What matters and in what order. Non-negotiable core values, strong preferences, what they find beautiful and repulsive.
3. MODELS — How they think and decide. Mental models, heuristics, reasoning patterns, gut vs analysis.
4. IDENTITY — Who they are, how they present, how they communicate. Self-concept, roles, style.
5. SHADOWS — Where they are wrong. Contradictions, blind spots, theory-reality dissonance.

AVAILABLE DATA:

TRAINING PAIRS (Author's voice/opinions):
${trainingContext || 'No training pairs available.'}

PERSONALITY PROFILE:
${profileContext}

EDITOR NOTES (observations about Author):
${notesContext || 'No editor notes available.'}

Extract a Constitution. Be thorough but accurate — only include what you can INFER. Leave arrays empty if uncertain.

Return JSON matching this EXACT structure:
{
  "worldview": {
    "beliefs": ["What I believe about reality, cause and effect, how things work"],
    "epistemology": ["How I know things, sources of truth, evidence evaluation"]
  },
  "values": {
    "core": [{"name": "string", "description": "string"}],
    "preferences": [{"name": "string", "description": "string"}],
    "repulsions": ["things I find repulsive or unacceptable"]
  },
  "models": {
    "mentalModels": [{"name": "string", "domain": "string", "description": "how it works"}],
    "decisionPatterns": ["how I approach decisions"]
  },
  "identity": {
    "selfConcept": "who I am — in first person",
    "communicationStyle": "how I communicate — tone, vocabulary, rhythm",
    "roles": ["roles and narratives"],
    "trustModel": "how I build trust"
  },
  "shadows": {
    "contradictions": ["stated value vs actual behaviour"],
    "blindSpots": ["what I miss or misjudge"],
    "dissonance": ["where my self-model diverges from reality"]
  }
}

Return ONLY the JSON object.`
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
