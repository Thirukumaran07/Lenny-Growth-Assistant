import React, { useEffect } from 'react';
import { ExternalLink, X, BookOpen, Clock, User, CheckCircle2 } from 'lucide-react';
import { Citation } from '../types/chat';

interface CitationDrawerProps {
  citation: Citation | null;
  allCitations?: Citation[];
  onSelectCitation?: (citation: Citation) => void;
  onClose: () => void;
}

export const CitationDrawer: React.FC<CitationDrawerProps> = ({
  citation,
  allCitations = [],
  onSelectCitation,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!citation) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Transcript Citation Details"
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '440px',
        maxWidth: '90vw',
        backgroundColor: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border-subtle)',
        boxShadow: '-8px 0 24px rgba(0, 0, 0, 0.5)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideIn 0.2s ease-out',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface-elevated)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen size={18} color="var(--accent-growth)" />
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Source Provenance
          </h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Close citation drawer"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Tabs if multiple citations */}
      {allCitations.length > 1 && (
        <div
          style={{
            display: 'flex',
            gap: '6px',
            padding: '10px 16px',
            overflowX: 'auto',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-base)',
          }}
        >
          {allCitations.map((c, idx) => {
            const isSelected = c.chunk_id === citation.chunk_id;
            return (
              <button
                key={c.chunk_id || idx}
                onClick={() => onSelectCitation && onSelectCitation(c)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '16px',
                  border: isSelected ? '1px solid var(--accent-growth)' : '1px solid var(--border-subtle)',
                  backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-surface)',
                  color: isSelected ? 'var(--accent-growth)' : 'var(--text-secondary)',
                  fontSize: '11px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Source [{idx + 1}] {c.guest}
              </button>
            );
          })}
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {/* Episode Title */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Episode Title
          </div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
            {citation.episode_title}
          </div>
        </div>

        {/* Guest & Speaker & Timestamp badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              backgroundColor: 'var(--bg-surface-elevated)',
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
              fontSize: '12px',
              color: 'var(--text-secondary)',
            }}
          >
            <User size={13} color="var(--accent-primary)" />
            <span>Guest: <strong style={{ color: 'var(--text-primary)' }}>{citation.guest}</strong></span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              backgroundColor: 'var(--bg-surface-elevated)',
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
              fontSize: '12px',
              color: 'var(--text-secondary)',
            }}
          >
            <Clock size={13} color="var(--warning)" />
            <span>Mark: <strong style={{ color: 'var(--text-primary)' }}>{citation.timestamp}</strong></span>
          </div>

          {citation.similarity !== undefined && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                fontSize: '12px',
                color: 'var(--accent-growth)',
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={13} />
              <span>Cosine Match: {(citation.similarity * 100).toFixed(1)}%</span>
            </div>
          )}
        </div>

        {/* Verbatim Excerpt */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
            Verbatim Transcript Excerpt
          </div>
          <blockquote
            style={{
              backgroundColor: 'var(--bg-base)',
              borderLeft: '3px solid var(--accent-growth)',
              borderRadius: '0 8px 8px 0',
              padding: '14px 16px',
              fontSize: '13px',
              lineHeight: 1.6,
              color: 'var(--text-primary)',
              fontStyle: 'normal',
              whiteSpace: 'pre-wrap',
            }}
          >
            "{citation.quote}"
          </blockquote>
        </div>

        {/* Speaker Info */}
        {citation.speaker && (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '24px' }}>
            Speaker attribution: <span style={{ color: 'var(--text-secondary)' }}>{citation.speaker}</span>
          </div>
        )}

        {/* Source Link */}
        {citation.source_url && (
          <a
            href={citation.source_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '10px 14px',
              backgroundColor: 'var(--accent-primary)',
              color: '#fff',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 500,
              transition: 'background 0.15s ease',
            }}
          >
            <span>Open Verified Source Episode</span>
            <ExternalLink size={14} />
          </a>
        )}
      </div>
    </div>
  );
};
