'use client';

import SessionDemo from '../components/SessionDemo';

export default function DemoPage() {
  return (
    <div style={{
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <div style={{ maxWidth: '420px', width: '100%' }}>
        <SessionDemo />
      </div>
    </div>
  );
}
