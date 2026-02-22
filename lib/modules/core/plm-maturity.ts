import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

type MaturitySection = 'worldview' | 'values' | 'models' | 'identity' | 'shadows';

export async function recomputePlmMaturity(userId: string): Promise<{
  overallScore: number;
  domainScores: Record<MaturitySection, number>;
  trainingPairCount: number;
  rlaifEvaluationCount: number;
}> {
  const [{ data: evals }, { count: trainingPairCount }] = await Promise.all([
    supabase
      .from('rlaif_evaluations')
      .select('constitution_section, overall_confidence')
      .eq('user_id', userId),
    supabase
      .from('training_pairs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
  ]);

  const buckets: Record<MaturitySection, { total: number; count: number }> = {
    worldview: { total: 0, count: 0 },
    values: { total: 0, count: 0 },
    models: { total: 0, count: 0 },
    identity: { total: 0, count: 0 },
    shadows: { total: 0, count: 0 }
  };

  for (const row of evals || []) {
    const section = row.constitution_section as MaturitySection;
    if (!buckets[section]) continue;
    buckets[section].count += 1;
    buckets[section].total += Number(row.overall_confidence) || 0;
  }

  const domainScores = {} as Record<MaturitySection, number>;
  let overallNumerator = 0;
  let overallDenominator = 0;

  for (const key of Object.keys(buckets) as MaturitySection[]) {
    const bucket = buckets[key];
    const score = bucket.count > 0 ? Number((bucket.total / bucket.count).toFixed(4)) : 0;
    domainScores[key] = score;
    overallNumerator += score * (bucket.count > 0 ? 1 : 0.25);
    overallDenominator += bucket.count > 0 ? 1 : 0.25;
  }

  const overallScore = overallDenominator > 0
    ? Number((overallNumerator / overallDenominator).toFixed(4))
    : 0;

  await supabase
    .from('plm_maturity')
    .upsert({
      user_id: userId,
      overall_score: overallScore,
      domain_scores: domainScores,
      training_pair_count: trainingPairCount || 0,
      rlaif_evaluation_count: (evals || []).length,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

  return {
    overallScore,
    domainScores,
    trainingPairCount: trainingPairCount || 0,
    rlaifEvaluationCount: (evals || []).length
  };
}
