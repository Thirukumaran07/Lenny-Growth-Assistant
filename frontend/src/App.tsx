import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
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

  useEffect(() => {
    // Poll readiness probe
    const checkReadiness = async () => {
      try {
        const res = await fetch('/api/ready');
        if (res.ok) {
          const data: ReadinessResponse = await res.json();
          setSystemReady(data.status === 'ready');
          setDbConnected(Boolean(data.dependencies.database?.healthy));
          setActiveProvider(data.active_provider || 'local_ollama');
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
        <Sidebar dbConnected={dbConnected} />

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
