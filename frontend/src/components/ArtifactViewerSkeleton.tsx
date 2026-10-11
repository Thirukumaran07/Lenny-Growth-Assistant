import React from 'react';
import { Code2, Copy, Download, Eye, ShieldCheck, X } from 'lucide-react';

interface ArtifactViewerSkeletonProps {
  onClose: () => void;
}

export const ArtifactViewerSkeleton: React.FC<ArtifactViewerSkeletonProps> = ({ onClose }) => {
  return (
    <div
      style={{
        width: '520px',
        backgroundColor: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        flexShrink: 0,
      }}
    >
      {/* Viewer Header */}
      <div
        style={{
          height: '48px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={16} color="var(--accent-growth)" />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Artifact Viewer
          </span>
          <span
            style={{
              fontSize: '11px',
              backgroundColor: 'var(--bg-surface-elevated)',
              color: 'var(--accent-growth)',
              padding: '2px 6px',
              borderRadius: '4px',
            }}
          >
            Sandboxed
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            title="Preview Mode"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              fontSize: '11px',
              backgroundColor: 'var(--accent-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            <Eye size={12} />
            <span>Preview</span>
          </button>

          <button
            title="Code Mode"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              fontSize: '11px',
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            <Code2 size={12} />
            <span>Code</span>
          </button>

          <button
            onClick={onClose}
            title="Close Viewer"
            style={{
              padding: '4px',
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginLeft: '4px',
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Viewer Content Body */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px',
          textAlign: 'center',
          color: 'var(--text-secondary)',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-surface-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            color: 'var(--text-muted)',
          }}
        >
          <Code2 size={24} />
        </div>
        <h3 style={{ fontSize: '15px', color: 'var(--text-primary)', marginBottom: '6px' }}>
          No Active Artifact
        </h3>
        <p style={{ fontSize: '13px', lineHeight: '1.5', maxWidth: '300px' }}>
          When the assistant generates a Ship 30 for 30 essay, framework, or HTML card, it will render here in a safe, sandboxed viewer.
        </p>
      </div>

      {/* Viewer Footer */}
      <div
        style={{
          padding: '10px 16px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11px',
          color: 'var(--text-muted)',
        }}
      >
        <span>CSP: Strict Sandbox Active</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            disabled
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              backgroundColor: 'transparent',
              border: '1px solid var(--border-subtle)',
              borderRadius: '4px',
              color: 'var(--text-muted)',
              cursor: 'not-allowed',
            }}
          >
            <Copy size={12} />
            <span>Copy</span>
          </button>
          <button
            disabled
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              backgroundColor: 'transparent',
              border: '1px solid var(--border-subtle)',
              borderRadius: '4px',
              color: 'var(--text-muted)',
              cursor: 'not-allowed',
            }}
          >
            <Download size={12} />
            <span>Download</span>
          </button>
        </div>
      </div>
    </div>
  );
};
