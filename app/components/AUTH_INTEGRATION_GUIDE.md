# Auth Integration Guide

When you're ready to implement authentication, follow these steps:

## 1. Update `app/page.tsx`

Replace the TEST_USER_ID constant with actual auth state:

```typescript
'use client';
import { useState, useEffect } from 'react';
import AuthScreen from './components/AuthScreen';

export default function Alexandria() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    // Check for existing session
    const storedToken = localStorage.getItem('alexandria_token');
    const storedUserId = localStorage.getItem('alexandria_user_id');
    
    if (storedToken && storedUserId) {
      setToken(storedToken);
      setUserId(storedUserId);
      setIsAuthenticated(true);
    }
  }, []);

  const handleAuthSuccess = (newUserId: string, newToken: string) => {
    setUserId(newUserId);
    setToken(newToken);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('alexandria_token');
    localStorage.removeItem('alexandria_user_id');
    setToken('');
    setUserId('');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  // ... rest of your app with logout button
}
```

## 2. Add Logout Button

Update the header to include logout functionality:

```typescript
{/* Header - add this to show user info */}
<div className="fixed top-0 left-0 right-0 flex items-center justify-between p-6 opacity-55 text-[0.85rem] z-50 bg-[#fafafa]">
  <div className="flex items-center gap-4">
    <span>{userId}</span>
    <span className="text-[#ccc]">·</span>
    <button 
      onClick={handleLogout}
      className="bg-transparent border-none text-[#1a1a1a] text-[0.85rem] cursor-pointer hover:opacity-70"
    >
      sign out
    </button>
  </div>
  
  <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
    <span>alexandria</span>
    <span className="text-[0.85rem] italic opacity-80">Immortalise the Greats</span>
  </div>
</div>
```

## 3. Create Auth API Routes

### `/api/auth/register/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId, password } = await request.json();

    // Register with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: `${userId}@alexandria.local`, // Use custom email format
      password,
    });

    if (error) throw error;

    return NextResponse.json({ 
      status: 'registered',
      userId: data.user?.id 
    });
  } catch (error: any) {
    return NextResponse.json(
      { detail: error.message || 'registration failed' },
      { status: 400 }
    );
  }
}
```

### `/api/auth/login/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId, password } = await request.json();

    // Login with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: `${userId}@alexandria.local`,
      password,
    });

    if (error) throw error;

    return NextResponse.json({ 
      access_token: data.session?.access_token,
      token_type: 'bearer'
    });
  } catch (error: any) {
    return NextResponse.json(
      { detail: error.message || 'login failed' },
      { status: 401 }
    );
  }
}
```

## 4. Update Existing API Routes

Add auth middleware to protect routes:

```typescript
// Example: /api/ingest/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

async function authenticate(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }

  const token = authHeader.substring(7);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error('Invalid token');

  return user.id;
}

export async function POST(request: NextRequest) {
  try {
    const userId = await authenticate(request);
    // ... rest of your ingest logic using real userId
  } catch (error) {
    return NextResponse.json(
      { detail: 'Unauthorized' },
      { status: 401 }
    );
  }
}
```

## 5. Update Database Schema

Re-enable foreign key constraints in your migrations:

```sql
-- Add user_id foreign key constraint to entries table
ALTER TABLE entries
ADD CONSTRAINT entries_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Same for other tables (memory_fragments, twins, chat_sessions, etc.)
```

## Mobile Responsive Notes

The auth screen is already mobile-responsive. On mobile:
- Header adjusts padding
- Input fields remain touch-friendly
- Keyboard shortcuts still work
- No auto-refocus after submission to avoid keyboard popup

## Testing

1. Try registering a new user
2. Verify user appears in Supabase Auth dashboard
3. Try logging in with credentials
4. Verify logout clears localStorage
5. Test protected API routes with/without token

