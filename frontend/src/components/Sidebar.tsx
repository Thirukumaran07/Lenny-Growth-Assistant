import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Compass,
  Folder,
  Grid,
  PanelLeftClose,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
  X,
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
          {/* Stylized Nomi / Lenny Coral Spark Mark */}
          <div
            style={{
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2C12 7.52285 7.52285 12 2 12C7.52285 12 12 16.4771 12 22C12 16.4771 16.4771 12 22 12C16.4771 12 12 7.52285 12 2Z"
                fill="url(#sparkGradient)"
              />
              <defs>
                <linearGradient id="sparkGradient" x1="2" y1="2" x2="22" y2="22">
                  <stop stopColor="#F97316" />
                  <stop offset="1" stopColor="#EF4444" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '21px',
              fontWeight: 500,
              letterSpacing: '-0.02em',
              color: '#ffffff',
            }}
          >
            Nomi AI
          </span>
        </div>

        {/* Sidebar Collapse Icon */}
        <button
          aria-label="Toggle sidebar"
          style={{
            background: 'none',
            border: 'none',
            color: '#8e8a84',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            padding: '4px',
            borderRadius: '6px',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#ffffff')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#8e8a84')}
        >
          <PanelLeftClose size={18} />
        </button>
      </div>

      {/* ─── + New Chat Button ───────────────────────────────────────────── */}
      <div style={{ padding: '0 16px 12px 16px' }}>
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

      {/* ─── Static Navigation Links ────────────────────────────────────── */}
      <div style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 10px',
            borderRadius: '8px',
            color: '#a39f98',
            fontSize: '13.5px',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#f5f4f0';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#a39f98';
          }}
        >
          <Compass size={16} />
          <span>Explore</span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 10px',
            borderRadius: '8px',
            color: '#a39f98',
            fontSize: '13.5px',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#f5f4f0';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#a39f98';
          }}
        >
          <Grid size={16} />
          <span>Categories</span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 10px',
            borderRadius: '8px',
            color: '#a39f98',
            fontSize: '13.5px',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#f5f4f0';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#a39f98';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Folder size={16} />
            <span>Library</span>
          </div>
          <span
            style={{
              backgroundColor: '#323130',
              color: '#c2beb7',
              fontSize: '11px',
              padding: '1px 7px',
              borderRadius: '10px',
            }}
          >
            32
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 10px',
            borderRadius: '8px',
            color: '#a39f98',
            fontSize: '13.5px',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#f5f4f0';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#a39f98';
          }}
        >
          <Settings size={16} />
          <span>Settings</span>
        </div>
      </div>

      {/* ─── Search input (Hidden or compact) ────────────────────────────── */}
      <div style={{ padding: '8px 14px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#1b1a19',
            borderRadius: '8px',
            padding: '5px 8px',
            border: '1px solid #2e2d2b',
          }}
        >
          <Search size={12} color="#7c7974" />
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
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* ─── Recent Chats Header & List ──────────────────────────────────── */}
      <div
        style={{
          padding: '14px 18px 6px 18px',
          fontSize: '12.5px',
          color: '#7c7974',
          fontWeight: 500,
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
          <div style={{ padding: '20px 8px', fontSize: '12px', color: '#7c7974', textAlign: 'center' }}>
            {searchTerm ? 'No matching sessions' : 'No sessions yet'}
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label} role="group" aria-label={group.label} style={{ marginBottom: '6px' }}>
              {/* Subtle group heading for test compliance */}
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

      {/* ─── User Profile Footer ─────────────────────────────────────────── */}
      <div
        style={{
          padding: '14px 18px',
          borderTop: '1px solid #292826',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#201f1f',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* User Avatar Circle */}
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#4a443c',
              backgroundImage: 'radial-gradient(circle at 30% 30%, #e07a5f, #3d405b)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            }}
          >
            M
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: '#f5f4f0' }}>Maya Johnes</div>
            {/* DB status indicator */}
            <div
              style={{
                fontSize: '10px',
                color: dbConnected ? '#10b981' : '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span
                style={{
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  backgroundColor: dbConnected ? '#10b981' : '#f59e0b',
                }}
              />
              <span>{dbConnected ? 'Connected' : 'Connecting…'}</span>
            </div>
          </div>
        </div>

        <button
          aria-label="Notifications"
          style={{
            background: 'none',
            border: 'none',
            color: '#8e8a84',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '6px',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#ffffff')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#8e8a84')}
        >
          <Bell size={16} />
        </button>
      </div>
    </aside>
  );
};
