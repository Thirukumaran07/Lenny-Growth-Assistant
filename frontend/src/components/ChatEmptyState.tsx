import React from 'react';
import { BookOpen, Compass, FileText, Send } from 'lucide-react';

export const ChatEmptyState: React.FC = () => {
  const starterPrompts = [
    {
      icon: <Compass size={16} color="var(--accent-growth)" />,
      title: 'Product-Market Fit Engine',
      prompt: 'How did Superhuman measure product-market fit according to Rahul Vohra?',
    },
    {
      icon: <FileText size={16} color="var(--accent-primary)" />,
      title: 'Ship 30 for 30 Essay',
      prompt: 'Write a Ship 30 for 30 essay on Miro scaling product-led growth.',
    },
    {
      icon: <BookOpen size={16} color="var(--warning)" />,
      title: 'Retention Benchmarks',
      prompt: 'What retention benchmarks should a seed-stage B2B SaaS target according to Lenny’s guests?',
    },
  ];

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        padding: '24px 32px',
        backgroundColor: 'var(--bg-base)',
        overflowY: 'auto',
      }}
    >
      {/* Centered Welcome */}
      <div
        style={{
          maxWidth: '680px',
          width: '100%',
          margin: 'auto',
          textAlign: 'center',
          paddingBottom: '32px',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '20px',
            padding: '4px 14px',
            fontSize: '12px',
            color: 'var(--accent-growth)',
            marginBottom: '16px',
          }}
        >
          <span>● Grounded in Lenny's Podcast & Newsletter Transcripts</span>
        </div>

        <h1
          style={{
            fontSize: '24px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '10px',
          }}
        >
          How can I help with your product and growth goals?
        </h1>
        <p
          style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            lineHeight: '1.6',
            marginBottom: '32px',
          }}
        >
          Ask tactical questions grounded in verified podcast transcripts, create a Ship 30 for 30-style essay, or generate live Markdown and HTML/CSS artifacts.
        </p>

        {/* Starter Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            textAlign: 'left',
          }}
        >
          {starterPrompts.map((card, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '14px',
                cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                {card.icon}
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {card.title}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                {card.prompt}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Input Shell */}
      <div
        style={{
          maxWidth: '720px',
          width: '100%',
          margin: '0 auto',
          position: 'relative',
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <input
            type="text"
            disabled
            placeholder="Ask a growth question or type /essay... (Chat engine enables in Phase 7/8)"
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '14px',
              width: '100%',
            }}
          />
          <button
            disabled
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px',
              color: 'var(--text-muted)',
              cursor: 'not-allowed',
            }}
          >
            <Send size={16} />
          </button>
        </div>
        <div
          style={{
            textAlign: 'center',
            marginTop: '8px',
            fontSize: '11px',
            color: 'var(--text-muted)',
          }}
        >
          Local Ollama llama3.2:3b & nomic-embed-text • All inference and vectors reside locally.
        </div>
      </div>
    </div>
  );
};
