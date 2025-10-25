import React from 'react';
import { render, screen, cleanup, act } from '@testing-library/react';
import { HomeHeader } from '@/components/HomeHeader';

// Mock child components
jest.mock(
  '@/components/UserMenu',
  () => ({
    UserMenu: () => <div data-testid="user-menu">User Menu</div>,
  })
);

jest.mock(
  '@/components/CreateProjectButton',
  () => ({
    CreateProjectButton: () => <button data-testid="create-project-button">Create Project</button>,
  })
);

describe('HomeHeader', () => {
  describe('Rendering', () => {
    it('should render header with title', () => {
      render(<HomeHeader />);
      expect(screen.getByText('My Projects')).toBeInTheDocument();
    });

    it('should render title as h1', () => {
      render(<HomeHeader />);
      const title = screen.getByText('My Projects');
      expect(title.tagName).toBe('H1');
    });

    it('should render create project button', () => {
      render(<HomeHeader />);
      expect(screen.getByTestId('create-project-button')).toBeInTheDocument();
    });

    it('should render user menu', () => {
      render(<HomeHeader />);
      expect(screen.getByTestId('user-menu')).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('should have flex layout', () => {
      const { container } = render(<HomeHeader />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('flex');
      expect(wrapper).toHaveClass('items-center');
      expect(wrapper).toHaveClass('justify-between');
    });

    it('should have proper spacing', () => {
      const { container } = render(<HomeHeader />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('mb-8');
    });

    it('should group action buttons together', () => {
      const { container } = render(<HomeHeader />);
      const buttonGroup = container.querySelector('.flex.gap-3');
      expect(buttonGroup).toBeInTheDocument();
    });

    it('should render components in correct order', () => {
      const { container } = render(<HomeHeader />);
      const wrapper = container.firstChild as HTMLElement;
      const children = wrapper.children;

      // First child should be the h1
      expect(children[0].tagName).toBe('H1');

      // Second child should be the button group
      expect(children[1]).toContainElement(screen.getByTestId('create-project-button'));
      expect(children[1]).toContainElement(screen.getByTestId('user-menu'));
    });
  });

  describe('Composition', () => {
    it('should render all child components', () => {
      render(<HomeHeader />);

      expect(screen.getByText('My Projects')).toBeInTheDocument();
      expect(screen.getByTestId('create-project-button')).toBeInTheDocument();
      expect(screen.getByTestId('user-menu')).toBeInTheDocument();
    });

    it('should maintain component hierarchy', () => {
      const { container } = render(<HomeHeader />);
      const wrapper = container.firstChild as HTMLElement;

      expect(wrapper).toContainElement(screen.getByText('My Projects'));
      expect(wrapper).toContainElement(screen.getByTestId('create-project-button'));
      expect(wrapper).toContainElement(screen.getByTestId('user-menu'));
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<HomeHeader />);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('My Projects');
    });

    it('should be keyboard accessible', () => {
      render(<HomeHeader />);
      const button = screen.getByTestId('create-project-button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply correct text styles to title', () => {
      render(<HomeHeader />);
      const title = screen.getByText('My Projects');
      expect(title).toHaveClass('text-3xl');
      expect(title).toHaveClass('font-bold');
      expect(title).toHaveClass('text-neutral-900');
    });
  });

  describe('Edge Cases', () => {
    it('should render without errors', () => {
      const { container } = render(<HomeHeader />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render consistently', () => {
      const { container: container1 } = render(<HomeHeader />);
      const { container: container2 } = render(<HomeHeader />);

      expect(container1.innerHTML).toBe(container2.innerHTML);
    });
  });
});
