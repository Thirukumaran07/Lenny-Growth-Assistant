/**
 * @vitest-environment jsdom
 * Tests for ChatComposer: submission, keyboard, stop button, char limit.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatComposer } from '../components/ChatComposer';

describe('ChatComposer', () => {
  let onSendMessage: ReturnType<typeof vi.fn>;
  let onStopStreaming: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSendMessage = vi.fn();
    onStopStreaming = vi.fn();
  });

  it('renders the textarea placeholder', () => {
    render(
      <ChatComposer
        onSendMessage={onSendMessage}
        onStopStreaming={onStopStreaming}
        isStreaming={false}
      />,
    );
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('calls onSendMessage when Enter is pressed with content', async () => {
    const user = userEvent.setup();
    render(
      <ChatComposer
        onSendMessage={onSendMessage}
        onStopStreaming={onStopStreaming}
        isStreaming={false}
      />,
    );
    const textarea = screen.getByLabelText('Chat query input');
    await user.type(textarea, 'How did Superhuman measure PMF?');
    await user.keyboard('{Enter}');
    expect(onSendMessage).toHaveBeenCalledWith('How did Superhuman measure PMF?');
  });

  it('does NOT submit when Shift+Enter is pressed (newline)', async () => {
    const user = userEvent.setup();
    render(
      <ChatComposer
        onSendMessage={onSendMessage}
        onStopStreaming={onStopStreaming}
        isStreaming={false}
      />,
    );
    const textarea = screen.getByLabelText('Chat query input');
    await user.type(textarea, 'Hello');
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it('disables send button when isStreaming=true and shows Stop', () => {
    render(
      <ChatComposer
        onSendMessage={onSendMessage}
        onStopStreaming={onStopStreaming}
        isStreaming={true}
      />,
    );
    expect(screen.getByLabelText('Stop generating response')).toBeInTheDocument();
    expect(screen.queryByLabelText('Send message')).not.toBeInTheDocument();
  });

  it('calls onStopStreaming when Stop button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ChatComposer
        onSendMessage={onSendMessage}
        onStopStreaming={onStopStreaming}
        isStreaming={true}
      />,
    );
    await user.click(screen.getByLabelText('Stop generating response'));
    expect(onStopStreaming).toHaveBeenCalledOnce();
  });

  it('clears the textarea after successful submission', async () => {
    const user = userEvent.setup();
    render(
      <ChatComposer
        onSendMessage={onSendMessage}
        onStopStreaming={onStopStreaming}
        isStreaming={false}
      />,
    );
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    await user.type(textarea, 'Test prompt');
    await user.keyboard('{Enter}');
    expect(textarea.value).toBe('');
  });

  it('shows char count and disables submit when over limit', () => {
    render(
      <ChatComposer
        onSendMessage={onSendMessage}
        onStopStreaming={onStopStreaming}
        isStreaming={false}
      />,
    );
    const textarea = screen.getByRole('textbox');
    // Fill beyond 4000 chars
    const overLimit = 'x'.repeat(4001);
    fireEvent.change(textarea, { target: { value: overLimit } });
    const sendBtn = screen.getByLabelText('Send message');
    expect(sendBtn).toBeDisabled();
  });

  it('does not send empty/whitespace prompt', async () => {
    const user = userEvent.setup();
    render(
      <ChatComposer
        onSendMessage={onSendMessage}
        onStopStreaming={onStopStreaming}
        isStreaming={false}
      />,
    );
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, '   ');
    await user.keyboard('{Enter}');
    expect(onSendMessage).not.toHaveBeenCalled();
  });
});
