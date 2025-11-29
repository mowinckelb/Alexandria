// @CRITICAL: Authentication - breaks = no one can use app
// Verify: login/logout still works after ANY change to this file
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
}

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export async function POST(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json(
      { detail: 'server configuration error' },
      { status: 500 }
    );
  }

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { detail: 'email and password required' },
        { status: 400 }
      );
    }

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
