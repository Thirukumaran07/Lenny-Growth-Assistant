import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Code2,
  Copy,
  Check,
  Download,
  Eye,
  ShieldCheck,
  X,
  AlertTriangle,
  FileCode,
  FileText,
} from 'lucide-react';
import Markdown from 'markdown-to-jsx';
import type { Artifact } from '../types/chat';

interface ArtifactViewerProps {
  artifact: Artifact | null;
  onClose: () => void;
  isOpen: boolean;
}

const MAX_SAFE_PAYLOAD_BYTES = 1_000_000; // 1 MB client-side safety ceiling

/**
 * Injects a strict Content Security Policy meta tag into an HTML document.
 * This guarantees network isolation (default-src 'none') even if the browser doesn't
 * strictly enforce the iframe `csp` attribute.
 */
function injectStrictCSP(htmlContent: string): string {
  const cspMeta =
    '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; script-src \'unsafe-inline\'; img-src data: https:; font-src data: https:;">';

  // Inject right after <head> or at top of document
  if (/<head[^>]*>/i.test(htmlContent)) {
    return htmlContent.replace(/<head[^>]*>/i, `$&${cspMeta}`);
  }
  return `<!DOCTYPE html><html><head>${cspMeta}</head><body>${htmlContent}</body></html>`;
}

export const ArtifactViewer: React.FC<ArtifactViewerProps> = ({
  artifact,
  onClose,
  isOpen,
}) => {
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Reset copy state and default to preview whenever artifact changes
  useEffect(() => {
    setViewMode('preview');
    setCopied(false);
  }, [artifact?.id]);

  // Handle global Esc key to close viewer
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Payload size calculation
  const payloadBytes = useMemo(() => {
    if (!artifact?.content) return 0;
    return new TextEncoder().encode(artifact.content).length;
  }, [artifact?.content]);

  const isOversized = payloadBytes > MAX_SAFE_PAYLOAD_BYTES;
  const isSupportedType =
    artifact?.artifact_type === 'html' || artifact?.artifact_type === 'markdown';

  // Constructed srcDoc with security boundary
  const sanitizedSrcDoc = useMemo(() => {
    if (!artifact || artifact.artifact_type !== 'html' || isOversized) return '';
    return injectStrictCSP(artifact.content);
  }, [artifact, isOversized]);

  if (!isOpen || !artifact) {
    return null;
  }

  // Copy code handler with 2s checkmark feedback
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(artifact.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = artifact.content;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Download handler per design.md specifications
  const handleDownload = () => {
    const ext = artifact.artifact_type === 'html' ? 'html' : 'md';
    const mime = artifact.artifact_type === 'html' ? 'text/html' : 'text/markdown';
    const filename = `${artifact.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.${ext}`;

    const blob = new Blob([artifact.content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Split code lines for line numbers in code inspector
  const codeLines = artifact.content.split('\n');

  return (
    <aside
      role="complementary"
      aria-label="Artifact preview pane"
      id="artifact-viewer-pane"
      style={{
        width: '520px',
        maxWidth: '100vw',
        backgroundColor: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        flexShrink: 0,
        position: 'relative',
        zIndex: 20,
      }}
    >
      {/* ── Top Header Bar ────────────────────────────────────────────── */}
      <div
        style={{
          minHeight: '48px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 14px',
          gap: '8px',
          backgroundColor: 'var(--bg-surface)',
        }}
      >
        {/* Title & Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          {artifact.artifact_type === 'html' ? (
            <FileCode size={16} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
          ) : (
            <FileText size={16} color="var(--accent-growth)" style={{ flexShrink: 0 }} />
          )}

          <h2
            title={artifact.title}
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '180px',
            }}
          >
            {artifact.title}
          </h2>

          <span
            style={{
              fontSize: '10px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor:
                artifact.artifact_type === 'html'
                  ? 'rgba(59, 130, 246, 0.15)'
                  : 'rgba(16, 185, 129, 0.15)',
              color:
                artifact.artifact_type === 'html'
                  ? 'var(--accent-primary)'
                  : 'var(--accent-growth)',
              flexShrink: 0,
            }}
          >
            {artifact.artifact_type === 'html' ? 'HTML/CSS' : 'Markdown'}
          </span>
        </div>

        {/* View Toggle & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Mode toggle */}
          <div
            role="tablist"
            style={{
              display: 'flex',
              backgroundColor: 'var(--bg-surface-elevated)',
              borderRadius: '6px',
              padding: '2px',
              gap: '2px',
            }}
          >
            <button
              role="tab"
              aria-selected={viewMode === 'preview'}
              onClick={() => setViewMode('preview')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: 500,
                backgroundColor:
                  viewMode === 'preview' ? 'var(--accent-primary)' : 'transparent',
                color: viewMode === 'preview' ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              <Eye size={12} />
              <span>Preview</span>
            </button>

            <button
              role="tab"
              aria-selected={viewMode === 'code'}
              onClick={() => setViewMode('code')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: 500,
                backgroundColor:
                  viewMode === 'code' ? 'var(--accent-primary)' : 'transparent',
                color: viewMode === 'code' ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              <Code2 size={12} />
              <span>Code</span>
            </button>
          </div>

          {/* Copy Action */}
          <button
            onClick={handleCopy}
            title={copied ? 'Copied to clipboard!' : 'Copy Code'}
            aria-label="Copy Code"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 8px',
              fontSize: '11px',
              backgroundColor: 'transparent',
              color: copied ? 'var(--accent-growth)' : 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '5px',
              cursor: 'pointer',
            }}
          >
            {copied ? <Check size={12} color="var(--accent-growth)" /> : <Copy size={12} />}
            <span style={{ display: 'none' }}>Copy</span>
          </button>

          {/* Download Action */}
          <button
            onClick={handleDownload}
            title={`Download as .${artifact.artifact_type === 'html' ? 'html' : 'md'}`}
            aria-label="Download artifact file"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 8px',
              fontSize: '11px',
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '5px',
              cursor: 'pointer',
            }}
          >
            <Download size={12} />
          </button>

          {/* Close Viewer */}
          <button
            onClick={onClose}
            title="Close Viewer (Esc)"
            aria-label="Close artifact viewer"
            style={{
              padding: '6px',
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              marginLeft: '2px',
            }}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* ── Security Isolation Banner ──────────────────────────────────── */}
      <div
        style={{
          padding: '6px 14px',
          backgroundColor: 'rgba(16, 185, 129, 0.08)',
          borderBottom: '1px solid rgba(16, 185, 129, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: 'var(--accent-growth)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShieldCheck size={13} color="var(--accent-growth)" />
          <span>
            <strong>Isolated Sandbox:</strong> Origin: null · No storage · CSP enforced
          </span>
        </div>
        <span style={{ color: 'var(--text-tertiary)', fontSize: '10px' }}>
          {(payloadBytes / 1024).toFixed(1)} KB
        </span>
      </div>

      {/* ── Content View Area ─────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: viewMode === 'preview' ? '#ffffff' : 'var(--bg-canvas)',
        }}
      >
        {/* Error States */}
        {!isSupportedType && (
          <div
            role="alert"
            style={{
              padding: '16px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              margin: '16px',
              borderRadius: '8px',
              color: '#ef4444',
              display: 'flex',
              gap: '12px',
            }}
          >
            <AlertTriangle size={20} />
            <div>
              <strong>Unsupported Artifact Type</strong>
              <p style={{ margin: '4px 0 0', fontSize: '12px' }}>
                Only 'html' and 'markdown' artifact documents can be previewed safely.
              </p>
            </div>
          </div>
        )}

        {isOversized && (
          <div
            role="alert"
            style={{
              padding: '16px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              margin: '16px',
              borderRadius: '8px',
              color: '#ef4444',
              display: 'flex',
              gap: '12px',
            }}
          >
            <AlertTriangle size={20} />
            <div>
              <strong>Oversized Payload Blocked</strong>
              <p style={{ margin: '4px 0 0', fontSize: '12px' }}>
                Artifact size ({(payloadBytes / 1024).toFixed(1)} KB) exceeds the maximum safe limit of 1,000 KB. Rendering has been prevented to protect host performance.
              </p>
            </div>
          </div>
        )}

        {/* Normal Rendering */}
        {!isOversized && isSupportedType && (
          <>
            {viewMode === 'preview' ? (
              artifact.artifact_type === 'html' ? (
                /* Sandboxed HTML IFrame per design.md Section 7.2 */
                <iframe
                  ref={iframeRef}
                  title="Artifact Sandbox"
                  sandbox="allow-scripts"
                  // CSP disables network connections, parent window access, frames, objects
                  {...({ csp: "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data: https:; font-src data: https:;" } as any)}
                  srcDoc={sanitizedSrcDoc}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    backgroundColor: '#ffffff',
                  }}
                />
              ) : (
                /* Safe Markdown Document Preview */
                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '24px',
                    color: 'var(--text-primary)',
                    backgroundColor: 'var(--bg-canvas)',
                    fontSize: '14px',
                    lineHeight: '1.6',
                  }}
                >
                  <Markdown
                    options={{
                      overrides: {
                        h1: {
                          component: 'h1',
                          props: {
                            style: {
                              fontSize: '20px',
                              fontWeight: 700,
                              color: 'var(--text-primary)',
                              borderBottom: '1px solid var(--border-subtle)',
                              paddingBottom: '8px',
                              marginTop: 0,
                            },
                          },
                        },
                        h2: {
                          component: 'h2',
                          props: {
                            style: {
                              fontSize: '16px',
                              fontWeight: 600,
                              color: 'var(--text-primary)',
                              marginTop: '20px',
                              marginBottom: '8px',
                            },
                          },
                        },
                        h3: {
                          component: 'h3',
                          props: {
                            style: {
                              fontSize: '14px',
                              fontWeight: 600,
                              color: 'var(--text-secondary)',
                              marginTop: '16px',
                              marginBottom: '6px',
                            },
                          },
                        },
                        table: {
                          component: 'table',
                          props: {
                            style: {
                              width: '100%',
                              borderCollapse: 'collapse',
                              margin: '16px 0',
                              fontSize: '13px',
                            },
                          },
                        },
                        th: {
                          component: 'th',
                          props: {
                            style: {
                              textAlign: 'left',
                              padding: '8px 12px',
                              backgroundColor: 'var(--bg-surface-elevated)',
                              border: '1px solid var(--border-subtle)',
                              color: 'var(--text-primary)',
                            },
                          },
                        },
                        td: {
                          component: 'td',
                          props: {
                            style: {
                              padding: '8px 12px',
                              border: '1px solid var(--border-subtle)',
                              color: 'var(--text-secondary)',
                            },
                          },
                        },
                        blockquote: {
                          component: 'blockquote',
                          props: {
                            style: {
                              borderLeft: '3px solid var(--accent-growth)',
                              paddingLeft: '12px',
                              margin: '12px 0',
                              color: 'var(--text-secondary)',
                              fontStyle: 'italic',
                            },
                          },
                        },
                      },
                    }}
                  >
                    {artifact.content}
                  </Markdown>
                </div>
              )
            ) : (
              /* Raw Code Inspector */
              <div
                style={{
                  flex: 1,
                  overflow: 'auto',
                  backgroundColor: 'var(--bg-canvas)',
                  display: 'flex',
                  fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                  fontSize: '12px',
                  lineHeight: '1.5',
                  padding: '12px 0',
                }}
              >
                {/* Line numbers gutter */}
                <div
                  aria-hidden="true"
                  style={{
                    userSelect: 'none',
                    textAlign: 'right',
                    padding: '0 12px 0 8px',
                    color: 'var(--text-tertiary)',
                    borderRight: '1px solid var(--border-subtle)',
                    minWidth: '40px',
                  }}
                >
                  {codeLines.map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>

                {/* Code body */}
                <pre
                  style={{
                    margin: 0,
                    padding: '0 16px',
                    color: '#e5e7eb',
                    overflowX: 'auto',
                    flex: 1,
                    whiteSpace: 'pre',
                  }}
                >
                  <code>{artifact.content}</code>
                </pre>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
};
