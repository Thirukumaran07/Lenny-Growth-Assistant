import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
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
          placeholder="Ask Lenny anything about growth, PMF, retention, PLG…"
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
          {/* Helper hint or character counter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '20px' }}>
            {isOverLimit ? (
              <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 500 }}>
                {prompt.length}/{MAX_CHAR_COUNT} characters (exceeds limit)
              </span>
            ) : prompt.length > 3000 ? (
              <span style={{ fontSize: '11px', color: '#d97706' }}>
                {prompt.length}/{MAX_CHAR_COUNT}
              </span>
            ) : (
              <span style={{ fontSize: '11.5px', color: '#9c978f' }}>
                Return to send · Shift+Return for new line
              </span>
            )}
          </div>

          {/* Right Action Button: Dark Circular Button */}
          {isStreaming ? (
            <button
              type="button"
              onClick={onStopStreaming}
              aria-label="Stop generating response"
              title="Stop generating"
              style={{
                width: '36px',
                height: '36px',
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
              <Square size={13} fill="#ffffff" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canSubmit}
              aria-label="Send message"
              title={canSubmit ? 'Send message' : 'Type a question'}
              style={{
                width: '36px',
                height: '36px',
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
                <ArrowUp size={17} strokeWidth={2.4} />
              ) : (
                <Radio size={16} />
              )}
            </button>
          )}
        </div>
      </div>
    </form>
  );
};
