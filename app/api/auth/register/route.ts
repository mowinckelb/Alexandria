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

    // Extract username from email (text before @)
    const username = email.split('@')[0].toLowerCase();

    // Register with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error('Registration error:', error);
      throw error;
    }

    return NextResponse.json({ 
      status: 'registered',
      userId: data.user?.id,
      username: username
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'registration failed';
    return NextResponse.json(
      { detail: message },
      { status: 400 }
    );
  }
}
