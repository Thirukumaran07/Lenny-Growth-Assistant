import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Compass,
  FileText,
  RefreshCw,
  RotateCcw,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { Citation, Message } from '../types/chat';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatComposer } from './ChatComposer';
import { CitationDrawer } from './CitationDrawer';

interface ChatViewProps {
  activeSessionId: string | null;
  messages: Message[];
  isStreaming: boolean;
  streamingMessage: Message | null;
  error: string | null;
  lastPrompt?: string;
  onSendMessage: (prompt: string) => void;
  onStopStreaming: () => void;
  onClearError?: () => void;
  onRetry?: () => void;
}

/** Context-aware follow-up prompts derived from the last assistant message's citations. */
function deriveFollowUps(messages: Message[]): { text: string; icon: React.ReactNode }[] {
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
  if (!lastAssistant) return [];

  const guests = (lastAssistant.citations ?? []).map((c) => c.guest).filter(Boolean);
  const suggestions: { text: string; icon: React.ReactNode }[] = [];

  if (guests.length > 0) {
    const g = guests[0];
    suggestions.push({
      text: `What else did ${g} say about user retention?`,
      icon: <Users size={13} color="var(--accent-primary)" />,
    });
    suggestions.push({
      text: `How did ${g} define product-market fit?`,
      icon: <Compass size={13} color="var(--accent-growth)" />,
    });
  }

  suggestions.push(
    {
      text: 'What growth levers work best for early-stage SaaS?',
      icon: <TrendingUp size={13} color="var(--warning)" />,
    },
    {
      text: 'Write a Ship 30 for 30 essay on activation loops.',
      icon: <FileText size={13} color="var(--accent-primary)" />,
    },
  );

  return suggestions.slice(0, 4);
}

const STARTER_PROMPTS = [
  {
    icon: <Compass size={18} color="var(--accent-growth)" />,
    title: 'Product-Market Fit Engine',
    prompt: 'How did Superhuman measure product-market fit according to Rahul Vohra?',
    guest: 'Rahul Vohra',
    description: 'Discover the 40% rule and survey-based PMF measurement framework.',
  },
  {
    icon: <FileText size={18} color="var(--accent-primary)" />,
    title: 'Ship 30 for 30 Essay',
    prompt: 'Write a Ship 30 for 30 essay on Miro scaling product-led growth.',
    guest: 'Elena Verna',
    description: 'Generate an atomic essay based on transcript insights.',
  },
  {
    icon: <BookOpen size={18} color="var(--warning)" />,
    title: 'Retention Benchmarks',
    prompt: "What retention benchmarks should a seed-stage B2B SaaS target?",
    guest: 'Elena Verna & Gustaf Alströmer',
    description: 'D1, D7, D30 benchmarks and cohort health signals.',
  },
  {
    icon: <TrendingUp size={18} color="#A78BFA" />,
    title: 'Figma Onboarding Loop',
    prompt: "How did Figma design their collaborative onboarding activation loop?",
    guest: 'Amanda Kleha',
    description: 'Activation metrics, AHA moments and onboarding frameworks.',
  },
];

export const ChatView: React.FC<ChatViewProps> = ({
  activeSessionId,
  messages,
  isStreaming,
  streamingMessage,
  error,
  lastPrompt,
  onSendMessage,
  onStopStreaming,
  onClearError,
  onRetry,
}) => {
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [citationList, setCitationList] = useState<Citation[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new content
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingMessage?.content, streamingMessage?.statusStage]);

  const handleOpenCitation = (citation: Citation, allCitations: Citation[]) => {
    setActiveCitation(citation);
    setCitationList(allCitations);
  };

  const handleCloseCitation = () => setActiveCitation(null);

  const showEmptyState = messages.length === 0 && !streamingMessage;
  const followUps = !showEmptyState && !isStreaming ? deriveFollowUps(messages) : [];

  return (
    <main
      ref={containerRef}
      role="main"
      aria-label="Chat conversation"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-base)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Scrollable history or empty state */}
      <div
        role="region"
        aria-label="Chat conversation history"
        aria-live="polite"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '28px 32px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {showEmptyState ? (
          /* ── Empty / Welcome State ── */
          <div
            style={{
              maxWidth: '760px',
              width: '100%',
              margin: 'auto',
              textAlign: 'center',
              padding: '20px 0 40px',
            }}
          >
            {/* Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '20px',
                padding: '5px 16px',
                fontSize: '12px',
                color: 'var(--accent-growth)',
                marginBottom: '20px',
                fontWeight: 500,
              }}
            >
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'var(--accent-growth)', flexShrink: 0 }} />
              Grounded in Lenny's Podcast & Newsletter Archives
            </div>

            <h1
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '12px',
                letterSpacing: '-0.025em',
                lineHeight: '1.25',
              }}
            >
              How can I help with your<br />product and growth goals?
            </h1>
            <p
              style={{
                fontSize: '15px',
                color: 'var(--text-secondary)',
                lineHeight: '1.6',
                maxWidth: '560px',
                margin: '0 auto 40px auto',
              }}
            >
              Ask tactical questions grounded in verified podcast transcripts, generate a{' '}
              <em>Ship 30 for 30</em> essay, or explore retention benchmarks with source attribution.
            </p>

            {/* Starter cards grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: '14px',
                textAlign: 'left',
              }}
            >
              {STARTER_PROMPTS.map((card, idx) => (
                <button
                  key={idx}
                  id={`starter-prompt-${idx}`}
                  onClick={() => !isStreaming && onSendMessage(card.prompt)}
                  disabled={isStreaming}
                  aria-label={`Starter prompt: ${card.title}`}
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    padding: '18px',
                    cursor: isStreaming ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    opacity: isStreaming ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isStreaming) {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-primary)';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(59,130,246,0.15)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {card.icon}
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {card.title}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                    {card.description}
                  </p>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
                    Source: {card.guest}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* ── Message Stream ── */
          <div style={{ maxWidth: '840px', width: '100%', margin: '0 auto' }}>
            {messages.map((msg) => (
              <ChatMessageItem
                key={msg.id}
                message={msg}
                onOpenCitation={handleOpenCitation}
                onRetry={
                  msg.role === 'assistant' && msg.statusStage === 'error' && onRetry
                    ? onRetry
                    : undefined
                }
              />
            ))}

            {/* Live streaming message */}
            {streamingMessage && (
              <ChatMessageItem
                message={streamingMessage}
                onOpenCitation={handleOpenCitation}
              />
            )}

            {/* Session-specific follow-up suggestions */}
            {followUps.length > 0 && (
              <div
                aria-label="Follow-up question suggestions"
                style={{
                  marginTop: '4px',
                  marginBottom: '16px',
                  padding: '14px 16px',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--text-muted)',
                    marginBottom: '10px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <RotateCcw size={10} />
                  Suggested follow-ups
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {followUps.map((f, i) => (
                    <button
                      key={i}
                      id={`followup-${i}`}
                      onClick={() => onSendMessage(f.text)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '16px',
                        padding: '5px 12px',
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-primary)';
                        (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)';
                        (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                      }}
                    >
                      {f.icon}
                      <span>{f.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Global Error Banner */}
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            maxWidth: '800px',
            width: 'calc(100% - 64px)',
            margin: '0 auto 12px auto',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.5)',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            color: '#FCA5A5',
            fontSize: '13px',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1 }}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <strong style={{ display: 'block', marginBottom: '4px' }}>Connection Error</strong>
              <span style={{ fontSize: '12px', lineHeight: '1.5', color: '#FCA5A5' }}>{error}</span>
              {error.toLowerCase().includes('ollama') && (
                <div
                  style={{
                    marginTop: '8px',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)',
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    borderRadius: '4px',
                    padding: '4px 8px',
                  }}
                >
                  → Run: <code>ollama serve</code> in Terminal, then retry
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'flex-start' }}>
            {onRetry && lastPrompt && (
              <button
                id="error-retry-btn"
                onClick={onRetry}
                aria-label="Retry last request"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '5px',
                  padding: '5px 10px',
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <RefreshCw size={11} /> Retry
              </button>
            )}
            {onClearError && (
              <button
                onClick={onClearError}
                aria-label="Dismiss error"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px',
                }}
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Composer */}
      <div
        style={{
          padding: '10px 32px 20px 32px',
          backgroundColor: 'var(--bg-base)',
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        <ChatComposer
          onSendMessage={onSendMessage}
          onStopStreaming={onStopStreaming}
          isStreaming={isStreaming}
          disabled={false}
          activeSessionId={activeSessionId}
        />
      </div>

      {/* Citation Drawer slide-over */}
      <CitationDrawer
        citation={activeCitation}
        allCitations={citationList}
        onSelectCitation={(c) => setActiveCitation(c)}
        onClose={handleCloseCitation}
      />
    </main>
  );
};
