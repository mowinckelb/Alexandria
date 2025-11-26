import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { detail: 'email and password required' },
        { status: 400 }
      );
    }

    // Login with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });

    if (error) {
      console.error('Login error:', error);
      throw error;
    }

    // Extract username from email (text before @)
    const username = email.split('@')[0].toLowerCase();

    return NextResponse.json({ 
      access_token: data.session?.access_token,
      user_id: data.user?.id,
      username: username,
      token_type: 'bearer'
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'login failed';
    return NextResponse.json(
      { detail: message },
      { status: 401 }
    );
  }
}
