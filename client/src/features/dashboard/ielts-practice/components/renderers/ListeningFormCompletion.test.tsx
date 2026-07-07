// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ListeningFormCompletion } from './ListeningFormCompletion';
import type { ListeningDetailDto } from '../../types/ielts-practice.types';

const mockDetail: ListeningDetailDto = {
  id: 'test-1',
  slug: 'cam-20-listening-1',
  title: 'Cam 20 Listening · Test 1',
  skill: 'listening',
  questionType: 'form_completion',
  itemCount: 2,
  durationMinutes: 12,
  attemptCount: 472,
  availability: 'free',
  publishedAt: '2026-07-01T02:00:00.000Z',
  version: 1,
  content: {
    instruction: 'Write ONE WORD AND/OR A NUMBER for each answer.',
    heading: 'Form completion — Furniture rental',
    audio: { assetId: 'audio-1', url: 'https://example.com/audio.mp3', durationSeconds: 426 },
    items: [
      { id: 'l-01', order: 1, before: 'Prices range from $105 to $', after: 'per room per month.' },
      { id: 'l-02', order: 2, before: 'The furniture is very ', after: '.' },
    ],
  },
};

describe('ListeningFormCompletion', () => {
  const baseProps = {
    detail: mockDetail,
    answers: {} as Record<string, string>,
    flaggedIds: [] as string[],
    onAnswerChange: vi.fn(),
    onFlagToggle: vi.fn(),
    disabled: false,
  };

  it('renders the instruction text', () => {
    const { container } = render(<ListeningFormCompletion {...baseProps} />);
    expect(container.textContent).toContain(mockDetail.content.instruction);
  });

  it('renders item content with before text', () => {
    const { container } = render(<ListeningFormCompletion {...baseProps} />);
    expect(container.textContent).toContain('Prices range from $105 to $');
  });

  it('renders answer inputs for items', () => {
    const { container } = render(<ListeningFormCompletion {...baseProps} />);
    // Should have 2 text inputs for 2 items
    const inputs = container.querySelectorAll('input[type="text"], input:not([type="range"])');
    expect(inputs.length).toBe(2);
  });

  it('calls onAnswerChange when user types', () => {
    const { container } = render(<ListeningFormCompletion {...baseProps} />);
    const inputs = container.querySelectorAll('input[type="text"], input:not([type="range"])');
    fireChange(inputs[0], '125');
    expect(baseProps.onAnswerChange).toHaveBeenCalledWith('l-01', '125');
  });

  it('displays existing answers', () => {
    const { container } = render(
      <ListeningFormCompletion {...{ ...baseProps, answers: { 'l-01': '125' } }} />,
    );
    const inputs = container.querySelectorAll('input[type="text"], input:not([type="range"])');
    expect((inputs[0] as HTMLInputElement).value).toBe('125');
  });

  it('disables inputs when disabled is true', () => {
    const { container } = render(
      <ListeningFormCompletion {...{ ...baseProps, disabled: true }} />,
    );
    const inputs = container.querySelectorAll('input');
    inputs.forEach((input) => expect((input as HTMLInputElement).disabled).toBe(true));
  });

  it('renders audio play button', () => {
    const { container } = render(<ListeningFormCompletion {...baseProps} />);
    const playBtn = container.querySelector('button');
    expect(playBtn).toBeTruthy();
  });

  it('renders flag buttons', () => {
    const { container } = render(<ListeningFormCompletion {...baseProps} />);
    // Each item has a flag button, plus the play button
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });
});

function fireChange(element: Element, value: string) {
  fireEvent.change(element, { target: { value } });
}
