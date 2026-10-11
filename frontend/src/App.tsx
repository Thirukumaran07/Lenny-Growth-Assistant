import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Header } from './components/Header';
import { Sidebar, SessionItem } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { ArtifactViewer } from './components/ArtifactViewer';
import { Artifact, Message } from './types/chat';
import {
  sessionsApi,
  healthApi,
  streamChat,
  type ReadinessResponse,
} from './api/client';

export const App: React.FC = () => {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);
  const [sessionArtifacts, setSessionArtifacts] = useState<Artifact[]>([]);
  const [systemReady, setSystemReady] = useState<boolean | null>(null);
  const [dbConnected, setDbConnected] = useState(false);
  const [activeProvider, setActiveProvider] = useState('local_ollama');
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<Message | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string>('');

  const abortControllerRef = useRef<AbortController | null>(null);

  // ─── Session Management ─────────────────────────────────────────────────

  const loadSessionDetails = useCallback(async (sessionId: string) => {
    setError(null);
    try {
      const data = await sessionsApi.get(sessionId);
      const arts = (data.artifacts || []).map((a: any) => ({
        ...a,
        id: String(a.id),
        session_id: String(a.session_id ?? sessionId),
      })) as Artifact[];
      setSessionArtifacts(arts);

      setMessages(
        (data.messages as Message[]).map((m) => {
          const matchingArt = arts.find((a) => String(a.id) === String(m.artifact_id));
          return {
            ...m,
            id: String(m.id),
            session_id: String(m.session_id ?? sessionId),
            artifact: matchingArt || (m.artifact as Artifact | undefined),
          };
        }),
      );

      if (arts.length > 0) {
        setActiveArtifact(arts[0]);
      } else {
        setActiveArtifact(null);
        setIsViewerOpen(false);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading session history');
    }
  }, []);

  const loadSessions = useCallback(
    async (keepActiveId?: string) => {
      try {
        const data = await sessionsApi.list(50);
        const items = (data.items || []).map((s) => ({
          ...s,
          id: String(s.id),
        })) as SessionItem[];
        setSessions(items);

        if (keepActiveId) {
          setActiveSessionId(keepActiveId);
          loadSessionDetails(keepActiveId);
        } else if (!activeSessionId && items.length > 0) {
          setActiveSessionId(items[0].id);
          loadSessionDetails(items[0].id);
        }
      } catch {
        // Ignore initial connection errors silently
      }
    },
    [activeSessionId, loadSessionDetails],
  );

  const handleSelectSession = (id: string) => {
    if (id === activeSessionId) return;
    if (isStreaming && abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      setStreamingMessage(null);
    }
    setError(null);
    setActiveSessionId(id);
    loadSessionDetails(id);
  };

  const handleCreateSession = async () => {
    if (isStreaming && abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      setStreamingMessage(null);
    }
    try {
      const newSession = await sessionsApi.create({ title: 'New Growth Session' });
      const id = String(newSession.id);
      setSessions((prev) => [{ ...newSession, id } as SessionItem, ...prev]);
      setActiveSessionId(id);
      setMessages([]);
      setActiveArtifact(null);
      setSessionArtifacts([]);
      setIsViewerOpen(false);
      setError(null);
    } catch (err: any) {
      console.error('Failed to create session:', err);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (isStreaming && activeSessionId === id && abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      setStreamingMessage(null);
    }
    try {
      await sessionsApi.delete(id);
      const remaining = sessions.filter((s) => s.id !== id);
      setSessions(remaining);
      if (activeSessionId === id) {
        if (remaining.length > 0) {
          setActiveSessionId(remaining[0].id);
          loadSessionDetails(remaining[0].id);
        } else {
          setActiveSessionId(null);
          setMessages([]);
          setActiveArtifact(null);
          setSessionArtifacts([]);
          setIsViewerOpen(false);
        }
      }
    } catch (err: any) {
      console.error('Failed to delete session:', err);
    }
  };

  const handleRenameSession = async (id: string, newTitle: string) => {
    try {
      const updated = await sessionsApi.rename(id, { title: newTitle });
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, title: updated.title } : s)),
      );
    } catch (err: any) {
      console.error('Failed to rename session:', err);
    }
  };

  // ─── Streaming ──────────────────────────────────────────────────────────

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsStreaming(false);
    if (streamingMessage?.content) {
      setMessages((prev) => [
        ...prev,
        { ...streamingMessage, isStreaming: false },
      ]);
    }
    setStreamingMessage(null);
  };

  const executeStream = useCallback(
    async (promptText: string, targetSessionId: string) => {
      setLastPrompt(promptText);

      // Optimistic user message
      const userMsg: Message = {
        id: `user-${Date.now()}`,
        session_id: targetSessionId,
        role: 'user',
        content: promptText,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setError(null);

      // Streaming placeholder
      const streamPlaceholder: Message = {
        id: `assistant-stream-${Date.now()}`,
        session_id: targetSessionId,
        role: 'assistant',
        content: '',
        citations: [],
        isStreaming: true,
        statusStage: 'routing',
        created_at: new Date().toISOString(),
      };
      setStreamingMessage(streamPlaceholder);
      setIsStreaming(true);

      let accContent = '';
      let accCitations: any[] = [];
      let generatedArtifact: Artifact | null = null;

      const controller = streamChat(targetSessionId, promptText, {
        onStatus: (data) => {
          setStreamingMessage((prev) =>
            prev ? { ...prev, statusStage: data.stage, statusMessage: data.message } : null,
          );
        },
        onCitations: (data) => {
          accCitations = data.citations || [];
          setStreamingMessage((prev) =>
            prev ? { ...prev, citations: accCitations } : null,
          );
        },
        onToken: (data) => {
          accContent += data.token || '';
          setStreamingMessage((prev) =>
            prev ? { ...prev, content: accContent } : null,
          );
        },
        onArtifact: (artData) => {
          const art: Artifact = {
            id: String(artData.id),
            session_id: String(artData.session_id),
            title: artData.title,
            artifact_type: artData.artifact_type,
            content: artData.content,
            created_at: artData.created_at,
          };
          generatedArtifact = art;
          setActiveArtifact(art);
          setSessionArtifacts((prev) => [art, ...prev]);
          setIsViewerOpen(true);
          setStreamingMessage((prev) =>
            prev ? { ...prev, artifact: art } : null,
          );
        },
        onDone: (data) => {
          const finalContent = data.final_content || accContent;
          const finalCitations = data.citations || accCitations;
          const artToAttach = data.artifact
            ? {
                id: String(data.artifact.id),
                session_id: String(data.artifact.session_id),
                title: data.artifact.title,
                artifact_type: data.artifact.artifact_type,
                content: data.artifact.content,
                created_at: data.artifact.created_at,
              }
            : generatedArtifact;

          if (artToAttach) {
            setActiveArtifact(artToAttach);
            setIsViewerOpen(true);
          }

          const completed: Message = {
            id: `assistant-${Date.now()}`,
            session_id: targetSessionId,
            role: 'assistant',
            content: finalContent,
            citations: finalCitations,
            artifact: artToAttach || undefined,
            isStreaming: false,
            created_at: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, completed]);
          setStreamingMessage(null);
          setIsStreaming(false);
          loadSessions(targetSessionId);
        },
        onError: (err) => {
          setError(err.message || 'Stream connection failed.');
          setStreamingMessage(null);
          setIsStreaming(false);
        },
      });

      abortControllerRef.current = controller;
    },
    [loadSessions],
  );

  const handleSendMessage = async (promptText: string) => {
    let targetSessionId = activeSessionId;

    if (!targetSessionId) {
      try {
        const newSession = await sessionsApi.create({
          title: promptText.slice(0, 60).trim() + (promptText.length > 60 ? '…' : ''),
        });
        const id = String(newSession.id);
        setSessions((prev) => [{ ...newSession, id } as SessionItem, ...prev]);
        setActiveSessionId(id);
        targetSessionId = id;
      } catch (err: any) {
        setError(err.message || 'Failed to initialize session before sending.');
        return;
      }
    }

    await executeStream(promptText, targetSessionId!);
  };

  const handleRetry = useCallback(() => {
    if (lastPrompt && activeSessionId && !isStreaming) {
      setError(null);
      executeStream(lastPrompt, activeSessionId);
    }
  }, [lastPrompt, activeSessionId, isStreaming, executeStream]);

  // ─── Global Keyboard Shortcuts ──────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd+N / Ctrl+N → New Chat
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        handleCreateSession();
      }
      // Cmd+\ / Ctrl+\ → Toggle Artifact Viewer
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        setIsViewerOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Readiness Polling ──────────────────────────────────────────────────

  useEffect(() => {
    const checkReadiness = async () => {
      try {
        const data: ReadinessResponse = await healthApi.ready();
        setSystemReady(data.status === 'ready' || data.status === 'degraded');
        setDbConnected(Boolean(data.dependencies.database?.healthy));
        setActiveProvider(data.active_provider || 'local_ollama');
        if (data.dependencies.database?.healthy && sessions.length === 0) {
          loadSessions();
        }
      } catch {
        setSystemReady(false);
      }
    };

    checkReadiness();
    const interval = setInterval(checkReadiness, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions.length]);

  // ─── Render ─────────────────────────────────────────────────────────────

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
      <Header
        isViewerOpen={isViewerOpen}
        onToggleViewer={() => {
          setIsViewerOpen((prev) => {
            const next = !prev;
            if (next && !activeArtifact && sessionArtifacts.length > 0) {
              setActiveArtifact(sessionArtifacts[0]);
            }
            return next;
          });
        }}
        systemReady={systemReady}
        activeProvider={activeProvider}
        onProviderChanged={(p) => setActiveProvider(p)}
      />

      <div
        style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <Sidebar
          dbConnected={dbConnected}
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onCreateSession={handleCreateSession}
          onDeleteSession={handleDeleteSession}
          onRenameSession={handleRenameSession}
        />

        <ChatView
          activeSessionId={activeSessionId}
          messages={messages}
          isStreaming={isStreaming}
          streamingMessage={streamingMessage}
          error={error}
          lastPrompt={lastPrompt}
          onSendMessage={handleSendMessage}
          onStopStreaming={handleStopStreaming}
          onOpenArtifact={(art) => {
            setActiveArtifact(art);
            setIsViewerOpen(true);
          }}
          onClearError={() => setError(null)}
          onRetry={handleRetry}
        />

        <ArtifactViewer
          artifact={activeArtifact}
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
        />
      </div>
    </div>
  );
};

export default App;
