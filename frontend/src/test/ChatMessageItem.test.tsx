/**
 * @vitest-environment jsdom
 * Tests for ChatMessageItem: Markdown rendering, citation pills, streaming UI,
 * insufficient evidence banner, copy button.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatMessageItem } from '../components/ChatMessageItem';
import type { Message, Citation } from '../types/chat';

const mockCitation: Citation = {
  chunk_id: 'chunk-001',
  episode_id: 'ep-100',
  episode_title: 'How Superhuman Built an Engine to Find PMF',
  guest: 'Rahul Vohra',
  source_url: 'https://www.lennyspodcast.com/how-superhuman-built-an-engine-to-find-pmf',
  speaker: 'Rahul Vohra',
  timestamp: '14:20',
  quote: 'We found that when 40% of users say they would be very disappointed...',
  similarity: 0.91,
};

const makeMsg = (overrides: Partial<Message> = {}): Message => ({
  id: 'msg-001',
  session_id: 'sess-001',
  role: 'assistant',
  content: '## PMF Framework\n\nRahul Vohra discovered the 40% rule.',
  created_at: new Date().toISOString(),
  citations: [],
  ...overrides,
});

describe('ChatMessageItem', () => {
  it('renders user message with "You" label', () => {
    render(
      <ChatMessageItem
        message={makeMsg({ role: 'user', content: 'Hello' })}
        onOpenCitation={vi.fn()}
      />,
    );
    expect(screen.getByText('You')).toBeInTheDocument();
  });

  it('renders assistant label with Grounded Model badge', () => {
    render(
      <ChatMessageItem
        message={makeMsg()}
        onOpenCitation={vi.fn()}
      />,
    );
    expect(screen.getByText('The Lenny Growth Assistant')).toBeInTheDocument();
    expect(screen.getByText('Grounded Model')).toBeInTheDocument();
  });

  it('renders Markdown headings safely (no raw HTML)', () => {
    const { container } = render(
      <ChatMessageItem
        message={makeMsg({ content: '## Section Title\n\nParagraph.' })}
        onOpenCitation={vi.fn()}
      />,
    );
    expect(container.querySelector('h2')).toBeInTheDocument();
    // Ensure no script tags were injected
    expect(container.innerHTML).not.toContain('<script>');
  });

  it('renders citation pills when citations are present', () => {
    render(
      <ChatMessageItem
        message={makeMsg({ citations: [mockCitation] })}
        onOpenCitation={vi.fn()}
      />,
    );
    expect(screen.getByText('Verified Transcript Sources (1)')).toBeInTheDocument();
    expect(screen.getByLabelText(/Citation 1: Rahul Vohra/i)).toBeInTheDocument();
  });

  it('calls onOpenCitation when citation pill is clicked', () => {
    const handler = vi.fn();
    render(
      <ChatMessageItem
        message={makeMsg({ citations: [mockCitation] })}
        onOpenCitation={handler}
      />,
    );
    fireEvent.click(screen.getByLabelText(/Citation 1:/i));
    expect(handler).toHaveBeenCalledWith(mockCitation, [mockCitation]);
  });

  it('shows streaming cursor when isStreaming=true', () => {
    const { container } = render(
      <ChatMessageItem
        message={makeMsg({ isStreaming: true, content: 'Partial…' })}
        onOpenCitation={vi.fn()}
      />,
    );
    // Streaming cursor rendered as an inline span with pulseGlow animation
    const cursor = container.querySelector('span[aria-hidden="true"]');
    expect(cursor).toBeTruthy();
  });

  it('shows status stage label during streaming', () => {
    render(
      <ChatMessageItem
        message={makeMsg({ isStreaming: true, statusStage: 'retrieving', content: '' })}
        onOpenCitation={vi.fn()}
      />,
    );
    expect(screen.getByText('Searching Lenny podcast archives…')).toBeInTheDocument();
  });

  it('shows insufficient evidence banner', () => {
    render(
      <ChatMessageItem
        message={makeMsg({
          content: 'Insufficient evidence found in transcripts.',
          statusStage: 'insufficient_evidence',
        })}
        onOpenCitation={vi.fn()}
      />,
    );
    expect(
      screen.getByText(/Insufficient Evidence in Transcripts/i),
    ).toBeInTheDocument();
  });

  it('shows copy button for non-streaming assistant messages', () => {
    render(
      <ChatMessageItem
        message={makeMsg({ isStreaming: false })}
        onOpenCitation={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/copy response/i)).toBeInTheDocument();
  });

  it('does NOT show copy button during streaming', () => {
    render(
      <ChatMessageItem
        message={makeMsg({ isStreaming: true })}
        onOpenCitation={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText(/copy response/i)).not.toBeInTheDocument();
  });

  it('shows Retry button when statusStage is error and onRetry is provided', () => {
    const onRetry = vi.fn();
    render(
      <ChatMessageItem
        message={makeMsg({ statusStage: 'error', content: 'Connection failed' })}
        onOpenCitation={vi.fn()}
        onRetry={onRetry}
      />,
    );
    expect(screen.getByText('Retry Request')).toBeInTheDocument();
  });
});
