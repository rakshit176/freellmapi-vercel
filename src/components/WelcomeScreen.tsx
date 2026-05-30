'use client';

import type { ModelInfo } from '@/hooks/useChat';

interface WelcomeScreenProps {
  onSuggestionClick: (text: string) => void;
  models: ModelInfo[];
}

const suggestions = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: 'Explain a concept',
    text: 'Explain how transformer attention works in simple terms',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="16,18 22,12 16,6" /><polyline points="8,6 2,12 8,18" />
      </svg>
    ),
    title: 'Write code',
    text: 'Write a Python function that finds the longest palindrome in a string',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    title: 'Help me decide',
    text: 'Compare React vs Vue for building a SaaS dashboard',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
    title: 'Creative writing',
    text: 'Write a short sci-fi story about AI discovering emotions',
  },
];

export default function WelcomeScreen({ onSuggestionClick, models }: WelcomeScreenProps) {
  return (
    <div className="welcome-screen">
      <div className="welcome-hero">
        <div className="welcome-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <h2 className="welcome-title">How can I help you today?</h2>
        <p className="welcome-subtitle">
          Powered by free-tier LLMs with automatic fallback routing.
          {models.length > 0 && ` ${models.length} models available.`}
        </p>
      </div>
      <div className="suggestions-grid">
        {suggestions.map((s, i) => (
          <button
            key={i}
            className="suggestion-card"
            onClick={() => onSuggestionClick(s.text)}
          >
            <div className="suggestion-icon">{s.icon}</div>
            <div className="suggestion-text">
              <div className="suggestion-title">{s.title}</div>
              <div className="suggestion-desc">{s.text}</div>
            </div>
          </button>
        ))}
      </div>
      <div className="welcome-footer">
        <span>FreeLLMAPI routes your request across free-tier LLM providers with automatic fallback</span>
      </div>
    </div>
  );
}
