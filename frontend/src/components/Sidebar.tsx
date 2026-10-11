import React from 'react';
import { Database, MessageSquare, Plus, Search } from 'lucide-react';

interface SidebarProps {
  dbConnected: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ dbConnected }) => {
  return (
    <aside
      style={{
        width: '260px',
        backgroundColor: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        flexShrink: 0,
      }}
    >
      {/* Top CTA */}
      <div style={{ padding: '16px' }}>
        <button
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            backgroundColor: 'var(--accent-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 12px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <Plus size={16} />
          <span>New Session</span>
        </button>

        {/* Search */}
        <div
          style={{
            marginTop: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--bg-input)',
            borderRadius: '6px',
            padding: '6px 10px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <Search size={14} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search sessions..."
            disabled
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '12px',
              width: '100%',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Sessions list skeleton */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px' }}>
        <div
          style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-muted)',
            padding: '8px 4px',
          }}
        >
          Recent Sessions
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 10px',
            borderRadius: '6px',
            backgroundColor: 'var(--bg-surface-elevated)',
            borderLeft: '3px solid var(--accent-primary)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          <MessageSquare size={14} color="var(--accent-primary)" />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Getting Started
          </span>
        </div>
      </div>

      {/* Footer Status */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-base)',
          fontSize: '11px',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Database size={12} />
          <span>PostgreSQL:</span>
        </div>
        <span style={{ color: dbConnected ? 'var(--accent-growth)' : 'var(--warning)', fontWeight: 500 }}>
          {dbConnected ? 'Connected' : 'Connecting...'}
        </span>
      </div>
    </aside>
  );
};
