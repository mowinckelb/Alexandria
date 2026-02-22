import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const QuerySchema = z.object({
  userId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(200).optional()
});

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  try {
    const parsed = QuerySchema.safeParse({
      userId: request.nextUrl.searchParams.get('userId'),
      limit: request.nextUrl.searchParams.get('limit') || 50
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query', details: parsed.error.issues }, { status: 400 });
    }

    const { userId, limit } = parsed.data;
    const supabase = getSupabase();

    const { data: keysRes, error: keysError } = await supabase
      .from('api_keys')
      .select('id')
      .eq('user_id', userId)
      .limit(500);
    if (keysError) return NextResponse.json({ error: keysError.message }, { status: 500 });
    const keyIds = (keysRes || []).map((k) => k.id);

    const [expensesRes, incomeRes, usageRes] = await Promise.all([
      supabase
        .from('user_expense_ledger')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit || 50),
      supabase
        .from('user_income_ledger')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit || 50),
      supabase
        .from('api_usage')
        .select('cost, created_at, api_key_id')
        .in('api_key_id', keyIds.length > 0 ? keyIds : ['00000000-0000-0000-0000-000000000000'])
        .order('created_at', { ascending: false })
        .limit(limit || 50)
    ]);

    if (expensesRes.error) return NextResponse.json({ error: expensesRes.error.message }, { status: 500 });
    if (incomeRes.error) return NextResponse.json({ error: incomeRes.error.message }, { status: 500 });
    if (usageRes.error) return NextResponse.json({ error: usageRes.error.message }, { status: 500 });

    const expenses = expensesRes.data || [];
    const income = incomeRes.data || [];
    const usage = usageRes.data || [];
    const expenseTotal = expenses.reduce((sum, row) => sum + (row.amount_usd || 0), 0);
    const incomeTotal = income.reduce((sum, row) => sum + (row.amount_usd || 0), 0);
    const usageTotal = usage.reduce((sum, row) => sum + (row.cost || 0), 0);

    const expenseByCategory = expenses.reduce<Record<string, number>>((acc, row) => {
      const key = row.category || 'uncategorized';
      acc[key] = Number(((acc[key] || 0) + (row.amount_usd || 0)).toFixed(6));
      return acc;
    }, {});

    const incomeByCategory = income.reduce<Record<string, number>>((acc, row) => {
      const key = row.category || 'uncategorized';
      acc[key] = Number(((acc[key] || 0) + (row.amount_usd || 0)).toFixed(6));
      return acc;
    }, {});

    return NextResponse.json({
      summary: {
        expenseTotalUsd: Number(expenseTotal.toFixed(6)),
        incomeTotalUsd: Number(incomeTotal.toFixed(6)),
        netUsd: Number((incomeTotal - expenseTotal).toFixed(6)),
        usageCostUsd: Number(usageTotal.toFixed(6))
      },
      breakdown: {
        expenseByCategory,
        incomeByCategory
      },
      usage,
      expenses,
      income
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
