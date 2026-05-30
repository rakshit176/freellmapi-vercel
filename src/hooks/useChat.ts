'use client';

import { useState, useCallback, useRef } from 'react';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  timestamp: number;
  isStreaming?: boolean;
}

export interface ModelInfo {
  id: string;
  name: string;
  owned_by: string;
  context_window: number | null;
}

interface UseChatOptions {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export function useChat(options: UseChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState(options.model || 'auto');
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Fetch available models
  const fetchModels = useCallback(async () => {
    try {
      const res = await fetch('/v1/models');
      if (!res.ok) return;
      const data = await res.json();
      const modelList = (data.data || []).map((m: any) => ({
        id: m.id,
        name: m.name || m.id,
        owned_by: m.owned_by,
        context_window: m.context_window,
      }));
      setModels(modelList);
    } catch {
      // Silently fail
    }
  }, []);

  // Stop generating
  const stopGenerating = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsLoading(false);
    setMessages(prev => prev.map(m => m.isStreaming ? { ...m, isStreaming: false } : m));
  }, []);

  // Send message with streaming
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    setError(null);
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };

    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      model: selectedModel,
      timestamp: Date.now(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setIsLoading(true);

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const allMessages = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (options.apiKey) {
        headers['Authorization'] = `Bearer ${options.apiKey}`;
      }

      const response = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: selectedModel,
          messages: allMessages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 2048,
          stream: true,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        const errMsg = errData?.error?.message || `HTTP ${response.status}`;
        throw new Error(errMsg);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const choice = parsed.choices?.[0];
            if (choice) {
              // Content delta
              const delta = choice.delta?.content;
              // Reasoning delta (e.g. from Pollinations/QwQ)
              const reasoning = choice.delta?.reasoning;
              if (delta) {
                fullContent += delta;
              }
              if (reasoning && !delta) {
                // Show reasoning in a subtle way — append with thinking marker
                fullContent += reasoning;
              }
              if (delta || reasoning) {
                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantMsg.id
                      ? { ...m, content: fullContent }
                      : m
                  )
                );
              }
            }
          } catch {
            // Skip malformed chunks
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User cancelled — keep partial content
      } else {
        setError(err.message || 'An error occurred');
        // Remove the empty assistant message
        setMessages(prev => prev.filter(m => m.id !== assistantMsg.id));
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMsg.id
            ? { ...m, isStreaming: false }
            : m
        )
      );
    }
  }, [messages, isLoading, selectedModel, options.apiKey, options.temperature, options.maxTokens]);

  // Clear chat
  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
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
  };
}
