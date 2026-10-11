import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Layout,
  Pencil,
  Upload,
  X,
} from 'lucide-react';
import { Artifact, Citation, Message } from '../types/chat';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatComposer } from './ChatComposer';
import { CitationDrawer } from './CitationDrawer';
import { ModelStatusBadge } from './ModelStatusBadge';

interface ChatViewProps {
  activeSessionId: string | null;
  sessionTitle?: string;
  messages: Message[];
  isStreaming: boolean;
  streamingMessage: Message | null;
  error: string | null;
  lastPrompt?: string;
  onSendMessage: (prompt: string) => void;
  onStopStreaming: () => void;
  onOpenArtifact?: (artifact: Artifact) => void;
  onClearError?: () => void;
  onRetry?: () => void;
  onRenameSession?: (newTitle: string) => void;
  isViewerOpen?: boolean;
  onToggleViewer?: () => void;
  onProviderChanged?: (newProvider: string) => void;
}

const STARTER_PROMPTS = [
  {
    title: 'Product-Market Fit Engine',
    prompt: 'How did Superhuman measure product-market fit according to Rahul Vohra?',
    badge: 'Rahul Vohra',
  },
  {
    title: 'Ship 30 for 30 Essay',
    prompt: 'Write a Ship 30 for 30 essay on Miro scaling product-led growth.',
    badge: 'Elena Verna',
  },
  {
    title: 'Retention Benchmarks',
    prompt: 'What retention benchmarks should a seed-stage B2B SaaS target?',
    badge: 'Gustaf Alströmer',
  },
  {
    title: 'B2B Growth Loops',
    prompt: 'How do product-led growth and sales-led growth loops combine effectively according to Elena Verna?',
    badge: 'Elena Verna',
  },
];

export const ChatView: React.FC<ChatViewProps> = ({
  activeSessionId,
  sessionTitle,
  messages,
  isStreaming,
  streamingMessage,
  error,
  onSendMessage,
  onStopStreaming,
  onOpenArtifact,
  onClearError,
  onRetry,
  onRenameSession,
  isViewerOpen,
  onToggleViewer,
  onProviderChanged,
}) => {
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [citationList, setCitationList] = useState<Citation[]>([]);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(sessionTitle || 'Modern Chair Selection');
  const [showShareToast, setShowShareToast] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitleValue(sessionTitle || 'Modern Chair Selection');
  }, [sessionTitle]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

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

  const handleCommitTitle = () => {
    const trimmed = titleValue.trim();
    if (trimmed && onRenameSession) {
      onRenameSession(trimmed);
    }
    setIsEditingTitle(false);
  };

  const handleShare = () => {
    setShowShareToast(true);
    navigator.clipboard?.writeText(window.location.href);
    setTimeout(() => setShowShareToast(false), 2000);
  };

  const showEmptyState = messages.length === 0 && !streamingMessage;

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
        backgroundColor: '#faf8f5',
        borderTopLeftRadius: '28px',
        borderBottomLeftRadius: '28px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '-6px 0 32px rgba(0, 0, 0, 0.18)',
      }}
    >
      {/* ─── Canvas Header: Editorial Serif Title & Controls ────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '24px 38px 14px 38px',
          flexShrink: 0,
        }}
      >
        {/* Left: Editorial Serif Title + Circular Pencil Icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleCommitTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCommitTitle();
                if (e.key === 'Escape') {
                  setTitleValue(sessionTitle || 'Growth Strategy Session');
                  setIsEditingTitle(false);
                }
              }}
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '32px',
                color: '#22201e',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: '2px solid #22201e',
                outline: 'none',
                padding: '0 4px',
              }}
            />
          ) : (
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '34px',
                fontWeight: 400,
                color: '#22201e',
                margin: 0,
                letterSpacing: '-0.02em',
                lineHeight: '1.15',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {sessionTitle || 'Growth Strategy Session'}
            </h1>
          )}

          <button
            onClick={() => setIsEditingTitle(true)}
            title="Rename session"
            aria-label="Rename session"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '1px solid #e5dfd4',
              backgroundColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#656059',
              cursor: 'pointer',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = '#22201e')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = '#e5dfd4')}
          >
            <Pencil size={13} />
          </button>
        </div>

        {/* Right Controls: Share Pill, Model Badge, Viewer Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {/* Share Pill Button */}
          <button
            onClick={handleShare}
            title="Share session"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#ffffff',
              border: '1px solid #e5dfd4',
              borderRadius: '20px',
              padding: '7px 16px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#34322f',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = '#22201e')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = '#e5dfd4')}
          >
            <Upload size={13} />
            <span>{showShareToast ? 'Link Copied!' : 'Share'}</span>
          </button>

          {/* Model Status & Switcher Badge */}
          <ModelStatusBadge onProviderChanged={onProviderChanged} />

          {/* Side-by-Side Artifact Viewer Toggle */}
          {onToggleViewer && (
            <button
              onClick={onToggleViewer}
              title="Toggle Side-by-Side Artifact Viewer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: isViewerOpen ? '#262423' : '#ffffff',
                color: isViewerOpen ? '#ffffff' : '#34322f',
                border: '1px solid #e5dfd4',
                borderRadius: '20px',
                padding: '7px 14px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Layout size={13} />
              <span>{isViewerOpen ? 'Hide' : 'Artifacts'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── Scrollable Message Canvas ──────────────────────────────────── */}
      <div
        role="region"
        aria-label="Chat conversation history"
        aria-live="polite"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '10px 42px 24px 42px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Error banner if present */}
        {error && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '14px',
              padding: '12px 18px',
              color: '#991b1b',
              marginBottom: '18px',
              fontSize: '13.5px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
            {onClearError && (
              <button
                onClick={onClearError}
                aria-label="Dismiss error"
                style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', padding: 0 }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {showEmptyState ? (
          /* ─── Editorial Welcome / Strategic Starter Prompts ─────────── */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              maxWidth: '820px',
              margin: 'auto',
              padding: '24px 0',
            }}
          >
            {/* Header Badge */}
            <div style={{ marginBottom: '14px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#f1ede6',
                  color: '#6e6962',
                  border: '1px solid #e2ddd4',
                  borderRadius: '16px',
                  padding: '4px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                }}
              >
                Lenny's Growth Knowledge Base
              </span>
            </div>

            {/* Editorial Serif Greeting */}
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '36px',
                fontWeight: 400,
                color: '#22201e',
                lineHeight: '1.25',
                margin: '0 0 12px 0',
                letterSpacing: '-0.02em',
              }}
            >
              What growth challenge are you working on?
            </h2>

            <p
              style={{
                fontSize: '15.5px',
                color: '#68645e',
                lineHeight: '1.65',
                margin: '0 0 32px 0',
                maxWidth: '640px',
              }}
            >
              Ask strategic questions on product-market fit, growth loops, and retention benchmarks grounded in 200+ podcast transcripts with verified citations.
            </p>

            {/* Clean Grid of Starter Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '14px',
              }}
            >
              {STARTER_PROMPTS.map((item, i) => (
                <button
                  key={i}
                  onClick={() => onSendMessage(item.prompt)}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e7e2d7',
                    borderRadius: '18px',
                    padding: '18px 20px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
                    transition: 'all 0.18s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#22201e';
                    (e.currentTarget as HTMLElement).style.boxShadow =
                      '0 6px 20px rgba(0, 0, 0, 0.05)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#e7e2d7';
                    (e.currentTarget as HTMLElement).style.boxShadow =
                      '0 2px 8px rgba(0, 0, 0, 0.02)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '14.5px',
                        fontWeight: 600,
                        color: '#22201e',
                      }}
                    >
                      {item.title}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        color: '#b45309',
                        backgroundColor: '#fef3c7',
                        padding: '2px 8px',
                        borderRadius: '10px',
                      }}
                    >
                      {item.badge}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: '13px',
                      color: '#716d66',
                      lineHeight: '1.5',
                      margin: 0,
                    }}
                  >
                    {item.prompt}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* ─── Active Message Turns ──────────────────────────────────── */
          <div>
            {messages.map((m) => (
              <ChatMessageItem
                key={m.id}
                message={m}
                onOpenCitation={handleOpenCitation}
                onOpenArtifact={onOpenArtifact}
                onRetry={onRetry}
              />
            ))}

            {streamingMessage && (
              <ChatMessageItem
                message={streamingMessage}
                onOpenCitation={handleOpenCitation}
                onOpenArtifact={onOpenArtifact}
              />
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ─── Bottom Floating Composer ───────────────────────────────────── */}
      <div
        style={{
          padding: '0 38px 24px 38px',
          flexShrink: 0,
        }}
      >
        <ChatComposer
          onSendMessage={onSendMessage}
          onStopStreaming={onStopStreaming}
          isStreaming={isStreaming}
          activeSessionId={activeSessionId}
        />
      </div>

      {/* ─── Citation Detail Drawer Modal ───────────────────────────────── */}
      {activeCitation && (
        <CitationDrawer
          citation={activeCitation}
          allCitations={citationList}
          onClose={handleCloseCitation}
          onSelectCitation={(c) => setActiveCitation(c)}
        />
      )}
    </main>
  );
};
