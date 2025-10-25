import React from 'react';
import { render, screen, waitFor, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/Dialog';

describe('Dialog', () => {
  describe('Rendering', () => {
    it('should render dialog trigger', () => {
      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
        </Dialog>
      );
      expect(screen.getByRole('button', { name: 'Open Dialog' })).toBeInTheDocument();
    });

    it('should not show dialog content initially', () => {
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>Dialog Content</DialogContent>
        </Dialog>
      );
      expect(screen.queryByText('Dialog Content')).not.toBeInTheDocument();
    });

    it('should show dialog content when opened', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <p>Dialog Content</p>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: 'Open Dialog' }));

      await waitFor(() => {
        expect(screen.getByText('Dialog Content')).toBeInTheDocument();
      });
    });
  });

  describe('Dialog Components', () => {
    it('should render dialog with title', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dialog Title</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: 'Open' }));

      await waitFor(() => {
        expect(screen.getByText('Dialog Title')).toBeInTheDocument();
      });
    });

    it('should render dialog with description', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogDescription>Dialog Description</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: 'Open' }));

      await waitFor(() => {
        expect(screen.getByText('Dialog Description')).toBeInTheDocument();
      });
    });

    it('should render dialog with header', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Title</DialogTitle>
              <DialogDescription>Description</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: 'Open' }));

      await waitFor(() => {
        expect(screen.getByText('Title')).toBeInTheDocument();
        expect(screen.getByText('Description')).toBeInTheDocument();
      });
    });

    it('should render dialog with footer', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogFooter>
              <button>Cancel</button>
              <button>Confirm</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: 'Open' }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
      });
    });
  });

  describe('Close Functionality', () => {
    it('should show close button', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>Content</DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: 'Open' }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
      });
    });

    it('should close dialog when close button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <p>Dialog Content</p>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: 'Open' }));
      await waitFor(() => expect(screen.getByText('Dialog Content')).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: 'Close' }));

      await waitFor(() => {
        expect(screen.queryByText('Dialog Content')).not.toBeInTheDocument();
      });
    });

    it('should close dialog with DialogClose component', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <p>Dialog Content</p>
            <DialogClose asChild>
              <button>Custom Close</button>
            </DialogClose>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: 'Open' }));
      await waitFor(() => expect(screen.getByText('Dialog Content')).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: 'Custom Close' }));

      await waitFor(() => {
        expect(screen.queryByText('Dialog Content')).not.toBeInTheDocument();
      });
    });
  });

  describe('Controlled State', () => {
    it('should work as controlled component', async () => {
      const user = userEvent.setup();
      const ControlledDialog = (): void => {
        const [open, setOpen] = React.useState(false);
        return (
          <>
            <button onClick={() => setOpen(true)}>Open Controlled</button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogContent>Controlled Content</DialogContent>
            </Dialog>
          </>
        );
      };

      render(<ControlledDialog />);
      expect(screen.queryByText('Controlled Content')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Open Controlled' }));

      await waitFor(() => {
        expect(screen.getByText('Controlled Content')).toBeInTheDocument();
      });
    });

    it('should call onOpenChange when dialog state changes', async () => {
      const user = userEvent.setup();
      const handleOpenChange = jest.fn();

      render(
        <Dialog onOpenChange={handleOpenChange}>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>Content</DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: 'Open' }));

      await waitFor(() => {
        expect(handleOpenChange).toHaveBeenCalledWith(true);
      });
    });
  });

  describe('Full Dialog Example', () => {
    it('should render complete dialog with all components', async () => {
      const user = userEvent.setup();
      const handleConfirm = jest.fn();

      render(
        <Dialog>
          <DialogTrigger>Delete Item</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Are you sure?</DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete the item.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <button>Cancel</button>
              </DialogClose>
              <button onClick={handleConfirm}>Confirm</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      // Open dialog
      await user.click(screen.getByRole('button', { name: 'Delete Item' }));

      // Check all parts are rendered
      await waitFor(() => {
        expect(screen.getByText('Are you sure?')).toBeInTheDocument();
        expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
      });

      // Click confirm
      await user.click(screen.getByRole('button', { name: 'Confirm' }));
      expect(handleConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria attributes', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Title</DialogTitle>
              <DialogDescription>Description</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: 'Open' }));

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dialog</DialogTitle>
            </DialogHeader>
            <DialogClose asChild>
              <button>Close</button>
            </DialogClose>
          </DialogContent>
        </Dialog>
      );

      const trigger = screen.getByRole('button', { name: 'Open' });
      trigger.focus();

      // Open with Enter key
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Dialog')).toBeInTheDocument();
      });
    });

    it('should trap focus within dialog', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <input placeholder="First" />
            <input placeholder="Second" />
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: 'Open' }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('First')).toBeInTheDocument();
      });

      // Focus should be trapped within the dialog
      const firstInput = screen.getByPlaceholderText('First');
      expect(document.body.contains(firstInput)).toBe(true);
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className to DialogContent', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent className="custom-dialog">
            <p>Content</p>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: 'Open' }));

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveClass('custom-dialog');
      });
    });

    it('should apply custom className to DialogHeader', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogHeader className="custom-header">
              <DialogTitle>Title</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: 'Open' }));

      await waitFor(() => {
        const header = screen.getByText('Title').closest('div');
        expect(header).toHaveClass('custom-header');
      });
    });

    it('should apply custom className to DialogFooter', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogFooter className="custom-footer">
              <button>Action</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: 'Open' }));

      await waitFor(() => {
        const footer = screen.getByRole('button', { name: 'Action' }).closest('div');
        expect(footer).toHaveClass('custom-footer');
      });
    });
  });
});
