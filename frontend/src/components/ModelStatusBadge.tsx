import React, { useEffect, useState } from 'react';
import { Cpu, Cloud, Check, ShieldCheck, ChevronDown, RefreshCw, X } from 'lucide-react';
import { ModelsStatusResponse } from '../types/chat';

interface ModelStatusBadgeProps {
  onProviderChanged?: (newProvider: string) => void;
}

export const ModelStatusBadge: React.FC<ModelStatusBadgeProps> = ({ onProviderChanged }) => {
  const [modelData, setModelData] = useState<ModelsStatusResponse | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);

  const fetchModelStatus = async () => {
    try {
      const res = await fetch('/api/models');
      if (res.ok) {
        const data = await res.json();
        setModelData(data);
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    fetchModelStatus();
  }, []);

  const handleSwitch = async (targetProvider: 'local_ollama' | 'cloud_openai') => {
    if (!modelData || modelData.active_provider === targetProvider) return;
    setSwitching(true);
    setSwitchError(null);
    try {
      const res = await fetch('/api/models/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: targetProvider }),
      });
      if (res.ok) {
        await fetchModelStatus();
        if (onProviderChanged) onProviderChanged(targetProvider);
      } else {
        const err = await res.json();
        setSwitchError(err.detail || 'Failed to switch provider');
      }
    } catch (err: any) {
      setSwitchError(err.message || 'Network error');
    } finally {
      setSwitching(false);
    }
  };

  const isLocal = modelData?.active_provider === 'local_ollama';
  const ollamaHealthy = modelData?.providers.local_ollama.is_healthy ?? true;

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
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
          cursor: 'pointer',
        }}
      >
        {isLocal ? (
          <Cpu size={14} color="var(--accent-growth)" />
        ) : (
          <Cloud size={14} color="var(--accent-primary)" />
        )}
        <span>Model:</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
          {isLocal ? 'Ollama (llama3.2:3b)' : 'Cloud OpenAI'}
        </span>
        <span
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            backgroundColor: ollamaHealthy ? 'var(--accent-growth)' : 'var(--danger)',
          }}
        />
        <ChevronDown size={12} color="var(--text-muted)" />
      </button>

      {/* Popover */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Provider Status & Settings"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '320px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            zIndex: 100,
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              LLM Provider Architecture
            </span>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Privacy Guarantee Note */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '6px',
              padding: '8px 10px',
              fontSize: '11px',
              color: 'var(--accent-growth)',
            }}
          >
            <ShieldCheck size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>
              <strong>Local Privacy Invariant:</strong> Queries default to your on-device Ollama instance. Prompts are never sent to third-party clouds without explicit switch.
            </span>
          </div>

          {/* Providers Switcher Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={() => handleSwitch('local_ollama')}
              disabled={switching}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: '6px',
                border: isLocal ? '1px solid var(--accent-growth)' : '1px solid var(--border-subtle)',
                backgroundColor: isLocal ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-surface-elevated)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>Local Ollama (llama3.2:3b)</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  On-device • Memory: ~2.0 GB RAM
                </div>
              </div>
              {isLocal && <Check size={14} color="var(--accent-growth)" />}
            </button>

            <button
              onClick={() => handleSwitch('cloud_openai')}
              disabled={switching}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: '6px',
                border: !isLocal ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                backgroundColor: !isLocal ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-surface-elevated)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>Cloud OpenAI (Adapter)</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Requires OPENAI_API_KEY
                </div>
              </div>
              {!isLocal && <Check size={14} color="var(--accent-primary)" />}
            </button>
          </div>

          {switchError && (
            <div style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '4px' }}>
              {switchError}
            </div>
          )}

          {/* Hardware Specs info */}
          <div
            style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '8px',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>Target: MacBook Air (8 GB)</span>
            <button
              onClick={fetchModelStatus}
              title="Refresh provider status"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <RefreshCw size={11} /> Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
