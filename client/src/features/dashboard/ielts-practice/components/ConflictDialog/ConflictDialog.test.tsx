// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import ConflictDialog from './ConflictDialog';

describe('ConflictDialog', () => {
  const baseProps = {
    open: true,
    latestRevision: 5,
    savedAt: '2026-07-06T12:00:00.000Z',
    onUseLocal: vi.fn(),
    onUseServer: vi.fn(),
  };

  it('renders nothing when closed', () => {
    const { container } = render(<ConflictDialog {...baseProps} open={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('shows conflict info with revision number', () => {
    const { container } = render(<ConflictDialog {...baseProps} />);
    expect(container.textContent).toContain('Xung đột dữ liệu');
    expect(container.textContent).toContain('v5');
  });

  it('calls onUseLocal when local button clicked', () => {
    const { container } = render(<ConflictDialog {...baseProps} />);
    const buttons = container.querySelectorAll('button');
    const localBtn = Array.from(buttons).find((b) => b.textContent?.includes('Giữ bản của tôi'))!;
    fireEvent.click(localBtn);
    expect(baseProps.onUseLocal).toHaveBeenCalledTimes(1);
  });

  it('calls onUseServer when server button clicked', () => {
    const { container } = render(<ConflictDialog {...baseProps} />);
    const buttons = container.querySelectorAll('button');
    const serverBtn = Array.from(buttons).find((b) => b.textContent?.includes('Tải bản mới nhất'))!;
    fireEvent.click(serverBtn);
    expect(baseProps.onUseServer).toHaveBeenCalledTimes(1);
  });

  it('renders content', () => {
    const { container } = render(<ConflictDialog {...baseProps} />);
    expect(container.textContent).toContain('Xung đột dữ liệu');
  });
});
