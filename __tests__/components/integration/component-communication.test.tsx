/**
 * Integration Test: Component Communication Patterns
 *
 * Tests how components communicate with each other through:
 * - Parent-child props and callbacks
 * - Context providers and consumers
 * - Event propagation and bubbling
 * - State synchronization
 * - Shared store subscriptions
 *
 * This test verifies that components properly communicate and maintain
 * consistent state across the application.
 */

import React, { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { useEditorStore } from '@/state/useEditorStore';
import { usePlaybackStore } from '@/state/usePlaybackStore';

describe('Integration: Component Communication Patterns', () => {
  beforeEach((): void => {
    // Reset stores
    useEditorStore.getState().reset();
    usePlaybackStore.getState().reset();
  });

  describe('Parent-Child Communication', () => {
    it('should pass props from parent to child correctly', () => {
      const Parent = (): void => {
        return (
          <Button variant="primary" size="lg" disabled={false}>
            Test Button
          </Button>
        );
      };

      render(<Parent />);

      const button = screen.getByRole('button', { name: /test button/i });
      expect(button).toBeInTheDocument();
      expect(button).not.toBeDisabled();
      // Button should have been rendered with some styling
      expect(button.className.length).toBeGreaterThan(0);
    });

    it('should invoke callback from child to parent', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();

      const Parent = (): void => {
        return <Button onClick={handleClick}>Click Me</Button>;
      };

      render(<Parent />);

      const button = screen.getByRole('button', { name: /click me/i });
      await user.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should pass updated props when parent state changes', async () => {
      const user = userEvent.setup();

      const Parent = (): void => {
        const [disabled, setDisabled] = useState(false);

        return (
          <div>
            <Button onClick={() => setDisabled(true)} disabled={disabled}>
              Toggle
            </Button>
            <Button disabled={disabled}>Target</Button>
          </div>
        );
      };

      render(<Parent />);

      const toggleButton = screen.getByRole('button', { name: /toggle/i });
      const targetButton = screen.getByRole('button', { name: /target/i });

      // Initially enabled
      expect(targetButton).not.toBeDisabled();

      // Click to disable
      await user.click(toggleButton);

      // Should be disabled now
      await waitFor(() => {
        expect(targetButton).toBeDisabled();
      });
    });

    it('should support ref forwarding from parent to child', () => {
      const inputRef = React.createRef<HTMLInputElement>();

      const Parent = (): void => {
        return <Input ref={inputRef} placeholder="Test input" />;
      };

      render(<Parent />);

      expect(inputRef.current).toBeInstanceOf(HTMLInputElement);
      expect(inputRef.current?.placeholder).toBe('Test input');
    });

    it('should render children prop correctly', () => {
      const Parent = (): void => {
        return (
          <Button>
            <span>Child 1</span>
            <span>Child 2</span>
          </Button>
        );
      };

      render(<Parent />);

      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
    });
  });

  describe('Callback Propagation', () => {
    it('should propagate callbacks through multiple component layers', async () => {
      const user = userEvent.setup();
      const rootCallback = jest.fn();

      const Grandchild = ({ onClick }: { onClick: () => void }) => {
        return <Button onClick={onClick}>Grandchild</Button>;
      };

      const Child = ({ onClick }: { onClick: () => void }) => {
        return <Grandchild onClick={onClick} />;
      };

      const Parent = (): void => {
        return <Child onClick={rootCallback} />;
      };

      render(<Parent />);

      const button = screen.getByRole('button', { name: /grandchild/i });
      await user.click(button);

      expect(rootCallback).toHaveBeenCalledTimes(1);
    });

    it('should handle callback with parameters correctly', async () => {
      const user = userEvent.setup();
      const handleSubmit = jest.fn();

      const Parent = (): void => {
        return (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit('test-data');
            }}
          >
            <Button type="submit">Submit</Button>
          </form>
        );
      };

      render(<Parent />);

      const button = screen.getByRole('button', { name: /submit/i });
      await user.click(button);

      expect(handleSubmit).toHaveBeenCalledWith('test-data');
    });

    it('should support async callbacks', async () => {
      const user = userEvent.setup();
      const asyncCallback = jest.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return 'completed';
      });

      const Parent = (): void => {
        const [status, setStatus] = useState('idle');

        const handleClick = async (): Promise<void> => {
          setStatus('loading');
          await asyncCallback();
          setStatus('completed');
        };

        return (
          <div>
            <Button onClick={handleClick}>Click</Button>
            <div>Status: {status}</div>
          </div>
        );
      };

      render(<Parent />);

      const button = screen.getByRole('button', { name: /click/i });
      await user.click(button);

      // Should show loading
      expect(screen.getByText('Status: loading')).toBeInTheDocument();

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText('Status: completed')).toBeInTheDocument();
      });

      expect(asyncCallback).toHaveBeenCalled();
    });
  });

  describe('Event Bubbling and Capturing', () => {
    it('should bubble events from child to parent', async () => {
      const user = userEvent.setup();
      const parentClick = jest.fn();
      const childClick = jest.fn();

      const Parent = (): void => {
        return (
          <div onClick={parentClick}>
            <Button onClick={childClick}>Child</Button>
          </div>
        );
      };

      render(<Parent />);

      const button = screen.getByRole('button', { name: /child/i });
      await user.click(button);

      // Both should be called due to bubbling
      expect(childClick).toHaveBeenCalled();
      expect(parentClick).toHaveBeenCalled();
    });

    it('should stop event propagation when requested', async () => {
      const user = userEvent.setup();
      const parentClick = jest.fn();
      const childClick = jest.fn((e: React.MouseEvent) => {
        e.stopPropagation();
      });

      const Parent = (): void => {
        return (
          <div onClick={parentClick}>
            <Button onClick={childClick}>Child</Button>
          </div>
        );
      };

      render(<Parent />);

      const button = screen.getByRole('button', { name: /child/i });
      await user.click(button);

      // Only child should be called
      expect(childClick).toHaveBeenCalled();
      expect(parentClick).not.toHaveBeenCalled();
    });

    it('should prevent default behavior when requested', async () => {
      const user = userEvent.setup();
      const handleSubmit = jest.fn((e: React.FormEvent) => {
        e.preventDefault();
      });

      const Parent = (): void => {
        return (
          <form onSubmit={handleSubmit}>
            <Button type="submit">Submit</Button>
          </form>
        );
      };

      render(<Parent />);

      const button = screen.getByRole('button', { name: /submit/i });
      await user.click(button);

      // Form should not actually submit (no page reload)
      expect(handleSubmit).toHaveBeenCalled();
    });
  });

  describe('State Synchronization', () => {
    it('should synchronize state between sibling components through parent', async () => {
      const user = userEvent.setup();

      const Parent = (): void => {
        const [sharedValue, setSharedValue] = useState('');

        return (
          <div>
            <Input value={sharedValue} onChange={(e) => setSharedValue(e.target.value)} />
            <div data-testid="display">{sharedValue}</div>
          </div>
        );
      };

      render(<Parent />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'Hello');

      await waitFor(() => {
        expect(screen.getByTestId('display')).toHaveTextContent('Hello');
      });
    });

    it('should maintain state consistency across re-renders', async () => {
      const user = userEvent.setup();

      const Parent = (): void => {
        const [count, setCount] = useState(0);
        const [dummy, setDummy] = useState(0);

        return (
          <div>
            <Button onClick={() => setCount(count + 1)}>Increment</Button>
            <Button onClick={() => setDummy(dummy + 1)}>Re-render</Button>
            <div data-testid="count">Count: {count}</div>
          </div>
        );
      };

      render(<Parent />);

      const incrementButton = screen.getByRole('button', { name: /increment/i });
      const rerenderButton = screen.getByRole('button', { name: /re-render/i });

      // Increment
      await user.click(incrementButton);
      expect(screen.getByTestId('count')).toHaveTextContent('Count: 1');

      // Trigger re-render
      await user.click(rerenderButton);

      // Count should remain the same
      expect(screen.getByTestId('count')).toHaveTextContent('Count: 1');
    });
  });

  describe('Store-based Communication', () => {
    it('should share state between components via Zustand store', async () => {
      const user = userEvent.setup();

      const ComponentA = (): void => {
        const currentTime = useEditorStore((state) => state.currentTime);
        const setCurrentTime = useEditorStore((state) => state.setCurrentTime);

        return (
          <div>
            <Button onClick={() => setCurrentTime(currentTime + 1)}>Increment Time</Button>
            <div data-testid="time-a">Time: {currentTime}</div>
          </div>
        );
      };

      const ComponentB = (): void => {
        const currentTime = useEditorStore((state) => state.currentTime);

        return <div data-testid="time-b">Time: {currentTime}</div>;
      };

      const Parent = (): void => {
        return (
          <div>
            <ComponentA />
            <ComponentB />
          </div>
        );
      };

      render(<Parent />);

      // Both should show same initial time
      expect(screen.getByTestId('time-a')).toHaveTextContent('Time: 0');
      expect(screen.getByTestId('time-b')).toHaveTextContent('Time: 0');

      // Update from ComponentA
      const button = screen.getByRole('button', { name: /increment time/i });
      await user.click(button);

      // Both should update
      await waitFor(() => {
        expect(screen.getByTestId('time-a')).toHaveTextContent('Time: 1');
        expect(screen.getByTestId('time-b')).toHaveTextContent('Time: 1');
      });
    });

    it('should handle multiple store subscriptions correctly', async () => {
      const user = userEvent.setup();

      const Component = (): void => {
        const editorTime = useEditorStore((state) => state.currentTime);
        const playbackState = usePlaybackStore((state) => state.isPlaying);
        const setEditorTime = useEditorStore((state) => state.setCurrentTime);
        const togglePlayback = usePlaybackStore((state) => state.togglePlayPause);

        return (
          <div>
            <Button onClick={() => setEditorTime(editorTime + 1)}>Update Time</Button>
            <Button onClick={togglePlayback}>Toggle Play</Button>
            <div data-testid="editor-time">{editorTime}</div>
            <div data-testid="playback-state">{playbackState ? 'Playing' : 'Paused'}</div>
          </div>
        );
      };

      render(<Component />);

      // Initial state
      expect(screen.getByTestId('editor-time')).toHaveTextContent('0');
      expect(screen.getByTestId('playback-state')).toHaveTextContent('Paused');

      // Update editor time
      await user.click(screen.getByRole('button', { name: /update time/i }));

      await waitFor(() => {
        expect(screen.getByTestId('editor-time')).toHaveTextContent('1');
      });

      // Toggle playback
      await user.click(screen.getByRole('button', { name: /toggle play/i }));

      await waitFor(() => {
        expect(screen.getByTestId('playback-state')).toHaveTextContent('Playing');
      });
    });

    it('should only re-render components subscribed to changed state', async () => {
      const user = userEvent.setup();
      const renderCounts = {
        componentA: 0,
        componentB: 0,
      };

      const ComponentA = (): void => {
        renderCounts.componentA++;
        const currentTime = useEditorStore((state) => state.currentTime);
        const setCurrentTime = useEditorStore((state) => state.setCurrentTime);

        return (
          <div>
            <Button onClick={() => setCurrentTime(currentTime + 1)}>Update</Button>
            <div data-testid="time">{currentTime}</div>
          </div>
        );
      };

      const ComponentB = (): void => {
        renderCounts.componentB++;
        const zoom = useEditorStore((state) => state.zoom);

        return <div data-testid="zoom">{zoom}</div>;
      };

      const Parent = (): void => {
        return (
          <div>
            <ComponentA />
            <ComponentB />
          </div>
        );
      };

      render(<Parent />);

      const initialRenderA = renderCounts.componentA;
      const initialRenderB = renderCounts.componentB;

      // Update time (ComponentA's state)
      await user.click(screen.getByRole('button', { name: /update/i }));

      await waitFor(() => {
        expect(screen.getByTestId('time')).toHaveTextContent('1');
      });

      // ComponentA should have re-rendered
      expect(renderCounts.componentA).toBeGreaterThan(initialRenderA);

      // ComponentB should NOT have re-rendered (doesn't subscribe to currentTime)
      expect(renderCounts.componentB).toBe(initialRenderB);
    });
  });

  describe('Dialog Component Communication', () => {
    it('should communicate state between trigger and dialog', async () => {
      const user = userEvent.setup();

      const Parent = (): void => {
        const [isOpen, setIsOpen] = useState(false);

        return (
          <div>
            <Button onClick={() => setIsOpen(true)}>Open Dialog</Button>
            {isOpen && (
              <Dialog
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                title="Test Dialog"
                description="Test description"
              >
                <div>Dialog Content</div>
                <Button onClick={() => setIsOpen(false)}>Close</Button>
              </Dialog>
            )}
          </div>
        );
      };

      render(<Parent />);

      // Dialog should not be visible initially
      expect(screen.queryByText('Dialog Content')).not.toBeInTheDocument();

      // Open dialog
      await user.click(screen.getByRole('button', { name: /open dialog/i }));

      // Dialog should be visible
      await waitFor(() => {
        expect(screen.getByText('Dialog Content')).toBeInTheDocument();
      });

      // Close dialog
      await user.click(screen.getByRole('button', { name: /close/i }));

      // Dialog should be hidden
      await waitFor(() => {
        expect(screen.queryByText('Dialog Content')).not.toBeInTheDocument();
      });
    });

    it('should handle form submission from dialog to parent', async () => {
      const user = userEvent.setup();
      const handleSubmit = jest.fn();

      const Parent = (): void => {
        const [isOpen, setIsOpen] = useState(true);
        const [value, setValue] = useState('');

        const onSubmit = (e: React.FormEvent) => {
          e.preventDefault();
          handleSubmit(value);
          setIsOpen(false);
        };

        return (
          <Dialog
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            title="Form Dialog"
            description="Enter data"
          >
            <form onSubmit={onSubmit}>
              <Input
                name="name"
                placeholder="Name"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
              <Button type="submit">Submit</Button>
            </form>
          </Dialog>
        );
      };

      render(<Parent />);

      // Fill form
      const input = screen.getByPlaceholderText('Name');
      await user.type(input, 'Test User');

      // Submit
      await user.click(screen.getByRole('button', { name: /submit/i }));

      // Callback should be invoked with data
      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalledWith('Test User');
      });
    });
  });

  describe('Error Boundary Communication', () => {
    it('should catch and handle errors from child components', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = jest.fn();

      const ErrorChild = (): void => {
        throw new Error('Test error');
      };

      const Parent = (): void => {
        return (
          <div>
            <ErrorChild />
          </div>
        );
      };

      // This should throw and be caught by React's error boundary
      expect(() => render(<Parent />)).toThrow('Test error');

      // Restore console.error
      console.error = originalError;
    });
  });
});
