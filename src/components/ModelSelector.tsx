'use client';

import { useState, useRef, useEffect } from 'react';
import type { ModelInfo } from '@/hooks/useChat';

interface ModelSelectorProps {
  models: ModelInfo[];
  selectedModel: string;
  onSelectModel: (model: string) => void;
}

export default function ModelSelector({ models, selectedModel, onSelectModel }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const selected = models.find(m => m.id === selectedModel);
  const label = selected?.name || (selectedModel === 'auto' ? 'Auto' : selectedModel);

  return (
    <div className="model-selector" ref={dropdownRef}>
      <button
        className="model-selector-btn"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
        </svg>
        <span className="model-selector-label">{label}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`chevron ${isOpen ? 'open' : ''}`}>
          <polyline points="6,9 12,15 18,9" />
        </svg>
      </button>

      {isOpen && (
        <div className="model-dropdown">
          <div className="model-dropdown-header">Select Model</div>
          <div className="model-dropdown-list">
            {models.map(model => (
              <button
                key={model.id}
                className={`model-option ${model.id === selectedModel ? 'active' : ''}`}
                onClick={() => { onSelectModel(model.id); setIsOpen(false); }}
              >
                <div className="model-option-name">{model.name}</div>
                <div className="model-option-meta">
                  <span className="model-provider-badge">{model.owned_by}</span>
                  {model.context_window && (
                    <span className="model-ctx">{(model.context_window / 1024).toFixed(0)}K ctx</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
