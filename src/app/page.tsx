'use client';

import dynamic from 'next/dynamic';

// Lazy-load the chat UI to keep initial bundle small
const ChatUI = dynamic(() => import('@/components/ChatUI'), {
  ssr: false,
  loading: () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100dvh',
      background: '#09090b',
      color: '#71717a',
      fontSize: '14px',
      gap: '8px',
    }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
        <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
      </svg>
      Loading FreeLLMAPI...
    </div>
  ),
});

export default function Home() {
  return <ChatUI />;
}
