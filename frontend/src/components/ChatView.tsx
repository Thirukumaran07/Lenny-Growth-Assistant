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
import { ShowcaseCards } from './ShowcaseCards';
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
    title: 'Designer Chairs Showcase',
    prompt: 'Find 5 modern designer chairs with clean geometric shapes.',
    badge: 'Design Selection',
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
                  setTitleValue(sessionTitle || 'Modern Chair Selection');
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
              {sessionTitle || 'Modern Chair Selection'}
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
          /* ─── Welcome / Empty State Showcase (Matching Screenshot) ────── */
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            {/* Sample User Turn Pill */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginBottom: '18px',
              }}
            >
              <div
                style={{
                  maxWidth: '78%',
                  backgroundColor: '#f1ede6',
                  color: '#2b2927',
                  padding: '12px 22px',
                  borderRadius: '22px',
                  fontSize: '15px',
                  lineHeight: '1.55',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
                  border: '1px solid #e7e2d7',
                }}
              >
                Find 5 modern designer chairs with clean geometric shapes.
              </div>
            </div>

            {/* Sample Assistant Intro Paragraph */}
            <p
              style={{
                fontSize: '15.5px',
                color: '#2d2b28',
                lineHeight: '1.7',
                marginBottom: '8px',
              }}
            >
              If you're looking for chairs with clean geometry, sculptural silhouettes, and a contemporary
              designer aesthetic, I'd focus on pieces that use simple forms in a visually striking way
              rather than ornate details.
            </p>

            {/* ─── 4 Showcase Cards Carousel (Exact Screenshot Match) ──── */}
            <ShowcaseCards />

            {/* Summary Bullet Points with Bold Leads */}
            <div style={{ fontSize: '15px', color: '#2d2b28', lineHeight: '1.75', marginTop: '6px' }}>
              <p style={{ marginBottom: '8px' }}>
                Each of these chairs represents a different interpretation of modern geometric design:
              </p>
              <ul style={{ paddingLeft: '22px', margin: '0 0 16px 0' }}>
                <li style={{ marginBottom: '6px' }}>
                  <strong>GENESÖN</strong> — soft curves, sculptural look, great as an accent piece.
                </li>
                <li style={{ marginBottom: '6px' }}>
                  <strong>Arper Catifa 46</strong> — lightweight, ergonomic, the most versatile option.
                </li>
                <li style={{ marginBottom: '6px' }}>
                  <strong>Panton Chair</strong> — iconic, bold, perfect for a statement corner.
                </li>
                <li style={{ marginBottom: '6px' }}>
                  <strong>Infiniti Canova Wood</strong> — warm materials, minimal Scandinavian feel.
                </li>
              </ul>
            </div>

            {/* Quick Prompts Pills for One-Click Search */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px solid #ede7dc',
              }}
            >
              {STARTER_PROMPTS.map((item, i) => (
                <button
                  key={i}
                  onClick={() => onSendMessage(item.prompt)}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e3ddd2',
                    borderRadius: '18px',
                    padding: '6px 14px',
                    fontSize: '12.5px',
                    color: '#3d3935',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#22201e';
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#f8f5ee';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#e3ddd2';
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#ffffff';
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{item.title}</span>
                  <span style={{ color: '#8e8a84', fontSize: '11px' }}>({item.badge})</span>
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
