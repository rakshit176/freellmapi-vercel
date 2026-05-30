'use client';

import { useMemo } from 'react';

// Simple but powerful markdown renderer — no external deps
// Handles: code blocks, inline code, bold, italic, links, lists, headings, blockquotes, horizontal rules

interface MarkdownProps {
  content: string;
  isStreaming?: boolean;
}

export default function MarkdownRenderer({ content, isStreaming }: MarkdownProps) {
  const html = useMemo(() => renderMarkdown(content, isStreaming), [content, isStreaming]);

  return (
    <div
      className="markdown-body"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderMarkdown(text: string, isStreaming?: boolean): string {
  if (!text) return '';

  // Extract code blocks first to protect them from other processing
  const codeBlocks: string[] = [];
  let processed = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const idx = codeBlocks.length;
    const language = lang || 'plaintext';
    const escapedCode = escapeHtml(code.trimEnd());
    const highlighted = simpleHighlight(escapedCode, language);
    codeBlocks.push(
      `<div class="code-block">
        <div class="code-header">
          <span class="code-lang">${escapeHtml(language)}</span>
          <button class="copy-btn" onclick="(function(btn){var code=btn.closest('.code-block').querySelector('code');navigator.clipboard.writeText(code.textContent);btn.textContent='Copied!';setTimeout(()=>btn.textContent='Copy',2000)})(this)">Copy</button>
        </div>
        <pre><code class="language-${escapeHtml(language)}">${highlighted}</code></pre>
      </div>`
    );
    return `%%CODEBLOCK_${idx}%%`;
  });

  // Handle incomplete code block at end during streaming
  if (isStreaming) {
    processed = processed.replace(/```(\w*)\n?([\s\S]*)$/g, (_, lang, code) => {
      const idx = codeBlocks.length;
      const language = lang || 'plaintext';
      const escapedCode = escapeHtml(code.trimEnd());
      codeBlocks.push(
        `<div class="code-block streaming-code">
          <div class="code-header">
            <span class="code-lang">${escapeHtml(language)}</span>
          </div>
          <pre><code class="language-${escapeHtml(language)}">${escapedCode}<span class="cursor-blink">|</span></code></pre>
        </div>`
      );
      return `%%CODEBLOCK_${idx}%%`;
    });
  }

  // Split into lines for block-level processing
  const lines = processed.split('\n');
  const output: string[] = [];
  let inList = false;
  let listType = '';
  let inBlockquote = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Skip code block placeholders — they're already processed
    if (line.includes('%%CODEBLOCK_')) {
      if (inList) { output.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      if (inBlockquote) { output.push('</blockquote>'); inBlockquote = false; }
      output.push(line);
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      if (inList) { output.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      if (inBlockquote) { output.push('</blockquote>'); inBlockquote = false; }
      const level = headingMatch[1].length;
      output.push(`<h${level}>${inlineFormat(headingMatch[2])}</h${level}>`);
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      if (inList) { output.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      output.push('<hr />');
      continue;
    }

    // Blockquote
    const bqMatch = line.match(/^>\s?(.*)$/);
    if (bqMatch) {
      if (inList) { output.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      if (!inBlockquote) { output.push('<blockquote>'); inBlockquote = true; }
      output.push(`<p>${inlineFormat(bqMatch[1])}</p>`);
      continue;
    } else if (inBlockquote) {
      output.push('</blockquote>');
      inBlockquote = false;
    }

    // Unordered list
    const ulMatch = line.match(/^[\s]*[-*+]\s+(.+)$/);
    if (ulMatch) {
      if (inList && listType !== 'ul') { output.push('</ol>'); inList = false; }
      if (!inList) { output.push('<ul>'); inList = true; listType = 'ul'; }
      output.push(`<li>${inlineFormat(ulMatch[1])}</li>`);
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^[\s]*\d+\.\s+(.+)$/);
    if (olMatch) {
      if (inList && listType !== 'ol') { output.push('</ul>'); inList = false; }
      if (!inList) { output.push('<ol>'); inList = true; listType = 'ol'; }
      output.push(`<li>${inlineFormat(olMatch[1])}</li>`);
      continue;
    }

    if (inList) {
      output.push(listType === 'ul' ? '</ul>' : '</ol>');
      inList = false;
    }

    // Empty line
    if (!line.trim()) {
      if (inBlockquote) { output.push('</blockquote>'); inBlockquote = false; }
      continue;
    }

    // Paragraph
    output.push(`<p>${inlineFormat(line)}</p>`);
  }

  if (inList) output.push(listType === 'ul' ? '</ul>' : '</ol>');
  if (inBlockquote) output.push('</blockquote>');

  let result = output.join('\n');

  // Restore code blocks
  codeBlocks.forEach((block, idx) => {
    result = result.replace(`%%CODEBLOCK_${idx}%%`, block);
  });

  return result;
}

function inlineFormat(text: string): string {
  // Inline code
  text = text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Links
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  // Strikethrough
  text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');
  return text;
}

// Very basic syntax highlighting — keywords, strings, comments, numbers
function simpleHighlight(code: string, lang: string): string {
  if (lang === 'plaintext' || !lang) return code;

  // Highlight strings
  code = code.replace(/(&quot;.*?&quot;|'.*?'|`[^`]*`)/g, '<span class="hl-string">$1</span>');
  // Highlight comments
  code = code.replace(/(\/\/.*$|#.*$)/gm, '<span class="hl-comment">$1</span>');
  // Highlight numbers
  code = code.replace(/\b(\d+\.?\d*)\b/g, '<span class="hl-number">$1</span>');
  // Highlight keywords (JS/TS/Python common)
  const keywords = [
    'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do',
    'class', 'extends', 'import', 'export', 'default', 'from', 'async', 'await', 'try',
    'catch', 'finally', 'throw', 'new', 'this', 'super', 'yield', 'typeof', 'instanceof',
    'switch', 'case', 'break', 'continue', 'true', 'false', 'null', 'undefined', 'void',
    'def', 'self', 'print', 'elif', 'lambda', 'with', 'as', 'in', 'not', 'and', 'or',
    'is', 'None', 'True', 'False', 'pass', 'raise', 'except', 'finally',
    'type', 'interface', 'enum', 'implements', 'abstract', 'public', 'private', 'protected',
    'static', 'readonly', 'declare', 'namespace', 'module',
  ];
  const kwRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
  code = code.replace(kwRegex, '<span class="hl-keyword">$1</span>');

  return code;
}
