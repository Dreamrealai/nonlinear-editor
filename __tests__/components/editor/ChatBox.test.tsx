import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ChatBox } from '@/components/editor/ChatBox';
import { createMockSupabaseClient } from '@/test-utils/mockSupabase';

// Mock the SupabaseProvider
const mockChannel = {
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
};

const mockSupabaseClient = createMockSupabaseClient();

jest.mock('@/components/providers/SupabaseProvider', (): Record<string, unknown> => ({
  useSupabase: (): Record<string, unknown> => ({
    supabaseClient: mockSupabaseClient,
  }),
}));

// Mock browserLogger
jest.mock('@/lib/browserLogger', (): Record<string, unknown> => ({
  browserLogger: {
    error: jest.fn(),
  },
}));

// Mock Next.js Image component
jest.mock('next/image', (): Record<string, unknown> => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Mock fetch
global.fetch = jest.fn();

const mockMessages = [
  {
    id: 'msg-1',
    role: 'user' as const,
    content: 'Hello, can you help me?',
    created_at: '2024-01-01T10:00:00Z',
    model: 'gemini-flash-latest',
    attachments: null,
  },
  {
    id: 'msg-2',
    role: 'assistant' as const,
    content: 'Of course! How can I assist you today?',
    created_at: '2024-01-01T10:00:05Z',
    model: 'gemini-flash-latest',
    attachments: null,
  },
];

describe('ChatBox', () => {
  const defaultProps = {
    projectId: 'test-project',
    collapsed: false,
  };

  const scrollIntoViewMock = jest.fn();
  const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
  const mockCreateObjectURL = jest.fn(() => 'blob:mock-url');
  const mockRevokeObjectURL = jest.fn();
  const originalCreateObjectURL = (
    URL as unknown as { createObjectURL?: typeof URL.createObjectURL }
  ).createObjectURL;
  const originalRevokeObjectURL = (
    URL as unknown as { revokeObjectURL?: typeof URL.revokeObjectURL }
  ).revokeObjectURL;

  beforeEach((): void => {
    jest.clearAllMocks();

    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoViewMock,
    });

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: mockCreateObjectURL,
    });

    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: mockRevokeObjectURL,
    });

    // Mock Supabase query responses
    let lastOperation: 'select' | 'insert' | 'delete' | null = null;

    mockChannel.on.mockReturnThis();
    mockChannel.on.mockClear();
    mockChannel.subscribe.mockClear();
    mockChannel.unsubscribe.mockClear();

    mockSupabaseClient.from.mockImplementation(() => mockSupabaseClient);
    mockSupabaseClient.select.mockImplementation(() => {
      lastOperation = 'select';
      return mockSupabaseClient;
    });
    mockSupabaseClient.insert.mockImplementation(() => {
      lastOperation = 'insert';
      return mockSupabaseClient;
    });
    mockSupabaseClient.delete.mockImplementation(() => {
      lastOperation = 'delete';
      return mockSupabaseClient;
    });
    mockSupabaseClient.eq.mockImplementation(() => {
      if (lastOperation === 'delete') {
        return Promise.resolve({ data: null, error: null });
      }
      return mockSupabaseClient;
    });
    mockSupabaseClient.order.mockResolvedValue({ data: mockMessages, error: null });
    mockSupabaseClient.single.mockResolvedValue({ data: mockMessages[0], error: null });
    mockSupabaseClient.channel.mockReturnValue(mockChannel);

    // Mock Supabase realtime channel
    mockChannel.subscribe.mockImplementation(() => ({ data: null }));

    // Reset fetch mock with sensible defaults for initial load/save operations
    (global.fetch as jest.Mock).mockReset();
    (global.fetch as jest.Mock).mockImplementation(
      (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input.toString();
        const method = init?.method?.toUpperCase() ?? 'GET';

        if (url.includes('/chat/messages')) {
          return Promise.resolve({ ok: true, json: async () => ({}) });
        }

        if (url.endsWith('/chat') && method === 'GET') {
          return Promise.resolve({ ok: true, json: async () => ({ messages: mockMessages }) });
        }

        if (url === '/api/ai/chat' && method === 'POST') {
          return Promise.resolve({ ok: true, json: async () => ({ response: 'AI response' }) });
        }

        // Fallback response
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }
    );
  });

  afterEach((): void => {
    mockCreateObjectURL.mockClear();
    mockRevokeObjectURL.mockClear();
    scrollIntoViewMock.mockClear();
  });

  afterAll((): void => {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: originalScrollIntoView,
    });
    if (originalCreateObjectURL) {
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        writable: true,
        value: originalCreateObjectURL,
      });
    } else {
      delete (URL as unknown as { createObjectURL?: unknown }).createObjectURL;
    }
    if (originalRevokeObjectURL) {
      Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        writable: true,
        value: originalRevokeObjectURL,
      });
    } else {
      delete (URL as unknown as { revokeObjectURL?: unknown }).revokeObjectURL;
    }
  });

  describe('Rendering', () => {
    it('should render without crashing', async () => {
      render(<ChatBox {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('DreamReal Assistant')).toBeInTheDocument();
      });
    });

    it('should not render when collapsed is true', () => {
      const { container } = render(<ChatBox {...defaultProps} collapsed={true} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render model selector', async () => {
      render(<ChatBox {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });
    });

    it('should render clear chat button', async () => {
      render(<ChatBox {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByTitle('Clear chat history')).toBeInTheDocument();
      });
    });

    it('should render message input', async () => {
      render(<ChatBox {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Ask about your video project...')).toBeInTheDocument();
      });
    });

    it('should render send button', async () => {
      render(<ChatBox {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument();
      });
    });

    it('should render attach file button', async () => {
      render(<ChatBox {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Attach files' })).toBeInTheDocument();
      });
    });
  });

  describe('Message Display', () => {
    it('should display loading state initially', async () => {
      render(<ChatBox {...defaultProps} />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should display messages after loading', async () => {
      render(<ChatBox {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('Hello, can you help me?')).toBeInTheDocument();
        expect(screen.getByText('Of course! How can I assist you today?')).toBeInTheDocument();
      });
    });

    it('should display empty state when no messages', async () => {
      mockSupabaseClient.order.mockResolvedValueOnce({ data: [], error: null });

      render(<ChatBox {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('Start a conversation')).toBeInTheDocument();
        expect(screen.getByText('Ask me anything about your video project')).toBeInTheDocument();
      });
    });

    it('should display message timestamps', async () => {
      render(<ChatBox {...defaultProps} />);
      await waitFor(() => {
        const timestamps = screen.getAllByText(/\d{1,2}:\d{2}/);
        expect(timestamps.length).toBeGreaterThan(0);
      });
    });

    it('should style user messages differently from assistant messages', async () => {
      const { container } = render(<ChatBox {...defaultProps} />);
      await waitFor(() => {
        const userMessages = container.querySelectorAll('.from-blue-600');
        const assistantMessages = container.querySelectorAll('.bg-neutral-100');
        expect(userMessages.length).toBeGreaterThan(0);
        expect(assistantMessages.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Model Selection', () => {
    it('should show default model as Gemini Flash', async () => {
      render(<ChatBox {...defaultProps} />);
      await waitFor(() => {
        const select = screen.getByRole('combobox') as HTMLSelectElement;
        expect(select.value).toBe('gemini-flash-latest');
      });
    });

    it('should allow changing model', async () => {
      const user = userEvent.setup();
      render(<ChatBox {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'gemini-2.5-pro');

      expect((select as HTMLSelectElement).value).toBe('gemini-2.5-pro');
    });

    it('should have both model options available', async () => {
      render(<ChatBox {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByRole('option', { name: /Gemini Flash/i })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: /Gemini Pro/i })).toBeInTheDocument();
      });
    });
  });

  describe('Message Sending', () => {
    it('should disable send button when input is empty', async () => {
      render(<ChatBox {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
      });
    });

    it('should enable send button when input has text', async () => {
      const user = userEvent.setup();
      render(<ChatBox {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Ask about your video project...')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Ask about your video project...');
      await user.type(input, 'Test message');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Send message' })).not.toBeDisabled();
      });
    });

    it('should send message on button click', async () => {
      const user = userEvent.setup();
      render(<ChatBox {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Ask about your video project...')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Ask about your video project...');
      await user.type(input, 'Test message');

      const sendButton = screen.getByRole('button', { name: 'Send message' });
      await user.click(sendButton);
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/ai/chat', expect.any(Object));
      });
    });

    it('should send message on Enter key press', async () => {
      const user = userEvent.setup();
      render(<ChatBox {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Ask about your video project...')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Ask about your video project...');
      await user.type(input, 'Test message{Enter}');

      // Message should be cleared after sending
      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });

    it('should not send message on Shift+Enter', async () => {
      const user = userEvent.setup();
      render(<ChatBox {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Ask about your video project...')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Ask about your video project...');
      await user.type(input, 'Test message{Shift>}{Enter}{/Shift}');

      // Message should still be in input
      expect(input).toHaveValue('Test message\n');
    });
  });

  describe('File Attachments', () => {
    it('should have hidden file input', async () => {
      const { container } = render(<ChatBox {...defaultProps} />);
      await waitFor(() => {
        const fileInput = container.querySelector('input[type="file"]');
        expect(fileInput).toHaveClass('hidden');
      });
    });

    it('should accept multiple files', async () => {
      const { container } = render(<ChatBox {...defaultProps} />);
      await waitFor(() => {
        const fileInput = container.querySelector('input[type="file"]');
        expect(fileInput).toHaveAttribute('multiple');
      });
    });

    it('should accept specific file types', async () => {
      const { container } = render(<ChatBox {...defaultProps} />);
      await waitFor(() => {
        const fileInput = container.querySelector('input[type="file"]');
        expect(fileInput).toHaveAttribute('accept', 'image/*,.pdf,.doc,.docx,.txt');
      });
    });

    it('should create blob URLs when files are attached', async () => {
      const { container } = render(<ChatBox {...defaultProps} />);

      await waitFor(() => {
        expect(container.querySelector('input[type="file"]')).not.toBeNull();
      });
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const testFile = new File(['test'], 'test.png', { type: 'image/png' });

      fireEvent.change(fileInput as HTMLInputElement, {
        target: { files: [testFile] },
      });

      expect(mockCreateObjectURL).toHaveBeenCalledWith(testFile);
      await waitFor(() => {
        expect(screen.getByText('test.png')).toBeInTheDocument();
      });
    });

    it('should revoke blob URLs after sending message', async () => {
      const user = userEvent.setup();
      const { container } = render(<ChatBox {...defaultProps} />);

      await waitFor(() => {
        expect(container.querySelector('input[type="file"]')).not.toBeNull();
      });
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const testFile = new File(['test'], 'test.png', { type: 'image/png' });

      fireEvent.change(fileInput as HTMLInputElement, {
        target: { files: [testFile] },
      });

      await waitFor(() => {
        expect(screen.getByText('test.png')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Ask about your video project...');
      await user.type(input, 'Attachment test');

      const sendButton = screen.getByRole('button', { name: 'Send message' });
      await user.click(sendButton);

      await waitFor(() => {
        expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
      });
    });
  });

  describe('Clear Chat', () => {
    it('should show confirmation dialog when clearing chat', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
      const user = userEvent.setup();

      render(<ChatBox {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTitle('Clear chat history')).toBeInTheDocument();
      });

      const clearButton = screen.getByTitle('Clear chat history');
      await user.click(clearButton);

      expect(confirmSpy).toHaveBeenCalledWith(
        'Are you sure you want to clear the entire chat history?'
      );

      confirmSpy.mockRestore();
    });

    it('should not clear chat if user cancels', async () => {
      jest.spyOn(window, 'confirm').mockReturnValue(false);
      const user = userEvent.setup();

      render(<ChatBox {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTitle('Clear chat history')).toBeInTheDocument();
      });

      const clearButton = screen.getByTitle('Clear chat history');
      await user.click(clearButton);

      // Messages should still be present
      await waitFor(() => {
        expect(screen.getByText('Hello, can you help me?')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator when sending message', async () => {
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (global.fetch as jest.Mock).mockImplementation(() => pendingPromise);

      const user = userEvent.setup();
      render(<ChatBox {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Ask about your video project...')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Ask about your video project...');
      await user.type(input, 'Test message');

      const sendButton = screen.getByRole('button', { name: 'Send message' });
      await user.click(sendButton);

      // Should show loading dots
      await waitFor(
        () => {
          const loadingDots = screen.getByText(
            (content, element) => {
              return element?.className.includes('animate-bounce') ?? false;
            },
            { selector: 'div' }
          );
          expect(loadingDots).toBeInTheDocument();
        },
        { timeout: 100 }
      );

      // Cleanup: resolve the promise to prevent memory leak
      resolvePromise!({ ok: true, json: async () => ({ response: 'AI response' }) });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'API Error' }),
      });

      const user = userEvent.setup();
      render(<ChatBox {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Ask about your video project...')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Ask about your video project...');
      await user.type(input, 'Test message');

      const sendButton = screen.getByRole('button', { name: 'Send message' });
      await user.click(sendButton);

      await waitFor(() => {
        expect(
          screen.getByText('Sorry, I encountered an error processing your request.')
        ).toBeInTheDocument();
      });
    });
  });
});
