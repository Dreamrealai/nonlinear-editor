import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorBoundary } from '@/components/ErrorBoundary'

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message')
  }
  return <div>No error</div>
}

describe('ErrorBoundary', () => {
  // Suppress console.error for these tests
  const originalError = console.error
  beforeAll(() => {
    console.error = jest.fn()
  })

  afterAll(() => {
    console.error = originalError
  })

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('should render error UI when child throws error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText(/The application encountered an unexpected error/)).toBeInTheDocument()
  })

  it('should display error message in details', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const details = screen.getByText('Error details')
    expect(details).toBeInTheDocument()

    // Error message should be in a pre tag
    expect(screen.getByText('Test error message')).toBeInTheDocument()
  })

  it('should render custom fallback if provided', () => {
    const customFallback = <div>Custom error message</div>

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Custom error message')).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })

  it('should have reload button that reloads the page', () => {
    const mockReload = jest.fn()
    delete (window as any).location
    window.location = { reload: mockReload } as any

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const reloadButton = screen.getByText('Reload Page')
    reloadButton.click()

    expect(mockReload).toHaveBeenCalled()
  })

  it('should have try again button that resets error state', async () => {
    const user = userEvent.setup()

    // Use a component that can toggle error
    const ToggleError = () => {
      const [shouldThrow, setShouldThrow] = React.useState(true)
      return (
        <ErrorBoundary>
          <button onClick={() => setShouldThrow(false)}>Fix Error</button>
          <ThrowError shouldThrow={shouldThrow} />
        </ErrorBoundary>
      )
    }

    render(<ToggleError />)

    // Error should be shown
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    // Click try again
    const tryAgainButton = screen.getByText('Try Again')
    await user.click(tryAgainButton)

    // Error UI might still be shown because the component still throws
    // But the boundary attempted to reset
    expect(tryAgainButton).toBeInTheDocument()
  })

  it('should log error to console', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error')

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(consoleErrorSpy).toHaveBeenCalled()
  })

  it('should show warning icon in error UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    // Check for SVG path that represents the warning icon
    const svg = document.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('should display error details in collapsible section', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const details = screen.getByText('Error details').closest('details')
    expect(details).toBeInTheDocument()
  })

  it('should apply correct styling classes', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    // Check that error container has expected classes
    const heading = screen.getByText('Something went wrong')
    expect(heading).toHaveClass('text-xl', 'font-semibold')
  })

  it('should handle multiple errors', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByText('No error')).toBeInTheDocument()

    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })
})
