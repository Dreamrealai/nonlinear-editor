import React from 'react';
import { render, screen, cleanup, act } from '@testing-library/react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert';

describe('Alert Components', () => {
  describe('Alert', () => {
    it('should render alert with default variant', () => {
      render(<Alert data-testid="alert">Alert content</Alert>);
      const alert = screen.getByTestId('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveAttribute('role', 'alert');
    });

    it('should render children', () => {
      render(<Alert>Alert message</Alert>);
      expect(screen.getByText('Alert message')).toBeInTheDocument();
    });

    it('should have alert role for accessibility', () => {
      render(<Alert>Alert</Alert>);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(
        <Alert className="custom-alert" data-testid="alert">
          Alert
        </Alert>
      );
      expect(screen.getByTestId('alert')).toHaveClass('custom-alert');
    });

    it('should forward ref to div element', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<Alert ref={ref}>Alert</Alert>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('should support HTML attributes', () => {
      render(
        <Alert id="my-alert" data-testid="alert" aria-label="Important alert">
          Alert
        </Alert>
      );
      const alert = screen.getByTestId('alert');
      expect(alert).toHaveAttribute('id', 'my-alert');
      expect(alert).toHaveAttribute('aria-label', 'Important alert');
    });
  });

  describe('Variants', () => {
    it('should render default variant', () => {
      render(
        <Alert variant="default" data-testid="alert">
          Default alert
        </Alert>
      );
      expect(screen.getByTestId('alert')).toBeInTheDocument();
    });

    it('should render destructive variant', () => {
      render(
        <Alert variant="destructive" data-testid="alert">
          Error alert
        </Alert>
      );
      expect(screen.getByTestId('alert')).toBeInTheDocument();
    });

    it('should render success variant', () => {
      render(
        <Alert variant="success" data-testid="alert">
          Success alert
        </Alert>
      );
      expect(screen.getByTestId('alert')).toBeInTheDocument();
    });
  });

  describe('AlertTitle', () => {
    it('should render alert title', () => {
      render(
        <Alert>
          <AlertTitle>Alert Title</AlertTitle>
        </Alert>
      );
      expect(screen.getByText('Alert Title')).toBeInTheDocument();
    });

    it('should render as h5 element', () => {
      render(
        <Alert>
          <AlertTitle>Title</AlertTitle>
        </Alert>
      );
      const title = screen.getByText('Title');
      expect(title.tagName).toBe('H5');
    });

    it('should apply custom className', () => {
      render(
        <Alert>
          <AlertTitle className="custom-title">Title</AlertTitle>
        </Alert>
      );
      expect(screen.getByText('Title')).toHaveClass('custom-title');
    });

    it('should forward ref', () => {
      const ref = React.createRef<HTMLParagraphElement>();
      render(
        <Alert>
          <AlertTitle ref={ref}>Title</AlertTitle>
        </Alert>
      );
      expect(ref.current).toBeTruthy();
    });
  });

  describe('AlertDescription', () => {
    it('should render alert description', () => {
      render(
        <Alert>
          <AlertDescription>Alert Description</AlertDescription>
        </Alert>
      );
      expect(screen.getByText('Alert Description')).toBeInTheDocument();
    });

    it('should render as div element', () => {
      render(
        <Alert>
          <AlertDescription>Description</AlertDescription>
        </Alert>
      );
      const description = screen.getByText('Description');
      expect(description.tagName).toBe('DIV');
    });

    it('should apply custom className', () => {
      render(
        <Alert>
          <AlertDescription className="custom-desc">Description</AlertDescription>
        </Alert>
      );
      expect(screen.getByText('Description')).toHaveClass('custom-desc');
    });

    it('should forward ref', () => {
      const ref = React.createRef<HTMLParagraphElement>();
      render(
        <Alert>
          <AlertDescription ref={ref}>Description</AlertDescription>
        </Alert>
      );
      expect(ref.current).toBeTruthy();
    });

    it('should support paragraph content', () => {
      render(
        <Alert>
          <AlertDescription>
            <p>First paragraph</p>
            <p>Second paragraph</p>
          </AlertDescription>
        </Alert>
      );
      expect(screen.getByText('First paragraph')).toBeInTheDocument();
      expect(screen.getByText('Second paragraph')).toBeInTheDocument();
    });
  });

  describe('Complete Alert', () => {
    it('should render complete alert with title and description', () => {
      render(
        <Alert data-testid="complete-alert">
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>Your changes have been saved successfully.</AlertDescription>
        </Alert>
      );

      expect(screen.getByTestId('complete-alert')).toBeInTheDocument();
      expect(screen.getByText('Success')).toBeInTheDocument();
      expect(screen.getByText('Your changes have been saved successfully.')).toBeInTheDocument();
    });

    it('should render destructive alert with title and description', () => {
      render(
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Something went wrong. Please try again.</AlertDescription>
        </Alert>
      );

      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument();
    });

    it('should render success alert with title and description', () => {
      render(
        <Alert variant="success">
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>Operation completed successfully.</AlertDescription>
        </Alert>
      );

      expect(screen.getByText('Success')).toBeInTheDocument();
      expect(screen.getByText('Operation completed successfully.')).toBeInTheDocument();
    });
  });

  describe('With Icons', () => {
    it('should render alert with icon', () => {
      const TestIcon = () => <svg data-testid="alert-icon" />;
      render(
        <Alert>
          <TestIcon />
          <AlertTitle>Alert with Icon</AlertTitle>
        </Alert>
      );

      expect(screen.getByTestId('alert-icon')).toBeInTheDocument();
      expect(screen.getByText('Alert with Icon')).toBeInTheDocument();
    });

    it('should render destructive alert with icon', () => {
      const ErrorIcon = () => <svg data-testid="error-icon" />;
      render(
        <Alert variant="destructive">
          <ErrorIcon />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>An error occurred</AlertDescription>
        </Alert>
      );

      expect(screen.getByTestId('error-icon')).toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('should render success alert with icon', () => {
      const SuccessIcon = () => <svg data-testid="success-icon" />;
      render(
        <Alert variant="success">
          <SuccessIcon />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>Success message</AlertDescription>
        </Alert>
      );

      expect(screen.getByTestId('success-icon')).toBeInTheDocument();
      expect(screen.getByText('Success')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should render alert with only title', () => {
      render(
        <Alert>
          <AlertTitle>Title Only</AlertTitle>
        </Alert>
      );

      expect(screen.getByText('Title Only')).toBeInTheDocument();
    });

    it('should render alert with only description', () => {
      render(
        <Alert>
          <AlertDescription>Description Only</AlertDescription>
        </Alert>
      );

      expect(screen.getByText('Description Only')).toBeInTheDocument();
    });

    it('should render empty alert', () => {
      render(<Alert data-testid="empty-alert" />);
      expect(screen.getByTestId('empty-alert')).toBeInTheDocument();
    });

    it('should render alert with custom content', () => {
      render(
        <Alert>
          <div data-testid="custom-content">
            <h2>Custom Heading</h2>
            <p>Custom paragraph</p>
            <button>Custom Button</button>
          </div>
        </Alert>
      );

      expect(screen.getByTestId('custom-content')).toBeInTheDocument();
      expect(screen.getByText('Custom Heading')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Custom Button' })).toBeInTheDocument();
    });
  });

  describe('Composition', () => {
    it('should maintain proper structure', () => {
      render(
        <Alert data-testid="alert">
          <AlertTitle data-testid="title">Title</AlertTitle>
          <AlertDescription data-testid="description">Description</AlertDescription>
        </Alert>
      );

      const alert = screen.getByTestId('alert');
      const title = screen.getByTestId('title');
      const description = screen.getByTestId('description');

      expect(alert).toContainElement(title);
      expect(alert).toContainElement(description);
    });

    it('should support multiple alert components on the same page', () => {
      render(
        <>
          <Alert data-testid="alert-1">
            <AlertTitle>First Alert</AlertTitle>
          </Alert>
          <Alert data-testid="alert-2">
            <AlertTitle>Second Alert</AlertTitle>
          </Alert>
        </>
      );

      expect(screen.getByTestId('alert-1')).toBeInTheDocument();
      expect(screen.getByTestId('alert-2')).toBeInTheDocument();
      expect(screen.getByText('First Alert')).toBeInTheDocument();
      expect(screen.getByText('Second Alert')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have alert role', () => {
      render(<Alert>Alert</Alert>);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should support aria-describedby', () => {
      render(
        <Alert aria-describedby="alert-description" data-testid="alert">
          <AlertDescription id="alert-description">Description</AlertDescription>
        </Alert>
      );

      expect(screen.getByTestId('alert')).toHaveAttribute('aria-describedby', 'alert-description');
    });

    it('should have proper heading hierarchy', () => {
      render(
        <Alert>
          <AlertTitle>Alert Title</AlertTitle>
        </Alert>
      );

      const heading = screen.getByRole('heading', { level: 5 });
      expect(heading).toHaveTextContent('Alert Title');
    });

    it('should be readable by screen readers', () => {
      render(
        <Alert>
          <AlertTitle>Important</AlertTitle>
          <AlertDescription>Please read this message</AlertDescription>
        </Alert>
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('Important');
      expect(alert).toHaveTextContent('Please read this message');
    });
  });

  describe('Use Cases', () => {
    it('should render error alert', () => {
      render(
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to save changes. Please try again.</AlertDescription>
        </Alert>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText(/Failed to save changes/)).toBeInTheDocument();
    });

    it('should render success alert', () => {
      render(
        <Alert variant="success">
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>Your profile has been updated.</AlertDescription>
        </Alert>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Success')).toBeInTheDocument();
      expect(screen.getByText(/Your profile has been updated/)).toBeInTheDocument();
    });

    it('should render info alert', () => {
      render(
        <Alert variant="default">
          <AlertTitle>Information</AlertTitle>
          <AlertDescription>This feature is currently in beta.</AlertDescription>
        </Alert>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Information')).toBeInTheDocument();
      expect(screen.getByText(/This feature is currently in beta/)).toBeInTheDocument();
    });
  });
});
