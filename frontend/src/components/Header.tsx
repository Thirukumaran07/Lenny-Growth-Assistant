import React from 'react';
import { Cpu, Layout, Server, Sparkles } from 'lucide-react';

interface HeaderProps {
  isViewerOpen: boolean;
  onToggleViewer: () => void;
  systemReady: boolean | null;
  activeProvider: string;
}

export const Header: React.FC<HeaderProps> = ({
  isViewerOpen,
  onToggleViewer,
  systemReady,
  activeProvider,
}) => {
  return (
    <header
      style={{
        height: '56px',
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        flexShrink: 0,
      }}
    >
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #10B981, #3B82F6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
          }}
        >
          <Sparkles size={18} />
        </div>
        <div>
          <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>
            The Lenny Growth Assistant
          </span>
          <span
            style={{
              marginLeft: '8px',
              fontSize: '11px',
              backgroundColor: 'var(--bg-surface-elevated)',
              color: 'var(--text-secondary)',
              padding: '2px 6px',
              borderRadius: '4px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            v1.0.0
          </span>
        </div>
      </div>

      {/* Center / Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Model Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            padding: '5px 10px',
            borderRadius: '6px',
            backgroundColor: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          <Cpu size={14} color="var(--accent-growth)" />
          <span>Model:</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
            {activeProvider === 'local_ollama' ? 'Ollama (llama3.2:3b)' : 'Cloud Provider'}
          </span>
        </div>

        {/* System Health Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            padding: '5px 10px',
            borderRadius: '6px',
            backgroundColor: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          <Server size={14} />
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor:
                systemReady === true
                  ? 'var(--accent-growth)'
                  : systemReady === false
                  ? 'var(--danger)'
                  : 'var(--warning)',
            }}
          />
          <span>
            {systemReady === true ? 'Ready' : systemReady === false ? 'Unhealthy' : 'Checking...'}
          </span>
        </div>

        {/* Artifact Viewer Toggle */}
        <button
          onClick={onToggleViewer}
          title="Toggle Side-by-Side Artifact Viewer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: isViewerOpen ? 'var(--accent-primary)' : 'var(--bg-surface-elevated)',
            color: isViewerOpen ? '#fff' : 'var(--text-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Layout size={14} />
          <span>{isViewerOpen ? 'Hide Viewer' : 'Artifact Viewer'}</span>
        </button>
      </div>
    </header>
  );
};
