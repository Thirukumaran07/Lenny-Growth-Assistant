import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { Sidebar, SessionItem } from './components/Sidebar';
import { ChatEmptyState } from './components/ChatEmptyState';
import { ArtifactViewerSkeleton } from './components/ArtifactViewerSkeleton';

interface ReadinessResponse {
  status: string;
  active_provider: string;
  dependencies: {
    database: { healthy: boolean };
    ollama: { healthy: boolean; required_models_present?: Record<string, boolean> };
    cloud_provider: { is_ready: boolean };
  };
}

export const App: React.FC = () => {
  const [isViewerOpen, setIsViewerOpen] = useState(true);
  const [systemReady, setSystemReady] = useState<boolean | null>(null);
  const [dbConnected, setDbConnected] = useState<boolean>(false);
  const [activeProvider, setActiveProvider] = useState<string>('local_ollama');
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const loadSessions = async () => {
    try {
      const res = await fetch('/api/sessions?limit=50');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.items || []);
        if (data.items?.length > 0 && !activeSessionId) {
          setActiveSessionId(data.items[0].id);
        }
      }
    } catch {
      // Ignore initial connection errors
    }
  };

  const handleCreateSession = async () => {
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Growth Session' }),
      });
      if (res.ok) {
        const newSession = await res.json();
        setSessions((prev) => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
      }
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  };

  const handleDeleteSession = async (id: string) => {
    try {
      const res = await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== id));
        if (activeSessionId === id) {
          setActiveSessionId(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  useEffect(() => {
    // Poll readiness probe
    const checkReadiness = async () => {
      try {
        const res = await fetch('/api/ready');
        if (res.ok) {
          const data: ReadinessResponse = await res.json();
          setSystemReady(data.status === 'ready');
          const isDbOk = Boolean(data.dependencies.database?.healthy);
          setDbConnected(isDbOk);
          setActiveProvider(data.active_provider || 'local_ollama');
          if (isDbOk) {
            loadSessions();
          }
        } else {
          setSystemReady(false);
        }
      } catch {
        setSystemReady(false);
      }
    };

    checkReadiness();
    const interval = setInterval(checkReadiness, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-base)',
      }}
    >
      {/* Top Navigation */}
      <Header
        isViewerOpen={isViewerOpen}
        onToggleViewer={() => setIsViewerOpen((prev) => !prev)}
        systemReady={systemReady}
        activeProvider={activeProvider}
      />

      {/* Main 3-Pane Body */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Left Sidebar */}
        <Sidebar
          dbConnected={dbConnected}
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={(id) => setActiveSessionId(id)}
          onCreateSession={handleCreateSession}
          onDeleteSession={handleDeleteSession}
        />

        {/* Center Chat View */}
        <ChatEmptyState />

        {/* Right Side-by-Side Artifact Viewer */}
        {isViewerOpen && (
          <ArtifactViewerSkeleton onClose={() => setIsViewerOpen(false)} />
        )}
      </div>
    </div>
  );
};

export default App;
