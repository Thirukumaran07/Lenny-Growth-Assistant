import React, { useState } from 'react';
import Markdown from 'markdown-to-jsx';
import {
  AlertCircle,
  AlertTriangle,
  Bot,
  Check,
  Copy,
  ExternalLink,
  Eye,
  FileCode,
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
  User,
} from 'lucide-react';
import { Artifact, Citation, Message } from '../types/chat';

interface ChatMessageItemProps {
  message: Message;
  onOpenCitation: (citation: Citation, allCitations: Citation[]) => void;
  onOpenArtifact?: (artifact: Artifact) => void;
  onRetry?: () => void;
}

/** Render inline citation badge e.g. [1] from markdown content. */
function CitationBadge({
  index,
  citation,
  onClick,
}: {
  index: number;
  citation: Citation;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={`View source: ${citation.guest} at ${citation.timestamp}`}
      aria-label={`Open citation ${index + 1}: ${citation.guest}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        backgroundColor: 'rgba(6, 78, 59, 0.7)',
        color: '#6EE7B7',
        border: '1px solid #059669',
        borderRadius: '4px',
        padding: '1px 6px',
        fontSize: '11px',
        fontWeight: 500,
        cursor: 'pointer',
        verticalAlign: 'middle',
        marginLeft: '2px',
        lineHeight: '16px',
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(16, 185, 129, 0.2)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(6, 78, 59, 0.7)';
      }}
    >
      <span
        style={{
          width: '5px',
          height: '5px',
          borderRadius: '50%',
          backgroundColor: '#10B981',
          flexShrink: 0,
        }}
      />
      {index + 1} {citation.guest.split(' ')[0]}
    </button>
  );
}

const STATUS_LABELS: Record<string, string> = {
  routing: 'Analyzing intent & routing skill…',
  retrieving: 'Searching Lenny podcast archives…',
  generating: 'Generating grounded response…',
  generating_direct: 'Generating response…',
  generating_artifact: 'Synthesizing standalone artifact…',
  insufficient_evidence: 'Checking evidence threshold…',
  composing_essay: 'Composing Ship 30 for 30 essay…',
  finalizing: 'Finalizing grounded answer…',
};

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  onOpenCitation,
  onOpenArtifact,
  onRetry,
}) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available
    }
  };

  const isInsufficient =
    message.statusStage === 'insufficient_evidence' ||
    message.content.toLowerCase().includes('insufficient evidence');

  const isError = message.statusStage === 'error';

  const statusLabel =
    message.statusStage && STATUS_LABELS[message.statusStage]
      ? STATUS_LABELS[message.statusStage]
      : message.statusMessage ?? null;

  const formattedTime = message.created_at
    ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <article
      aria-label={isUser ? 'Your message' : 'Assistant response'}
      style={{
        display: 'flex',
        gap: '14px',
        padding: '18px 20px',
        borderRadius: '12px',
        backgroundColor: isUser ? 'rgba(31, 41, 55, 0.35)' : 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        marginBottom: '16px',
        transition: 'background-color 0.2s',
      }}
    >
      {/* Avatar */}
      <div
        aria-hidden="true"
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          backgroundColor: isUser ? 'var(--accent-primary)' : 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: isUser ? '#fff' : 'var(--accent-growth)',
        }}
      >
        {isUser ? <User size={15} /> : <Bot size={17} />}
      </div>

      {/* Main Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header line */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px',
            flexWrap: 'wrap',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {isUser ? 'You' : 'The Lenny Growth Assistant'}
            </span>
            {!isUser && !isInsufficient && !isError && (
              <span
                style={{
                  fontSize: '10px',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  color: 'var(--accent-growth)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: '10px',
                  padding: '1px 7px',
                  fontWeight: 500,
                }}
              >
                Grounded Model
              </span>
            )}
            {formattedTime && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formattedTime}</span>
            )}
          </div>

          {/* Copy button — only for non-streaming assistant messages */}
          {!isUser && message.content && !message.isStreaming && (
            <button
              onClick={handleCopy}
              aria-label={copied ? 'Copied!' : 'Copy response to clipboard'}
              title={copied ? 'Copied!' : 'Copy to clipboard'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'none',
                border: 'none',
                color: copied ? 'var(--accent-growth)' : 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '11px',
                padding: '3px 6px',
                borderRadius: '4px',
                transition: 'color 0.15s',
              }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          )}
        </div>

        {/* Live streaming status */}
        {message.isStreaming && statusLabel && (
          <div
            aria-live="polite"
            aria-label={statusLabel}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '5px 10px',
              fontSize: '12px',
              color: 'var(--accent-growth)',
              marginBottom: '12px',
            }}
          >
            <Loader2
              size={12}
              style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}
            />
            <span>{statusLabel}</span>
          </div>
        )}

        {/* Insufficient Evidence warning */}
        {isInsufficient && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              backgroundColor: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '12px',
              fontSize: '13px',
              color: '#FCD34D',
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ display: 'block', marginBottom: '3px' }}>
                ▲ Insufficient Evidence in Transcripts
              </strong>
              <div style={{ fontSize: '12px', color: '#FDE68A', lineHeight: '1.5' }}>
                The ingested podcast transcripts do not contain strong semantic evidence (cosine
                similarity &lt; 0.65) for this query.
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                Try asking about <strong>Product-Market Fit</strong>,{' '}
                <strong>Retention Loops</strong>, or <strong>Pricing Models</strong> from ingested guests.
              </div>
            </div>
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '12px',
              fontSize: '13px',
              color: '#FCA5A5',
            }}
          >
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <strong style={{ display: 'block', marginBottom: '3px' }}>Generation Error</strong>
              <div style={{ fontSize: '12px', lineHeight: '1.5' }}>{message.content}</div>
              {onRetry && (
                <button
                  onClick={onRetry}
                  style={{
                    marginTop: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '5px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  <RefreshCw size={11} /> Retry Request
                </button>
              )}
            </div>
          </div>
        )}

        {/* Markdown content rendered safely — never dangerouslySetInnerHTML */}
        <div
          className="markdown-content"
          aria-live={message.isStreaming ? 'polite' : undefined}
          style={{
            fontSize: '14px',
            lineHeight: '1.7',
            color: 'var(--text-primary)',
            wordBreak: 'break-word',
          }}
        >
          {message.content ? (
            <Markdown
              options={{
                // Disable HTML to prevent raw HTML injection from assistant content
                forceBlock: false,
                overrides: {
                  a: {
                    component: ({
                      href,
                      children,
                      ...props
                    }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}
                        {...props}
                      >
                        {children}
                      </a>
                    ),
                  },
                  code: {
                    component: ({
                      children,
                      ...props
                    }: React.HTMLAttributes<HTMLElement>) => (
                      <code
                        style={{
                          backgroundColor: 'var(--bg-surface-elevated)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '12.5px',
                          color: '#E5E7EB',
                          wordBreak: 'break-all',
                        }}
                        {...props}
                      >
                        {children}
                      </code>
                    ),
                  },
                  pre: {
                    component: ({
                      children,
                      ...props
                    }: React.HTMLAttributes<HTMLPreElement>) => (
                      <pre
                        style={{
                          backgroundColor: 'var(--bg-surface-elevated)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '8px',
                          padding: '14px 16px',
                          overflowX: 'auto',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '13px',
                          lineHeight: '1.6',
                          margin: '12px 0',
                        }}
                        {...props}
                      >
                        {children}
                      </pre>
                    ),
                  },
                  blockquote: {
                    component: ({
                      children,
                      ...props
                    }: React.HTMLAttributes<HTMLQuoteElement>) => (
                      <blockquote
                        style={{
                          borderLeft: '3px solid var(--accent-primary)',
                          margin: '12px 0',
                          paddingLeft: '14px',
                          color: 'var(--text-secondary)',
                          fontStyle: 'italic',
                        }}
                        {...props}
                      >
                        {children}
                      </blockquote>
                    ),
                  },
                  h1: {
                    component: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
                      <h1 style={{ fontSize: '18px', fontWeight: 700, margin: '16px 0 8px', color: 'var(--text-primary)', lineHeight: '1.3' }} {...props}>{children}</h1>
                    ),
                  },
                  h2: {
                    component: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
                      <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '14px 0 6px', color: 'var(--text-primary)', lineHeight: '1.4' }} {...props}>{children}</h2>
                    ),
                  },
                  h3: {
                    component: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
                      <h3 style={{ fontSize: '13px', fontWeight: 600, margin: '12px 0 4px', color: 'var(--text-primary)' }} {...props}>{children}</h3>
                    ),
                  },
                  ul: {
                    component: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
                      <ul style={{ paddingLeft: '20px', margin: '8px 0', lineHeight: '1.7' }} {...props}>{children}</ul>
                    ),
                  },
                  ol: {
                    component: ({ children, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
                      <ol style={{ paddingLeft: '20px', margin: '8px 0', lineHeight: '1.7' }} {...props}>{children}</ol>
                    ),
                  },
                  li: {
                    component: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
                      <li style={{ marginBottom: '4px' }} {...props}>{children}</li>
                    ),
                  },
                  table: {
                    component: ({ children, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
                      <div style={{ overflowX: 'auto', margin: '12px 0' }}>
                        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '13px' }} {...props}>{children}</table>
                      </div>
                    ),
                  },
                  th: {
                    component: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
                      <th style={{ border: '1px solid var(--border-subtle)', padding: '6px 10px', backgroundColor: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', fontWeight: 600, textAlign: 'left' }} {...props}>{children}</th>
                    ),
                  },
                  td: {
                    component: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
                      <td style={{ border: '1px solid var(--border-subtle)', padding: '6px 10px', color: 'var(--text-secondary)' }} {...props}>{children}</td>
                    ),
                  },
                },
              }}
            >
              {message.content}
            </Markdown>
          ) : message.isStreaming ? (
            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '13px' }}>
              Synthesizing response from transcripts…
            </span>
          ) : null}

          {/* Streaming cursor */}
          {message.isStreaming && (
            <span
              aria-hidden="true"
              style={{
                display: 'inline-block',
                width: '2px',
                height: '16px',
                marginLeft: '3px',
                backgroundColor: 'var(--accent-growth)',
                animation: 'pulseGlow 0.9s ease infinite',
                verticalAlign: 'middle',
                borderRadius: '1px',
              }}
            />
          )}
        </div>

        {/* Linked Artifact Card (Phase 9) */}
        {message.artifact && (
          <div
            role="region"
            aria-label="Attached Artifact"
            style={{
              marginTop: '16px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '8px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              {message.artifact.artifact_type === 'html' ? (
                <FileCode size={20} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
              ) : (
                <FileText size={20} color="var(--accent-growth)" style={{ flexShrink: 0 }} />
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {message.artifact.title}
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '1px 5px',
                      borderRadius: '3px',
                      backgroundColor:
                        message.artifact.artifact_type === 'html'
                          ? 'rgba(59, 130, 246, 0.15)'
                          : 'rgba(16, 185, 129, 0.15)',
                      color:
                        message.artifact.artifact_type === 'html'
                          ? 'var(--accent-primary)'
                          : 'var(--accent-growth)',
                    }}
                  >
                    {message.artifact.artifact_type === 'html' ? 'HTML/CSS' : 'Markdown'}
                  </span>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Complete standalone document generated from conversation
                </p>
              </div>
            </div>

            <button
              onClick={() => onOpenArtifact?.(message.artifact!)}
              title="Open in Side-by-Side Artifact Viewer"
              aria-label={`Open artifact: ${message.artifact.title}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'var(--accent-primary)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'background-color 0.15s ease',
              }}
            >
              <Eye size={13} />
              <span>Open Artifact</span>
            </button>
          </div>
        )}

        {/* Verified Citations — rendered as pill badges */}
        {message.citations && message.citations.length > 0 && (
          <div
            style={{
              marginTop: '18px',
              paddingTop: '14px',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '10px',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: '10px',
                letterSpacing: '0.06em',
                fontWeight: 600,
              }}
            >
              <Sparkles size={11} color="var(--accent-growth)" />
              <span>Verified Transcript Sources ({message.citations.length})</span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {message.citations.map((c, idx) => (
                <button
                  key={c.chunk_id || idx}
                  id={`citation-${message.id}-${idx}`}
                  onClick={() => onOpenCitation(c, message.citations || [])}
                  title={`View verbatim quote from ${c.guest} at ${c.timestamp}`}
                  aria-label={`Citation ${idx + 1}: ${c.guest}, ${c.episode_title}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: 'rgba(6, 78, 59, 0.5)',
                    border: '1px solid #059669',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '12px',
                    color: '#6EE7B7',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(16, 185, 129, 0.15)';
                    (e.currentTarget as HTMLElement).style.borderColor = '#10B981';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(6, 78, 59, 0.5)';
                    (e.currentTarget as HTMLElement).style.borderColor = '#059669';
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: '#10B981',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontWeight: 600 }}>[{idx + 1}]</span>
                  <span style={{ fontWeight: 500 }}>{c.guest}</span>
                  <span style={{ color: '#34D399', fontSize: '11px' }}>{c.timestamp}</span>
                  {c.source_url && <ExternalLink size={11} />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Invisible: citation badges for inline reference in Markdown (future) */}
      {!isUser && (message.citations || []).map((c, idx) => (
        <CitationBadge
          key={`inline-${c.chunk_id}-${idx}`}
          index={idx}
          citation={c}
          onClick={() => onOpenCitation(c, message.citations || [])}
        />
      )).slice(0, 0)/* rendered on demand only; keep component for reference */}
    </article>
  );
};
