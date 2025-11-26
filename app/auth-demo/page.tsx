'use client';
import AuthScreen from '../components/AuthScreen';

/**
 * Demo page to preview the auth screen
 * Visit /auth-demo to see it
 * This file can be deleted when auth is implemented
 */
export default function AuthDemo() {
  const handleAuthSuccess = (userId: string, token: string) => {
    alert(`Auth successful!\nUser: ${userId}\nToken: ${token.substring(0, 20)}...`);
  };

  return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
}

