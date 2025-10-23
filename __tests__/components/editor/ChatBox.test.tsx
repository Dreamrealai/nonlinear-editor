import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ChatBox from '@/components/editor/ChatBox';

// Mock the SupabaseProvider
const mockSupabaseClient = {
  from: jest.fn(),
  channel: jest.fn(),
  removeChannel: jest.fn(),
};

jest.mock('@/components/providers/SupabaseProvider', () => ({
  useSupabase: () => ({
    supabaseClient: mockSupabaseClient,
  }),
}));

// Mock browserLogger
jest.mock('@/lib/browserLogger', () => ({
  browserLogger: {
    error: jest.fn(),
  },
}));

// Mock Next.js Image component
jest.mock('next/image', () => ({
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
  },
  {
    id: 'msg-2',
    role: 'assistant' as const,
    content: 'Of course! How can I assist you today?',
    created_at: '2024-01-01T10:00:05Z',
    model: 'gemini-flash-latest',
  },
];

describe('ChatBox', () => {
  const defaultProps = {
    projectId: 'test-project',
    collapsed: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Supabase query responses
    const mockSelect = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockReturnThis();
    const mockOrder = jest.fn().mockResolvedValue({ data: mockMessages, error: null });
    const mockInsert = jest.fn().mockReturnThis();
    const mockSingle = jest.fn().mockResolvedValue({ data: mockMessages[0], error: null });
    const mockDelete = jest.fn().mockReturnThis();

    mockSupabaseClient.from.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      delete: mockDelete,
    });

    mockSelect.mockReturnValue({
      eq: mockEq,
    });

    mockEq.mockReturnValue({
      order: mockOrder,
      eq: mockEq,
    });

    mockInsert.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      single: mockSingle,
    });

    mockDelete.mockReturnValue({
      eq: mockEq,
    });

    // Mock Supabase realtime channel
    const mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
    };
    mockSupabaseClient.channel.mockReturnValue(mockChannel);

    // Reset fetch mock
    (global.fetch as jest.Mock).mockReset();
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
        const buttons = screen.getAllByRole('button');
        const sendButton = buttons.find(btn => btn.querySelector('svg'));
        expect(sendButton).toBeInTheDocument();
      });
    });

    it('should render attach file button', async () => {
      render(<ChatBox {...defaultProps} />);
      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(1);
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
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({ data: [], error: null });
      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        order: mockOrder,
      });
      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });

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
        const buttons = screen.getAllByRole('button');
        const sendButton = buttons.find(btn => {
          const svg = btn.querySelector('svg');
          return svg && svg.querySelector('path[d*="M12 19l9 2"]');
        });
        expect(sendButton).toBeDisabled();
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

      const buttons = screen.getAllByRole('button');
      const sendButton = buttons.find(btn => {
        const svg = btn.querySelector('svg');
        return svg && svg.querySelector('path[d*="M12 19l9 2"]');
      });
      expect(sendButton).not.toBeDisabled();
    });

    it('should send message on button click', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: 'AI response' }),
      });

      const user = userEvent.setup();
      render(<ChatBox {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Ask about your video project...')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Ask about your video project...');
      await user.type(input, 'Test message');

      const buttons = screen.getAllByRole('button');
      const sendButton = buttons.find(btn => {
        const svg = btn.querySelector('svg');
        return svg && svg.querySelector('path[d*="M12 19l9 2"]');
      });

      if (sendButton) {
        await user.click(sendButton);
        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith('/api/ai/chat', expect.any(Object));
        });
      }
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
      (global.fetch as jest.Mock).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ response: 'AI response' }),
        }), 1000))
      );

      const user = userEvent.setup();
      render(<ChatBox {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Ask about your video project...')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Ask about your video project...');
      await user.type(input, 'Test message');

      const buttons = screen.getAllByRole('button');
      const sendButton = buttons.find(btn => {
        const svg = btn.querySelector('svg');
        return svg && svg.querySelector('path[d*="M12 19l9 2"]');
      });

      if (sendButton) {
        await user.click(sendButton);

        // Should show loading dots
        await waitFor(() => {
          const loadingDots = screen.getByText((content, element) => {
            return element?.className.includes('animate-bounce') ?? false;
          }, { selector: 'div' });
          expect(loadingDots).toBeInTheDocument();
        }, { timeout: 100 });
      }
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

      const buttons = screen.getAllByRole('button');
      const sendButton = buttons.find(btn => {
        const svg = btn.querySelector('svg');
        return svg && svg.querySelector('path[d*="M12 19l9 2"]');
      });

      if (sendButton) {
        await user.click(sendButton);

        await waitFor(() => {
          expect(screen.getByText('Sorry, I encountered an error processing your request.')).toBeInTheDocument();
        });
      }
    });
  });
});
