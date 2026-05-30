'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useChat, type Message } from '@/hooks/useChat';
import MarkdownRenderer from './MarkdownRenderer';
import ModelSelector from './ModelSelector';
import WelcomeScreen from './WelcomeScreen';
import './ChatUI.css';

export default function ChatUI() {
  const {
    messages,
    isLoading,
    models,
    selectedModel,
    setSelectedModel,
    error,
    sendMessage,
    stopGenerating,
    clearChat,
    fetchModels,
  } = useChat();

  const [input, setInput] = useState('');
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch models on mount
  useEffect(() => { fetchModels(); }, [fetchModels]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  // Submit handler
  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [input, isLoading, sendMessage]);

  // Handle Enter (Shift+Enter for newline)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  // Suggestion click
  const handleSuggestion = useCallback((text: string) => {
    sendMessage(text);
  }, [sendMessage]);

  // Regenerate last response
  const handleRegenerate = useCallback(() => {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMsg) return;
    // Remove last assistant message
    const lastAssistantIdx = messages.length - 1;
    if (messages[lastAssistantIdx]?.role === 'assistant') {
      // We'll clear last pair and resend
      const newUserMsg = { ...lastUserMsg };
      setMessagesWithHistory(newUserMsg);
    }
  }, [messages]);

  const setMessagesWithHistory = useCallback((userMsg: Message) => {
    // Remove last assistant message and resend
    const prevMessages = messages.slice(0, -1);
    const allMessages = [...prevMessages];
    // This is a simplified approach - just send the user message again
    sendMessage(userMsg.content);
  }, [messages, sendMessage]);

  const hasMessages = messages.length > 0;

  return (
    <div className="chat-container">
      {/* Header */}
      <header className="chat-header">
        <div className="header-left">
          <div className="logo-mark">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <h1 className="header-title">FreeLLMAPI</h1>
            <span className="header-subtitle">
              {isLoading ? (
                <span className="status-generating">
                  <span className="pulse-dot" /> Generating...
                </span>
              ) : (
                'Free LLM Proxy · Auto-fallback'
              )}
            </span>
          </div>
        </div>
        <div className="header-right">
          <ModelSelector
            models={models}
            selectedModel={selectedModel}
            onSelectModel={setSelectedModel}
          />
          {hasMessages && (
            <button
              className="btn-icon"
              onClick={clearChat}
              title="New chat"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </button>
          )}
          <button
            className="btn-icon mobile-menu-btn"
            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </header>

      {/* Messages area */}
      <main className="chat-main">
        {!hasMessages ? (
          <WelcomeScreen onSuggestionClick={handleSuggestion} models={models} />
        ) : (
          <div className="messages-list">
            {messages.map((msg, idx) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isLast={idx === messages.length - 1}
                onRegenerate={msg.role === 'assistant' && idx === messages.length - 1 ? handleRegenerate : undefined}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* Error bar */}
      {error && (
        <div className="error-bar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <span>{error}</span>
          <button onClick={() => sendMessage(messages[messages.length - 2]?.content || '')}>Retry</button>
        </div>
      )}

      {/* Input area */}
      <footer className="chat-footer">
        <form className="input-container" onSubmit={handleSubmit}>
          <div className="input-wrapper">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message FreeLLMAPI..."
              rows={1}
              className="chat-textarea"
              disabled={isLoading}
            />
            <div className="input-actions">
              {isLoading ? (
                <button
                  type="button"
                  className="send-btn stop-btn"
                  onClick={stopGenerating}
                  title="Stop generating"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                </button>
              ) : (
                <button
                  type="submit"
                  className="send-btn"
                  disabled={!input.trim()}
                  title="Send message"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22,2 15,22 11,13 2,9" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <p className="input-hint">
            FreeLLMAPI may produce inaccurate information. Model: <strong>{selectedModel === 'auto' ? 'Auto (router picks best)' : selectedModel}</strong>
          </p>
        </form>
      </footer>
    </div>
  );
}

// ── Message Bubble ──
function MessageBubble({ message, isLast, onRegenerate }: {
  message: Message;
  isLast: boolean;
  onRegenerate?: () => void;
}) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [message.content]);

  return (
    <div className={`message-row ${isUser ? 'message-user' : 'message-assistant'}`}>
      <div className="message-avatar">
        {isUser ? (
          <div className="avatar-user">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        ) : (
          <div className="avatar-ai">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
        )}
      </div>
      <div className="message-content">
        <div className="message-role">{isUser ? 'You' : 'FreeLLMAPI'}</div>
        <div className="message-body">
          {isUser ? (
            <p className="user-text">{message.content}</p>
          ) : (
            <>
              <MarkdownRenderer content={message.content} isStreaming={message.isStreaming} />
              {message.isStreaming && <span className="typing-cursor" />}
            </>
          )}
        </div>
        {/* Actions */}
        {!isUser && !message.isStreaming && message.content && (
          <div className="message-actions">
            <button className="msg-action-btn" onClick={handleCopy} title="Copy">
              {copied ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20,6 9,17 4,12" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              )}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
            {onRegenerate && (
              <button className="msg-action-btn" onClick={onRegenerate} title="Regenerate">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="23,4 23,10 17,10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                </svg>
                <span>Regenerate</span>
              </button>
            )}
            {message.model && (
              <span className="msg-model-tag">
                via {message.model === 'auto' ? 'Auto' : message.model}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
