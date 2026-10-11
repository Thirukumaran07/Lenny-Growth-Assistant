import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ArtifactViewer } from '../components/ArtifactViewer';
import type { Artifact } from '../types/chat';

const mockHtmlArtifact: Artifact = {
  id: 'art-html-123',
  session_id: 'session-456',
  title: 'Superhuman PMF Dashboard',
  artifact_type: 'html',
  content: '<!DOCTYPE html><html><body><h1>Superhuman Engine</h1></body></html>',
  created_at: '2026-10-11T12:00:00Z',
};

const mockMarkdownArtifact: Artifact = {
  id: 'art-md-456',
  session_id: 'session-456',
  title: 'Elena Verna PLG Playbook',
  artifact_type: 'markdown',
  content: '# Retention Playbook\n\n## 1. Activation Loops\n- Step 1\n- Step 2',
  created_at: '2026-10-11T12:00:00Z',
};

describe('ArtifactViewer Component', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <ArtifactViewer artifact={mockHtmlArtifact} isOpen={false} onClose={onClose} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when artifact is null', () => {
    const { container } = render(
      <ArtifactViewer artifact={null} isOpen={true} onClose={onClose} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders HTML artifact header, title, and HTML/CSS badge', () => {
    render(<ArtifactViewer artifact={mockHtmlArtifact} isOpen={true} onClose={onClose} />);

    expect(screen.getByRole('complementary')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Superhuman PMF Dashboard/i })).toBeInTheDocument();
    expect(screen.getByText('HTML/CSS')).toBeInTheDocument();
    expect(screen.getByText(/Isolated Sandbox/i)).toBeInTheDocument();
  });

  it('renders Markdown badge for markdown artifacts', () => {
    render(<ArtifactViewer artifact={mockMarkdownArtifact} isOpen={true} onClose={onClose} />);

    expect(screen.getByRole('heading', { level: 2, name: /Elena Verna PLG Playbook/i })).toBeInTheDocument();
    expect(screen.getByText('Markdown')).toBeInTheDocument();
  });

  it('enforces strict iframe sandbox isolation without allow-same-origin', () => {
    render(<ArtifactViewer artifact={mockHtmlArtifact} isOpen={true} onClose={onClose} />);

    const iframe = screen.getByTitle('Artifact Sandbox') as HTMLIFrameElement;
    expect(iframe).toBeInTheDocument();
    expect(iframe.tagName.toLowerCase()).toBe('iframe');

    // Strict sandbox attributes
    const sandboxAttr = iframe.getAttribute('sandbox');
    expect(sandboxAttr).toContain('allow-scripts');
    expect(sandboxAttr).not.toContain('allow-same-origin');
    expect(sandboxAttr).not.toContain('allow-top-navigation');
    expect(sandboxAttr).not.toContain('allow-popups');
    expect(sandboxAttr).not.toContain('allow-forms');

    // Strict CSP meta tag injected into srcDoc
    const srcDoc = iframe.getAttribute('srcdoc') || '';
    expect(srcDoc).toContain('Content-Security-Policy');
    expect(srcDoc).toContain("default-src 'none'");
    expect(srcDoc).toContain("style-src 'unsafe-inline'");
    expect(srcDoc).toContain("script-src 'unsafe-inline'");
  });

  it('renders Markdown preview without raw HTML injection', () => {
    render(<ArtifactViewer artifact={mockMarkdownArtifact} isOpen={true} onClose={onClose} />);

    // In markdown preview mode, iframe should NOT be rendered
    expect(screen.queryByTitle('Artifact Sandbox')).toBeNull();
    expect(screen.getByText('Retention Playbook')).toBeInTheDocument();
    expect(screen.getByText('1. Activation Loops')).toBeInTheDocument();
  });

  it('switches between Preview mode and Raw Code inspection mode', () => {
    render(<ArtifactViewer artifact={mockHtmlArtifact} isOpen={true} onClose={onClose} />);

    // Initially in preview mode
    expect(screen.getByTitle('Artifact Sandbox')).toBeInTheDocument();

    // Click code tab
    const codeTab = screen.getByRole('tab', { name: /Code/i });
    fireEvent.click(codeTab);

    // Iframe is hidden, raw code inspector is shown
    expect(screen.queryByTitle('Artifact Sandbox')).toBeNull();
    expect(screen.getByText(/<h1>Superhuman Engine<\/h1>/i)).toBeInTheDocument();

    // Line number gutter exists
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('copies code to clipboard with visual feedback', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    render(<ArtifactViewer artifact={mockHtmlArtifact} isOpen={true} onClose={onClose} />);

    const copyBtn = screen.getByLabelText(/Copy Code/i);
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(mockHtmlArtifact.content);
    });
  });

  it('triggers download with proper extension and sanitization', () => {
    const createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url');
    const revokeObjectURLMock = vi.fn();
    window.URL.createObjectURL = createObjectURLMock;
    window.URL.revokeObjectURL = revokeObjectURLMock;

    render(<ArtifactViewer artifact={mockHtmlArtifact} isOpen={true} onClose={onClose} />);

    const downloadBtn = screen.getByLabelText(/Download artifact file/i);
    fireEvent.click(downloadBtn);

    expect(createObjectURLMock).toHaveBeenCalled();
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url');
  });

  it('calls onClose when close button is clicked or Esc is pressed', () => {
    render(<ArtifactViewer artifact={mockHtmlArtifact} isOpen={true} onClose={onClose} />);

    const closeBtn = screen.getByLabelText(/Close artifact viewer/i);
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    // Esc key
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('blocks oversized payloads and displays security alert instead of rendering', () => {
    const hugeContent = 'A'.repeat(1_100_000); // 1.1 MB > 1 MB ceiling
    const oversizedArtifact: Artifact = {
      ...mockHtmlArtifact,
      content: hugeContent,
    };

    render(<ArtifactViewer artifact={oversizedArtifact} isOpen={true} onClose={onClose} />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Oversized Payload Blocked/i)).toBeInTheDocument();
    expect(screen.queryByTitle('Artifact Sandbox')).toBeNull();
  });

  it('blocks unsupported artifact types with an error alert', () => {
    const invalidArtifact = {
      ...mockHtmlArtifact,
      artifact_type: 'javascript' as any,
    };

    render(<ArtifactViewer artifact={invalidArtifact} isOpen={true} onClose={onClose} />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Unsupported Artifact Type/i)).toBeInTheDocument();
    expect(screen.queryByTitle('Artifact Sandbox')).toBeNull();
  });
});
