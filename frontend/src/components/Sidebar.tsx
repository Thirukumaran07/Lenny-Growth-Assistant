import React, { useEffect, useRef, useState } from 'react';
import {
  Database,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  Check,
} from 'lucide-react';

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
        padding: '8px 10px',
        borderRadius: '6px',
        backgroundColor: isActive ? 'var(--bg-surface-elevated)' : 'transparent',
        borderLeft: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent',
        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontSize: '13px',
        cursor: 'pointer',
        marginBottom: '2px',
        transition: 'background 0.15s ease',
        position: 'relative',
        gap: '4px',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => {
        if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(31,41,55,0.6)';
      }}
      onMouseLeave={(e) => {
        if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
      }}
    >
      {/* Session icon + title / rename input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1, minWidth: 0 }}>
        <MessageSquare
          size={13}
          color={isActive ? 'var(--accent-primary)' : 'var(--text-muted)'}
          style={{ flexShrink: 0 }}
        />
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
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-focus)',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              fontSize: '12px',
              padding: '2px 6px',
              width: '100%',
              outline: 'none',
            }}
          />
        ) : (
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {session.title}
          </span>
        )}
      </div>

      {/* Action buttons — shown on hover/active */}
      {!isEditing && (
        <div
          className="session-actions"
          style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {onRename && (
            <button
              id={`session-rename-btn-${session.id}`}
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              aria-label={`Rename session "${session.title}"`}
              title="Rename session (double-click)"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '3px',
                borderRadius: '3px',
                display: 'flex',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
              }}
            >
              <Pencil size={11} />
            </button>
          )}

          {/* Delete with confirmation popover */}
          <div style={{ position: 'relative' }}>
            <button
              id={`session-delete-btn-${session.id}`}
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }}
              aria-label={`Delete session "${session.title}"`}
              title="Delete session"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '3px',
                borderRadius: '3px',
                display: 'flex',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = 'var(--danger)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
              }}
            >
              <Trash2 size={11} />
            </button>

            {showDeleteConfirm && (
              <div
                role="alertdialog"
                aria-label="Confirm session deletion"
                style={{
                  position: 'fixed',
                  zIndex: 200,
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--danger)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  width: '192px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                  left: '20px',
                  marginTop: '4px',
                }}
              >
                <p style={{ fontSize: '12px', color: 'var(--text-primary)', marginBottom: '8px', lineHeight: '1.4' }}>
                  Delete this session and all its messages?
                </p>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    id={`session-delete-confirm-${session.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirm(false);
                      onDelete();
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: 'var(--danger)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    <Check size={10} /> Confirm
                  </button>
                  <button
                    id={`session-delete-cancel-${session.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirm(false);
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    <X size={10} /> Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isEditing && (
        <button
          onClick={commitRename}
          aria-label="Confirm rename"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent-growth)',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <Check size={12} />
        </button>
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

  // Cmd+K / Ctrl+K focuses search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const filtered = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const groups = groupSessions(filtered);

  return (
    <aside
      aria-label="Session sidebar"
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
          id="new-session-btn"
          onClick={onCreateSession}
          title="New Chat (Cmd/Ctrl+N)"
          aria-label="New Chat Session (Cmd+N)"
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
            padding: '9px 12px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.15s ease',
            letterSpacing: '0.01em',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--accent-hover)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--accent-primary)';
          }}
        >
          <Plus size={15} />
          <span>New Chat</span>
          <span
            style={{
              fontSize: '10px',
              color: 'rgba(255,255,255,0.6)',
              backgroundColor: 'rgba(0,0,0,0.2)',
              borderRadius: '3px',
              padding: '1px 5px',
              fontFamily: 'var(--font-mono)',
            }}
          >
            ⌘N
          </span>
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
            transition: 'border-color 0.15s',
          }}
          onFocusCapture={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-focus)';
          }}
          onBlurCapture={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)';
          }}
        >
          <Search size={13} color="var(--text-muted)" />
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
              color: 'var(--text-primary)',
              fontSize: '12px',
              width: '100%',
              outline: 'none',
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              aria-label="Clear search"
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0', display: 'flex' }}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Session groups list */}
      <div
        role="list"
        aria-label="Conversation sessions"
        style={{ flex: 1, overflowY: 'auto', padding: '0 10px' }}
      >
        {groups.length === 0 ? (
          <div style={{ padding: '16px 8px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
            {searchTerm ? 'No matching sessions' : 'No sessions yet — create one above'}
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label} role="group" aria-label={group.label} style={{ marginBottom: '8px' }}>
              <div
                style={{
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--text-muted)',
                  padding: '10px 8px 4px 8px',
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
                    onRename={
                      onRenameSession ? (t) => onRenameSession(s.id, t) : undefined
                    }
                  />
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Footer: DB Status */}
      <div
        style={{
          padding: '10px 16px',
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
          <Database size={11} />
          <span>PostgreSQL</span>
        </div>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: dbConnected ? 'var(--accent-growth)' : 'var(--warning)',
            fontWeight: 500,
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: dbConnected ? 'var(--accent-growth)' : 'var(--warning)',
            }}
          />
          {dbConnected ? 'Connected' : 'Connecting…'}
        </span>
      </div>
    </aside>
  );
};
