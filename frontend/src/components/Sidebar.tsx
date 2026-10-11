import React, { useEffect, useRef, useState } from 'react';
import {
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import logoImg from './image.png';

export interface SessionItem {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

interface SidebarProps {
  dbConnected: boolean;
  sessions: SessionItem[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession?: (id: string, newTitle: string) => void;
}

function groupSessions(sessions: SessionItem[]): {
  label: string;
  items: SessionItem[];
}[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOf7DaysAgo = new Date(startOfToday.getTime() - 6 * 24 * 60 * 60 * 1000);

  const today: SessionItem[] = [];
  const last7: SessionItem[] = [];
  const older: SessionItem[] = [];

  for (const s of sessions) {
    const d = new Date(s.updated_at);
    if (d >= startOfToday) today.push(s);
    else if (d >= startOf7DaysAgo) last7.push(s);
    else older.push(s);
  }

  const groups: { label: string; items: SessionItem[] }[] = [];
  if (today.length) groups.push({ label: 'Today', items: today });
  if (last7.length) groups.push({ label: 'Previous 7 Days', items: last7 });
  if (older.length) groups.push({ label: 'Older', items: older });
  return groups;
}

interface SessionRowProps {
  session: SessionItem;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename?: (newTitle: string) => void;
}

const SessionRow: React.FC<SessionRowProps> = ({
  session,
  isActive,
  onSelect,
  onDelete,
  onRename,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(session.title);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const commitRename = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== session.title && onRename) {
      onRename(trimmed);
    } else {
      setEditValue(session.title);
    }
    setIsEditing(false);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-current={isActive ? 'true' : undefined}
      aria-label={`Session: ${session.title}`}
      onClick={() => !isEditing && onSelect()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !isEditing) onSelect();
      }}
      onDoubleClick={() => onRename && setIsEditing(true)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '9px 12px',
        borderRadius: '12px',
        backgroundColor: isActive ? '#383735' : 'transparent',
        color: isActive ? '#ffffff' : '#9c9892',
        fontSize: '13.5px',
        cursor: 'pointer',
        marginBottom: '2px',
        transition: 'all 0.15s ease',
        position: 'relative',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.backgroundColor = '#2d2c2a';
          (e.currentTarget as HTMLElement).style.color = '#f5f4f0';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
          (e.currentTarget as HTMLElement).style.color = '#9c9892';
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1, minWidth: 0 }}>
        {isEditing ? (
          <input
            ref={inputRef}
            id={`session-rename-${session.id}`}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') {
                setEditValue(session.title);
                setIsEditing(false);
              }
              e.stopPropagation();
            }}
            onClick={(e) => e.stopPropagation()}
            aria-label="Rename session"
            style={{
              backgroundColor: '#1e1e1e',
              border: '1px solid #5a5752',
              borderRadius: '6px',
              color: '#ffffff',
              fontSize: '13px',
              padding: '2px 8px',
              width: '100%',
              outline: 'none',
            }}
          />
        ) : (
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontWeight: isActive ? 500 : 400,
            }}
          >
            {session.title}
          </span>
        )}
      </div>

      {/* Action buttons (hover reveal) */}
      {!isEditing && (
        <div
          className="session-actions"
          onClick={(e) => e.stopPropagation()}
          style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}
        >
          {onRename && (
            <button
              onClick={() => setIsEditing(true)}
              aria-label={`Rename session "${session.title}"`}
              title="Rename"
              style={{
                background: 'none',
                border: 'none',
                color: '#9c9892',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#ffffff')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#9c9892')}
            >
              <Pencil size={12} />
            </button>
          )}

          <button
            onClick={() => setShowDeleteConfirm(true)}
            aria-label={`Delete session "${session.title}"`}
            title="Delete session"
            style={{
              background: 'none',
              border: 'none',
              color: '#9c9892',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#ef4444')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#9c9892')}
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div
          role="alertdialog"
          aria-label="Confirm session deletion"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            backgroundColor: '#1b1a19',
            border: '1px solid #3c3a37',
            borderRadius: '8px',
            padding: '6px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 30,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          <span style={{ fontSize: '11px', color: '#f5f4f0' }}>Delete?</span>
          <button
            onClick={() => {
              onDelete();
              setShowDeleteConfirm(false);
            }}
            style={{
              backgroundColor: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              padding: '2px 8px',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Confirm
          </button>
          <button
            onClick={() => setShowDeleteConfirm(false)}
            style={{
              backgroundColor: 'transparent',
              color: '#9c9892',
              border: '1px solid #3c3a37',
              borderRadius: '4px',
              padding: '2px 8px',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  dbConnected,
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onRenameSession,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: Cmd+K / Ctrl+K focuses search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filtered = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const groups = groupSessions(filtered);

  return (
    <aside
      aria-label="Sidebar navigation"
      style={{
        width: '260px',
        height: '100%',
        backgroundColor: '#222120',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'relative',
        zIndex: 10,
        color: '#f5f4f0',
      }}
    >
      {/* ─── Top Brand Header ────────────────────────────────────────────── */}
      <div
        style={{
          padding: '20px 18px 14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src={logoImg}
            alt="Lenny AI Logo"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              objectFit: 'contain',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '21px',
              fontWeight: 500,
              letterSpacing: '-0.02em',
              color: '#ffffff',
            }}
          >
            Lenny AI
          </span>
        </div>
      </div>

      {/* ─── + New Chat Button ───────────────────────────────────────────── */}
      <div style={{ padding: '0 16px 10px 16px' }}>
        <button
          onClick={onCreateSession}
          aria-label="Start a new chat session"
          title="Cmd/Ctrl+N"
          style={{
            width: '100%',
            backgroundColor: '#323130',
            color: '#f5f4f0',
            border: 'none',
            borderRadius: '12px',
            padding: '10px 14px',
            fontSize: '13.5px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = '#3c3b3a';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = '#323130';
          }}
        >
          <Plus size={16} />
          <span>New Chat</span>
        </button>
      </div>

      {/* ─── Search input ────────────────────────────────────────────────── */}
      <div style={{ padding: '0 16px 12px 16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#1b1a19',
            borderRadius: '10px',
            padding: '7px 10px',
            border: '1px solid #2e2d2b',
          }}
        >
          <Search size={13} color="#7c7974" />
          <input
            ref={searchRef}
            id="session-search"
            type="text"
            placeholder="Search sessions… (⌘K)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Filter sessions"
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#f5f4f0',
              fontSize: '12px',
              width: '100%',
              outline: 'none',
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              aria-label="Clear search"
              style={{ background: 'none', border: 'none', color: '#7c7974', cursor: 'pointer', padding: 0 }}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ─── Recent Chats Header & List ──────────────────────────────────── */}
      <div
        style={{
          padding: '8px 18px 6px 18px',
          fontSize: '12px',
          color: '#7c7974',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        Recent Chats
      </div>

      <div
        role="list"
        aria-label="Conversation sessions"
        className="sidebar-scroll"
        style={{ flex: 1, overflowY: 'auto', padding: '0 10px' }}
      >
        {groups.length === 0 ? (
          <div style={{ padding: '24px 8px', fontSize: '12.5px', color: '#7c7974', textAlign: 'center' }}>
            {searchTerm ? 'No matching sessions' : 'No sessions yet'}
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label} role="group" aria-label={group.label} style={{ marginBottom: '6px' }}>
              <div
                style={{
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: '#65625e',
                  padding: '6px 8px 2px 8px',
                  fontWeight: 600,
                }}
              >
                {group.label}
              </div>

              {group.items.map((s) => (
                <div key={s.id} role="listitem">
                  <SessionRow
                    session={s}
                    isActive={s.id === activeSessionId}
                    onSelect={() => onSelectSession(s.id)}
                    onDelete={() => onDeleteSession(s.id)}
                    onRename={onRenameSession ? (t) => onRenameSession(s.id, t) : undefined}
                  />
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* ─── Database & System Status Footer ───────────────────────────── */}
      <div
        style={{
          padding: '12px 18px',
          borderTop: '1px solid #292826',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#201f1f',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: dbConnected ? '#10b981' : '#f59e0b',
              boxShadow: dbConnected
                ? '0 0 8px rgba(16, 185, 129, 0.4)'
                : '0 0 8px rgba(245, 158, 11, 0.4)',
            }}
          />
          <span style={{ fontSize: '12px', fontWeight: 500, color: '#d4cfc7' }}>
            {dbConnected ? 'Connected' : 'Connecting…'}
          </span>
        </div>
        <span
          style={{
            fontSize: '11px',
            color: '#7c7974',
            fontFamily: 'var(--font-mono)',
          }}
        >
          PostgreSQL
        </span>
      </div>
    </aside>
  );
};
