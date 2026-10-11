import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, Keyboard, Square } from 'lucide-react';

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
      el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
    }
  }, [prompt]);

  // Focus on session change (new chat)
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

  const borderColor = isFocused
    ? 'var(--border-focus)'
    : isOverLimit
    ? 'var(--danger)'
    : 'var(--border-subtle)';

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        maxWidth: '800px',
        width: '100%',
        margin: '0 auto',
        position: 'relative',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-input)',
          border: `1px solid ${borderColor}`,
          borderRadius: '14px',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isFocused
            ? '0 0 0 3px rgba(59, 130, 246, 0.1), 0 4px 20px rgba(0, 0, 0, 0.3)'
            : '0 4px 16px rgba(0, 0, 0, 0.2)',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        }}
      >
        <textarea
          id="chat-composer-textarea"
          ref={textareaRef}
          rows={1}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={
            isStreaming
              ? 'Generating response…'
              : 'Ask a growth question or type /essay… (Enter to send, Shift+Enter for newline)'
          }
          disabled={isStreaming}
          aria-label="Chat query input"
          aria-describedby="composer-helper"
          style={{
            width: '100%',
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
            color: isStreaming ? 'var(--text-muted)' : 'var(--text-primary)',
            fontSize: '14px',
            lineHeight: '1.55',
            resize: 'none',
            minHeight: '24px',
            maxHeight: '180px',
            overflowY: 'auto',
            fontFamily: 'var(--font-sans)',
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '10px',
            paddingTop: '8px',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          {/* Left: helper text + char count */}
          <div
            id="composer-helper"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '11px',
              color: 'var(--text-muted)',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Keyboard size={11} />
              <span>Grounded in Lenny's archives</span>
            </span>
            <span
              style={{
                color: isOverLimit ? 'var(--danger)' : 'var(--text-muted)',
                fontVariantNumeric: 'tabular-nums',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
              }}
            >
              {prompt.length}/{MAX_CHAR_COUNT}
            </span>
            {isOverLimit && (
              <span style={{ color: 'var(--danger)', fontWeight: 500 }}>
                Too long — trim your prompt
              </span>
            )}
          </div>

          {/* Right: Stop or Send */}
          <div>
            {isStreaming ? (
              <button
                type="button"
                id="stop-generating-btn"
                onClick={onStopStreaming}
                aria-label="Stop generating response"
                title="Stop generation (■)"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'var(--danger)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.opacity = '0.85';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.opacity = '1';
                }}
              >
                <Square size={11} fill="#fff" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="submit"
                id="send-message-btn"
                disabled={!canSubmit}
                aria-label="Send message"
                title={canSubmit ? 'Send (Enter)' : 'Type a message to send'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: canSubmit
                    ? 'var(--accent-primary)'
                    : 'var(--bg-surface-elevated)',
                  color: canSubmit ? '#fff' : 'var(--text-muted)',
                  cursor: canSubmit ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s ease',
                  boxShadow: canSubmit ? '0 2px 8px rgba(59,130,246,0.3)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (canSubmit) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--accent-hover)';
                }}
                onMouseLeave={(e) => {
                  if (canSubmit) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--accent-primary)';
                }}
              >
                <ArrowUp size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
};
