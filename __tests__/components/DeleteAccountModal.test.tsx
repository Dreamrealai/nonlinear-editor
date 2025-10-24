import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DeleteAccountModal } from '@/components/DeleteAccountModal';

// Mock browserLogger
jest.mock('@/lib/browserLogger', () => ({
  browserLogger: {
    error: jest.fn(),
  },
}));

// Mock Dialog component
jest.mock('@/components/ui/Dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: { children: React.ReactNode; open: boolean; onOpenChange: (open: boolean) => void }) => (
    open ? <div data-testid="dialog" onClick={() => onOpenChange(false)} onKeyDown={(e) => e.key === 'Escape' && onOpenChange(false)} role="dialog" tabIndex={-1}>{children}</div> : null
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-description">{children}</div>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
}));

describe('DeleteAccountModal', () => {
  const mockOnOpenChange = jest.fn();
  const mockOnConfirm = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnConfirm.mockResolvedValue(undefined);
  });

  describe('Rendering', () => {
    it('should not render when closed', () => {
      render(
        <DeleteAccountModal
          open={false}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          loading={false}
        />
      );

      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    });

    it('should render when open', () => {
      render(
        <DeleteAccountModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          loading={false}
        />
      );

      expect(screen.getByTestId('dialog')).toBeInTheDocument();
    });

    it('should render warning step by default', () => {
      render(
        <DeleteAccountModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          loading={false}
        />
      );

      expect(screen.getByText('Delete Account')).toBeInTheDocument();
      expect(screen.getByText('This action is permanent and cannot be undone.')).toBeInTheDocument();
    });

    it('should render warning icon', () => {
      const { container } = render(
        <DeleteAccountModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          loading={false}
        />
      );

      const icon = container.querySelector('.bg-red-100');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Warning Step', () => {
    it('should display all deletion warnings', () => {
      render(
        <DeleteAccountModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          loading={false}
        />
      );

      expect(screen.getByText(/All your projects and timelines/)).toBeInTheDocument();
      expect(screen.getByText(/All uploaded assets/)).toBeInTheDocument();
      expect(screen.getByText(/All AI-generated content/)).toBeInTheDocument();
      expect(screen.getByText(/Your chat history and preferences/)).toBeInTheDocument();
      expect(screen.getByText(/Your subscription and billing information/)).toBeInTheDocument();
      expect(screen.getByText(/Your account credentials and profile/)).toBeInTheDocument();
    });

    it('should display GDPR compliance notice', () => {
      render(
        <DeleteAccountModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          loading={false}
        />
      );

      expect(screen.getByText('Legal Compliance Notice')).toBeInTheDocument();
      expect(screen.getByText(/anonymized audit logs may be retained/)).toBeInTheDocument();
    });

    it('should have cancel button', () => {
      render(
        <DeleteAccountModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          loading={false}
        />
      );

      const cancelButtons = screen.getAllByText('Cancel');
      expect(cancelButtons.length).toBeGreaterThan(0);
    });

    it('should have continue button', () => {
      render(
        <DeleteAccountModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          loading={false}
        />
      );

      expect(screen.getByText('Continue to Confirmation')).toBeInTheDocument();
    });

    it('should call onOpenChange when cancel clicked', () => {
      render(
        <DeleteAccountModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          loading={false}
        />
      );

      const cancelButton = screen.getAllByText('Cancel')[0];
      fireEvent.click(cancelButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it('should proceed to confirm step when continue clicked', () => {
      render(
        <DeleteAccountModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          loading={false}
        />
      );

      const continueButton = screen.getByText('Continue to Confirmation');
      fireEvent.click(continueButton);

      expect(screen.getByText('Final Confirmation')).toBeInTheDocument();
    });
  });

  describe('Confirmation Step', () => {
    beforeEach(() => {
      render(
        <DeleteAccountModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          loading={false}
        />
      );

      // Navigate to confirmation step
      const continueButton = screen.getByText('Continue to Confirmation');
      fireEvent.click(continueButton);
    });

    it('should display final confirmation heading', () => {
      expect(screen.getByText('Final Confirmation')).toBeInTheDocument();
    });

    it('should display last chance warning', () => {
      expect(screen.getByText('This is your last chance to cancel.')).toBeInTheDocument();
    });

    it('should have confirmation input field', () => {
      const input = screen.getByPlaceholderText('Type DELETE to confirm');
      expect(input).toBeInTheDocument();
    });

    it('should have autofocus on confirmation input', () => {
      const input = screen.getByPlaceholderText('Type DELETE to confirm') as HTMLInputElement;
      expect(input).toHaveAttribute('autoFocus');
    });

    it('should disable confirmation input when loading', () => {
      render(
        <DeleteAccountModal
          open={true}
          onOpenChange={jest.fn()}
          onConfirm={mockOnConfirm}
          loading={true}
        />
      );

      const continueButton = screen.getByText('Continue to Confirmation');
      fireEvent.click(continueButton);

      const input = screen.getByPlaceholderText('Type DELETE to confirm');
      expect(input).toBeDisabled();
    });

    it('should show error message for invalid input', () => {
      const input = screen.getByPlaceholderText('Type DELETE to confirm');
      fireEvent.change(input, { target: { value: 'delete' } });

      expect(screen.getByText(/Please type exactly "DELETE"/)).toBeInTheDocument();
    });

    it('should show success message for valid input', () => {
      const input = screen.getByPlaceholderText('Type DELETE to confirm');
      fireEvent.change(input, { target: { value: 'DELETE' } });

      expect(screen.getByText('Confirmation text is correct')).toBeInTheDocument();
    });

    it('should disable delete button when input is invalid', () => {
      const input = screen.getByPlaceholderText('Type DELETE to confirm');
      fireEvent.change(input, { target: { value: 'delete' } });

      const deleteButton = screen.getByText('Permanently Delete My Account');
      expect(deleteButton).toBeDisabled();
    });

    it('should enable delete button when input is valid', () => {
      const input = screen.getByPlaceholderText('Type DELETE to confirm');
      fireEvent.change(input, { target: { value: 'DELETE' } });

      const deleteButton = screen.getByText('Permanently Delete My Account');
      expect(deleteButton).not.toBeDisabled();
    });

    it('should call onConfirm when delete button clicked with valid input', async () => {
      const input = screen.getByPlaceholderText('Type DELETE to confirm');
      fireEvent.change(input, { target: { value: 'DELETE' } });

      const deleteButton = screen.getByText('Permanently Delete My Account');
      await act(async () => {
        fireEvent.click(deleteButton);
      });

      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });

    it('should not call onConfirm when input is invalid', async () => {
      const input = screen.getByPlaceholderText('Type DELETE to confirm');
      fireEvent.change(input, { target: { value: 'wrong' } });

      const deleteButton = screen.getByText('Permanently Delete My Account');
      await act(async () => {
        fireEvent.click(deleteButton);
      });

      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('should show loading state in delete button', () => {
      render(
        <DeleteAccountModal
          open={true}
          onOpenChange={jest.fn()}
          onConfirm={mockOnConfirm}
          loading={true}
        />
      );

      const continueButton = screen.getByText('Continue to Confirmation');
      fireEvent.click(continueButton);

      expect(screen.getByText('Deleting Account...')).toBeInTheDocument();
    });

    it('should disable cancel button when loading', () => {
      render(
        <DeleteAccountModal
          open={true}
          onOpenChange={jest.fn()}
          onConfirm={mockOnConfirm}
          loading={true}
        />
      );

      const continueButton = screen.getByText('Continue to Confirmation');
      fireEvent.click(continueButton);

      const cancelButton = screen.getAllByText('Cancel')[0];
      expect(cancelButton).toBeDisabled();
    });

    it('should disable delete button when loading', () => {
      render(
        <DeleteAccountModal
          open={true}
          onOpenChange={jest.fn()}
          onConfirm={mockOnConfirm}
          loading={true}
        />
      );

      const continueButton = screen.getByText('Continue to Confirmation');
      fireEvent.click(continueButton);

      const input = screen.getByPlaceholderText('Type DELETE to confirm');
      fireEvent.change(input, { target: { value: 'DELETE' } });

      const deleteButton = screen.getByText('Deleting Account...');
      expect(deleteButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should reset state when deletion fails', async () => {
      const { browserLogger } = await import('@/lib/browserLogger');
      mockOnConfirm.mockRejectedValueOnce(new Error('Deletion failed'));

      render(
        <DeleteAccountModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          loading={false}
        />
      );

      // Navigate to confirmation step
      const continueButton = screen.getByText('Continue to Confirmation');
      fireEvent.click(continueButton);

      // Enter confirmation text
      const input = screen.getByPlaceholderText('Type DELETE to confirm');
      fireEvent.change(input, { target: { value: 'DELETE' } });

      // Click delete button
      const deleteButton = screen.getByText('Permanently Delete My Account');
      await act(async () => {
        fireEvent.click(deleteButton);
      });

      // Should log error
      await waitFor(() => {
        expect(browserLogger.error).toHaveBeenCalled();
      });

      // Should reset to warning step
      await waitFor(() => {
        expect(screen.getByText('Continue to Confirmation')).toBeInTheDocument();
      });
    });

    it('should clear confirmation text on error', async () => {
      mockOnConfirm.mockRejectedValueOnce(new Error('Deletion failed'));

      render(
        <DeleteAccountModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          loading={false}
        />
      );

      // Navigate to confirmation step
      const continueButton = screen.getByText('Continue to Confirmation');
      fireEvent.click(continueButton);

      // Enter confirmation text
      const input = screen.getByPlaceholderText('Type DELETE to confirm') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'DELETE' } });

      // Click delete button
      const deleteButton = screen.getByText('Permanently Delete My Account');
      await act(async () => {
        fireEvent.click(deleteButton);
      });

      // Wait for error handling
      await waitFor(() => {
        expect(screen.getByText('Continue to Confirmation')).toBeInTheDocument();
      });

      // Navigate back to confirmation step
      const continueButtonAgain = screen.getByText('Continue to Confirmation');
      fireEvent.click(continueButtonAgain);

      // Input should be cleared
      const inputAgain = screen.getByPlaceholderText('Type DELETE to confirm') as HTMLInputElement;
      expect(inputAgain.value).toBe('');
    });
  });

  describe('State Management', () => {
    it('should reset state when modal is closed', () => {
      const { rerender } = render(
        <DeleteAccountModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          loading={false}
        />
      );

      // Navigate to confirmation step
      const continueButton = screen.getByText('Continue to Confirmation');
      fireEvent.click(continueButton);

      // Enter text
      const input = screen.getByPlaceholderText('Type DELETE to confirm');
      fireEvent.change(input, { target: { value: 'DELETE' } });

      // Close modal
      rerender(
        <DeleteAccountModal
          open={false}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          loading={false}
        />
      );

      // Reopen modal
      rerender(
        <DeleteAccountModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          loading={false}
        />
      );

      // Should be back at warning step
      expect(screen.getByText('Continue to Confirmation')).toBeInTheDocument();
    });

    it('should not close modal when loading', () => {
      render(
        <DeleteAccountModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          loading={true}
        />
      );

      const cancelButton = screen.getAllByText('Cancel')[0];
      fireEvent.click(cancelButton);

      expect(mockOnOpenChange).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(
        <DeleteAccountModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          loading={false}
        />
      );

      const heading = screen.getByTestId('dialog-title');
      expect(heading.tagName).toBe('H2');
    });

    it('should have descriptive button labels', () => {
      render(
        <DeleteAccountModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          loading={false}
        />
      );

      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Continue to Confirmation')).toBeInTheDocument();
    });

    it('should have placeholder text for confirmation input', () => {
      render(
        <DeleteAccountModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          loading={false}
        />
      );

      const continueButton = screen.getByText('Continue to Confirmation');
      fireEvent.click(continueButton);

      const input = screen.getByPlaceholderText('Type DELETE to confirm');
      expect(input).toBeInTheDocument();
    });

    it('should disable autocomplete on confirmation input', () => {
      render(
        <DeleteAccountModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          loading={false}
        />
      );

      const continueButton = screen.getByText('Continue to Confirmation');
      fireEvent.click(continueButton);

      const input = screen.getByPlaceholderText('Type DELETE to confirm');
      expect(input).toHaveAttribute('autoComplete', 'off');
    });

    it('should have visual feedback for button states', () => {
      render(
        <DeleteAccountModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          loading={false}
        />
      );

      const continueButton = screen.getByText('Continue to Confirmation');
      fireEvent.click(continueButton);

      const input = screen.getByPlaceholderText('Type DELETE to confirm');
      fireEvent.change(input, { target: { value: 'wrong' } });

      const deleteButton = screen.getByText('Permanently Delete My Account');
      expect(deleteButton).toHaveClass('disabled:cursor-not-allowed');
    });
  });

  describe('Visual States', () => {
    it('should show checkmark icon for valid confirmation', () => {
      const { container } = render(
        <DeleteAccountModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          loading={false}
        />
      );

      const continueButton = screen.getByText('Continue to Confirmation');
      fireEvent.click(continueButton);

      const input = screen.getByPlaceholderText('Type DELETE to confirm');
      fireEvent.change(input, { target: { value: 'DELETE' } });

      const successMessage = screen.getByText('Confirmation text is correct');
      expect(successMessage).toHaveClass('text-green-600');
    });

    it('should show error icon for invalid confirmation', () => {
      render(
        <DeleteAccountModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          loading={false}
        />
      );

      const continueButton = screen.getByText('Continue to Confirmation');
      fireEvent.click(continueButton);

      const input = screen.getByPlaceholderText('Type DELETE to confirm');
      fireEvent.change(input, { target: { value: 'wrong' } });

      const errorMessage = screen.getByText(/Please type exactly "DELETE"/);
      expect(errorMessage).toHaveClass('text-red-600');
    });

    it('should show loading spinner when deleting', () => {
      const { container } = render(
        <DeleteAccountModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          loading={true}
        />
      );

      const continueButton = screen.getByText('Continue to Confirmation');
      fireEvent.click(continueButton);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });
});
