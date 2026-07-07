// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import SubmitDialog from './SubmitDialog';

describe('SubmitDialog', () => {
  const baseProps = {
    open: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    answeredCount: 7,
    totalCount: 10,
    skillLabel: 'Listening',
  };

  it('renders nothing when closed', () => {
    const { container } = render(<SubmitDialog {...baseProps} open={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('shows the title', () => {
    const { container } = render(<SubmitDialog {...baseProps} />);
    expect(container.textContent).toContain('Xác nhận nộp bài?');
  });

  it('calls onConfirm when confirm button clicked', () => {
    const { container } = render(<SubmitDialog {...baseProps} />);
    const buttons = container.querySelectorAll('button');
    // Last button is confirm
    const confirmBtn = buttons[buttons.length - 1];
    fireEvent.click(confirmBtn);
    expect(baseProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when cancel button clicked', () => {
    const { container } = render(<SubmitDialog {...baseProps} />);
    const buttons = container.querySelectorAll('button');
    // First button is cancel
    const cancelBtn = buttons[0];
    fireEvent.click(cancelBtn);
    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('disables buttons when submitting', () => {
    const { container } = render(<SubmitDialog {...baseProps} isSubmitting />);
    const buttons = container.querySelectorAll('button');
    buttons.forEach((btn) => {
      expect((btn as HTMLButtonElement).disabled).toBe(true);
    });
  });

  it('shows warning when below word count', () => {
    const { container } = render(<SubmitDialog {...baseProps} wordCount={80} minWords={150} />);
    expect(container.textContent).toContain('chưa đạt số từ tối thiểu');
  });

  it('shows error message when provided', () => {
    const { container } = render(<SubmitDialog {...baseProps} error="Network error" />);
    expect(container.textContent).toContain('Network error');
  });
});
