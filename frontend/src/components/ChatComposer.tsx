import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  Code,
  Globe,
  Lightbulb,
  Plus,
  Radio,
  Square,
} from 'lucide-react';

interface ChatComposerProps {
  onSendMessage: (content: string) => void;
  onStopStreaming?: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  activeSessionId?: string | null;
}

const MAX_CHAR_COUNT = 4000;

export const ChatComposer: React.FC<ChatComposerProps> = ({
  onSendMessage,
  onStopStreaming,
  isStreaming,
  disabled = false,
  activeSessionId,
}) => {
  const [prompt, setPrompt] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }
  }, [prompt]);

  // Focus on session change
  useEffect(() => {
    if (activeSessionId && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [activeSessionId]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || isStreaming || disabled) return;
    onSendMessage(trimmed);
    setPrompt('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isOverLimit = prompt.length > MAX_CHAR_COUNT;
  const canSubmit =
    prompt.trim().length > 0 && !isStreaming && !disabled && !isOverLimit;

  const insertPrefix = (prefix: string) => {
    setPrompt((prev) => (prev ? `${prev} ${prefix}` : prefix));
    textareaRef.current?.focus();
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        width: '100%',
        maxWidth: '780px',
        margin: '0 auto',
        position: 'relative',
      }}
    >
      {/* Floating Dock Container */}
      <div
        style={{
          backgroundColor: '#f1ede5',
          border: isFocused ? '1px solid #c9c2b4' : '1px solid #e3ddd2',
          borderRadius: '24px',
          padding: '12px 16px 10px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: isFocused
            ? '0 6px 24px rgba(0, 0, 0, 0.08)'
            : '0 4px 18px rgba(0, 0, 0, 0.04)',
          transition: 'all 0.2s ease',
        }}
      >
        {/* Top: Textarea */}
        <textarea
          id="chat-composer-textarea"
          ref={textareaRef}
          rows={1}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Ask me anything....."
          aria-label="Chat query input"
          disabled={disabled}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#22201e',
            fontSize: '15px',
            lineHeight: '1.5',
            resize: 'none',
            width: '100%',
            fontFamily: 'var(--font-sans)',
            minHeight: '26px',
            maxHeight: '160px',
            padding: '2px 0',
          }}
        />

        {/* Bottom Toolbar Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '2px',
          }}
        >
          {/* Action Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => insertPrefix('/essay ')}
              title="Brainstorm an atomic essay"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                backgroundColor: '#e6e1d7',
                border: 'none',
                borderRadius: '16px',
                padding: '5px 11px',
                fontSize: '12px',
                color: '#383531',
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#dad4c9')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#e6e1d7')}
            >
              <Lightbulb size={13} color="#d97706" />
              <span>Brainstorm</span>
            </button>

            <button
              type="button"
              onClick={() => insertPrefix('What do transcripts say about ')}
              title="Query podcast archives"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                backgroundColor: '#e6e1d7',
                border: 'none',
                borderRadius: '16px',
                padding: '5px 11px',
                fontSize: '12px',
                color: '#383531',
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#dad4c9')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#e6e1d7')}
            >
              <Globe size={13} color="#e05d44" />
              <span>Web search</span>
            </button>

            <button
              type="button"
              onClick={() => insertPrefix('/artifact ')}
              title="Generate interactive artifact"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                backgroundColor: '#e6e1d7',
                border: 'none',
                borderRadius: '16px',
                padding: '5px 11px',
                fontSize: '12px',
                color: '#383531',
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#dad4c9')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#e6e1d7')}
            >
              <Code size={13} color="#e05d44" />
              <span>Code</span>
            </button>

            <button
              type="button"
              onClick={() => insertPrefix('How did ')}
              title="More actions"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#e6e1d7',
                border: 'none',
                borderRadius: '50%',
                width: '26px',
                height: '26px',
                color: '#4a4641',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#dad4c9')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#e6e1d7')}
            >
              <Plus size={13} />
            </button>

            {isOverLimit && (
              <span style={{ fontSize: '11px', color: '#ef4444', marginLeft: '4px' }}>
                {prompt.length}/{MAX_CHAR_COUNT}
              </span>
            )}
          </div>

          {/* Right Action Button: Dark Circular Button */}
          {isStreaming ? (
            <button
              type="button"
              onClick={onStopStreaming}
              aria-label="Stop generating response"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: '#262423',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.15s ease, background 0.15s ease',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#383534')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#262423')}
            >
              <Square size={14} fill="#ffffff" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canSubmit}
              aria-label="Send message"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: canSubmit ? '#262423' : '#d2cbbf',
                color: canSubmit ? '#ffffff' : '#8a8479',
                border: 'none',
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.15s ease, background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (canSubmit) (e.currentTarget as HTMLElement).style.backgroundColor = '#383534';
              }}
              onMouseLeave={(e) => {
                if (canSubmit) (e.currentTarget as HTMLElement).style.backgroundColor = '#262423';
              }}
            >
              {prompt.trim() ? (
                <ArrowUp size={18} strokeWidth={2.4} />
              ) : (
                <Radio size={18} />
              )}
            </button>
          )}
        </div>
      </div>
    </form>
  );
};
