// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import SaveStatus from './SaveStatus';

describe('SaveStatus', () => {
  it('renders saving state with spinner', () => {
    const { container } = render(<SaveStatus state="saving" />);
    expect(container.textContent).toContain('Đang lưu…');
    expect(container.querySelector('[role="status"]')).toBeTruthy();
  });

  it('renders nothing for saved state', () => {
    const { container } = render(<SaveStatus state="saved" />);
    expect(container.textContent).toBe('');
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it('renders nothing for unsynced state', () => {
    const { container } = render(<SaveStatus state="unsynced" />);
    expect(container.textContent).toBe('');
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it('renders conflict state', () => {
    const { container } = render(<SaveStatus state="conflict" />);
    expect(container.textContent).toContain('Xung đột');
  });

  it('renders nothing for idle state', () => {
    const { container } = render(<SaveStatus state="idle" />);
    expect(container.textContent).toBe('');
  });

  it('has accessible live region', () => {
    const { container } = render(<SaveStatus state="saving" />);
    const liveRegions = container.querySelectorAll('[aria-live="polite"]');
    expect(liveRegions.length).toBeGreaterThanOrEqual(1);
  });
});
