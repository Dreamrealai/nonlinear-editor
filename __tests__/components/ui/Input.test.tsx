import React from 'react';
import { render, screen, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '@/components/ui/Input';

describe('Input', () => {
  describe('Rendering', () => {
    it('should render input with default props', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('should render input with custom className', () => {
      render(<Input className="custom-class" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('custom-class');
    });

    it('should render input with placeholder', () => {
      render(<Input placeholder="Enter text" />);
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('should render input with default value', () => {
      render(<Input defaultValue="Default text" />);
      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('Default text');
    });

    it('should render input with value', () => {
      render(<Input value="Controlled value" readOnly />);
      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('Controlled value');
    });
  });

  describe('Input Types', () => {
    it('should render text input by default', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('should render email input', () => {
      render(<Input type="email" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'email');
    });

    it('should render password input', () => {
      render(<Input type="password" />);
      const input = document.querySelector('input[type="password"]');
      expect(input).toBeInTheDocument();
    });

    it('should render number input', () => {
      render(<Input type="number" />);
      const input = screen.getByRole('spinbutton');
      expect(input).toHaveAttribute('type', 'number');
    });

    it('should render search input', () => {
      render(<Input type="search" />);
      const input = screen.getByRole('searchbox');
      expect(input).toHaveAttribute('type', 'search');
    });

    it('should render tel input', () => {
      render(<Input type="tel" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'tel');
    });

    it('should render url input', () => {
      render(<Input type="url" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'url');
    });

    it('should render date input', () => {
      render(<Input type="date" />);
      const input = document.querySelector('input[type="date"]');
      expect(input).toBeInTheDocument();
    });
  });

  describe('States', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Input disabled />);
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });

    it('should be readonly when readOnly prop is true', () => {
      render(<Input readOnly />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('readonly');
    });

    it('should be required when required prop is true', () => {
      render(<Input required />);
      const input = screen.getByRole('textbox');
      expect(input).toBeRequired();
    });

    it('should not accept input when disabled', async () => {
      const user = userEvent.setup();
      render(<Input disabled />);
      const input = screen.getByRole('textbox') as HTMLInputElement;
      await user.type(input, 'test');
      expect(input.value).toBe('');
    });

    it('should not accept input when readonly', async () => {
      const user = userEvent.setup();
      render(<Input readOnly defaultValue="readonly" />);
      const input = screen.getByRole('textbox') as HTMLInputElement;
      await user.type(input, 'test');
      expect(input.value).toBe('readonly');
    });
  });

  describe('User Interactions', () => {
    it('should update value when user types', async () => {
      const user = userEvent.setup();
      render(<Input />);
      const input = screen.getByRole('textbox') as HTMLInputElement;
      await user.type(input, 'Hello World');
      expect(input.value).toBe('Hello World');
    });

    it('should call onChange handler when value changes', async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(<Input onChange={handleChange} />);
      const input = screen.getByRole('textbox');
      await user.type(input, 'test');
      expect(handleChange).toHaveBeenCalled();
    });

    it('should call onFocus handler when focused', async () => {
      const user = userEvent.setup();
      const handleFocus = jest.fn();
      render(<Input onFocus={handleFocus} />);
      const input = screen.getByRole('textbox');
      await user.click(input);
      expect(handleFocus).toHaveBeenCalledTimes(1);
    });

    it('should call onBlur handler when blurred', async () => {
      const user = userEvent.setup();
      const handleBlur = jest.fn();
      render(<Input onBlur={handleBlur} />);
      const input = screen.getByRole('textbox');
      await user.click(input);
      await user.tab();
      expect(handleBlur).toHaveBeenCalledTimes(1);
    });

    it('should call onKeyDown handler when key is pressed', async () => {
      const user = userEvent.setup();
      const handleKeyDown = jest.fn();
      render(<Input onKeyDown={handleKeyDown} />);
      const input = screen.getByRole('textbox');
      await user.type(input, 'a');
      expect(handleKeyDown).toHaveBeenCalled();
    });

    it('should support clearing value', async () => {
      const user = userEvent.setup();
      render(<Input defaultValue="initial value" />);
      const input = screen.getByRole('textbox') as HTMLInputElement;
      await user.clear(input);
      expect(input.value).toBe('');
    });

    it('should support selecting text', async () => {
      const user = userEvent.setup();
      render(<Input defaultValue="Select me" />);
      const input = screen.getByRole('textbox') as HTMLInputElement;
      await user.tripleClick(input);
      expect(input.selectionStart).toBe(0);
      expect(input.selectionEnd).toBe(9);
    });
  });

  describe('Controlled Input', () => {
    it('should work as controlled component', async () => {
      const user = userEvent.setup();
      const ControlledInput = (): void => {
        const [value, setValue] = React.useState('');
        return <Input value={value} onChange={(e) => setValue(e.target.value)} />;
      };
      render(<ControlledInput />);
      const input = screen.getByRole('textbox') as HTMLInputElement;
      await user.type(input, 'controlled');
      expect(input.value).toBe('controlled');
    });

    it('should update when value prop changes', () => {
      const { rerender } = render(<Input value="initial" readOnly />);
      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('initial');

      rerender(<Input value="updated" readOnly />);
      expect(input.value).toBe('updated');
    });
  });

  describe('HTML Attributes', () => {
    it('should support name attribute', () => {
      render(<Input name="username" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('name', 'username');
    });

    it('should support id attribute', () => {
      render(<Input id="email-input" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('id', 'email-input');
    });

    it('should support maxLength attribute', () => {
      render(<Input maxLength={10} />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('maxLength', '10');
    });

    it('should support minLength attribute', () => {
      render(<Input minLength={5} />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('minLength', '5');
    });

    it('should support pattern attribute', () => {
      render(<Input pattern="[0-9]*" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('pattern', '[0-9]*');
    });

    it('should support autoComplete attribute', () => {
      render(<Input autoComplete="email" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('autoComplete', 'email');
    });

    it('should support autoFocus attribute', () => {
      render(<Input autoFocus />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveFocus();
    });

    it('should support aria-label', () => {
      render(<Input aria-label="Username input" />);
      const input = screen.getByRole('textbox', { name: 'Username input' });
      expect(input).toBeInTheDocument();
    });

    it('should support aria-describedby', () => {
      render(<Input aria-describedby="help-text" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'help-text');
    });

    it('should support aria-invalid', () => {
      render(<Input aria-invalid="true" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('ForwardRef', () => {
    it('should forward ref to input element', () => {
      const ref = React.createRef<HTMLInputElement>();
      render(<Input ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
      expect(ref.current?.tagName).toBe('INPUT');
    });

    it('should allow access to input methods via ref', () => {
      const ref = React.createRef<HTMLInputElement>();
      render(<Input ref={ref} />);
      expect(ref.current?.focus).toBeDefined();
      expect(ref.current?.blur).toBeDefined();
      expect(ref.current?.select).toBeDefined();
    });

    it('should allow programmatic focus via ref', () => {
      const ref = React.createRef<HTMLInputElement>();
      render(<Input ref={ref} />);
      ref.current?.focus();
      expect(ref.current).toHaveFocus();
    });
  });

  describe('Number Input', () => {
    it('should support min and max for number input', () => {
      render(<Input type="number" min={0} max={100} />);
      const input = screen.getByRole('spinbutton');
      expect(input).toHaveAttribute('min', '0');
      expect(input).toHaveAttribute('max', '100');
    });

    it('should support step for number input', () => {
      render(<Input type="number" step={5} />);
      const input = screen.getByRole('spinbutton');
      expect(input).toHaveAttribute('step', '5');
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard accessible', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('should support screen readers with aria-label', () => {
      render(<Input aria-label="Search" />);
      expect(screen.getByRole('textbox', { name: 'Search' })).toBeInTheDocument();
    });

    it('should indicate required state to screen readers', () => {
      render(<Input required aria-label="Email" />);
      const input = screen.getByRole('textbox', { name: 'Email' });
      expect(input).toBeRequired();
    });

    it('should indicate invalid state to screen readers', () => {
      render(<Input aria-invalid="true" aria-label="Email" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });
  });
});
