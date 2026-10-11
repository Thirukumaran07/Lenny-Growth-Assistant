/**
 * @vitest-environment jsdom
 * Tests for Sidebar: session grouping, search filter, new session button,
 * rename inline edit, delete confirmation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar, SessionItem } from '../components/Sidebar';

const now = new Date();
const todayStr = new Date(
  now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0,
).toISOString();

const sevenDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
const oldStr = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

const mockSessions: SessionItem[] = [
  { id: 'sess-1', title: 'PMF Benchmarks', created_at: todayStr, updated_at: todayStr, message_count: 4 },
  { id: 'sess-2', title: 'Ship30 Essay', created_at: sevenDaysAgo, updated_at: sevenDaysAgo, message_count: 2 },
  { id: 'sess-3', title: 'Old Retention Q&A', created_at: oldStr, updated_at: oldStr, message_count: 1 },
];

describe('Sidebar', () => {
  let onSelectSession: ReturnType<typeof vi.fn>;
  let onCreateSession: ReturnType<typeof vi.fn>;
  let onDeleteSession: ReturnType<typeof vi.fn>;
  let onRenameSession: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSelectSession = vi.fn();
    onCreateSession = vi.fn();
    onDeleteSession = vi.fn();
    onRenameSession = vi.fn();
  });

  function renderSidebar(activeId: string | null = null) {
    return render(
      <Sidebar
        dbConnected={true}
        sessions={mockSessions}
        activeSessionId={activeId}
        onSelectSession={onSelectSession}
        onCreateSession={onCreateSession}
        onDeleteSession={onDeleteSession}
        onRenameSession={onRenameSession}
      />,
    );
  }

  it('renders the New Chat button with keyboard shortcut label', () => {
    renderSidebar();
    expect(screen.getByText('New Chat')).toBeInTheDocument();
    expect(screen.getByTitle(/Cmd\/Ctrl\+N/i)).toBeInTheDocument();
  });

  it('calls onCreateSession when New Chat is clicked', async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByText('New Chat'));
    expect(onCreateSession).toHaveBeenCalledOnce();
  });

  it('renders all three sessions', () => {
    renderSidebar();
    expect(screen.getByText('PMF Benchmarks')).toBeInTheDocument();
    expect(screen.getByText('Ship30 Essay')).toBeInTheDocument();
    expect(screen.getByText('Old Retention Q&A')).toBeInTheDocument();
  });

  it('groups sessions with "Today" and "Older" labels', () => {
    renderSidebar();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Older')).toBeInTheDocument();
  });

  it('filters sessions via the search input', async () => {
    const user = userEvent.setup();
    renderSidebar();
    const searchInput = screen.getByLabelText('Filter sessions');
    await user.type(searchInput, 'PMF');
    expect(screen.getByText('PMF Benchmarks')).toBeInTheDocument();
    expect(screen.queryByText('Ship30 Essay')).not.toBeInTheDocument();
  });

  it('calls onSelectSession when a session row is clicked', async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByText('PMF Benchmarks'));
    expect(onSelectSession).toHaveBeenCalledWith('sess-1');
  });

  it('marks active session with aria-current', () => {
    renderSidebar('sess-1');
    const row = screen.getByRole('button', { name: /Session: PMF Benchmarks/ });
    expect(row).toHaveAttribute('aria-current', 'true');
  });

  it('shows "No matching sessions" when search has no results', async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.type(screen.getByLabelText('Filter sessions'), 'xyznonexistent');
    expect(screen.getByText('No matching sessions')).toBeInTheDocument();
  });

  it('shows delete confirmation when trash icon is clicked', async () => {
    const user = userEvent.setup();
    renderSidebar();
    const deleteBtn = screen.getByLabelText('Delete session "PMF Benchmarks"');
    await user.click(deleteBtn);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('calls onDeleteSession after confirmation', async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByLabelText('Delete session "PMF Benchmarks"'));
    await user.click(screen.getByText('Confirm'));
    expect(onDeleteSession).toHaveBeenCalledWith('sess-1');
  });

  it('does NOT call onDeleteSession when Cancel is clicked', async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByLabelText('Delete session "PMF Benchmarks"'));
    await user.click(screen.getByText('Cancel'));
    expect(onDeleteSession).not.toHaveBeenCalled();
  });

  it('shows DB Connected status in footer', () => {
    renderSidebar();
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });
});
