// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ReadingTrueFalseNotGiven } from './ReadingTrueFalseNotGiven';
import type { ReadingDetailDto } from '../../types/ielts-practice.types';

const mockDetail: ReadingDetailDto = {
  id: 'test-2',
  slug: 'cam-20-reading-1',
  title: 'Cam 20 Reading · Test 1',
  skill: 'reading',
  questionType: 'true_false_not_given',
  itemCount: 2,
  durationMinutes: 60,
  attemptCount: 1848,
  availability: 'free',
  publishedAt: '2026-07-01T02:00:00.000Z',
  version: 1,
  content: {
    title: 'The kākāpō',
    passage: ['The kākāpō is a nocturnal, flightless parrot.', 'It is critically endangered.'],
    instruction: 'Do the following statements agree with the information in the passage?',
    statements: [
      { id: 'r-01', order: 1, text: 'The kākāpō is the only flightless parrot in the world.' },
      { id: 'r-02', order: 2, text: 'Adult kākāpō produce chicks every year.' },
    ],
  },
};

describe('ReadingTrueFalseNotGiven', () => {
  const baseProps = {
    detail: mockDetail,
    answers: {} as Record<string, string>,
    flaggedIds: [] as string[],
    onAnswerChange: vi.fn(),
    onFlagToggle: vi.fn(),
    disabled: false,
  };

  it('renders passage title', () => {
    const { container } = render(<ReadingTrueFalseNotGiven {...baseProps} />);
    expect(container.textContent).toContain(mockDetail.content.title);
  });

  it('renders passage paragraphs', () => {
    const { container } = render(<ReadingTrueFalseNotGiven {...baseProps} />);
    expect(container.textContent).toContain('nocturnal, flightless parrot');
    expect(container.textContent).toContain('critically endangered');
  });

  it('renders statements', () => {
    const { container } = render(<ReadingTrueFalseNotGiven {...baseProps} />);
    expect(container.textContent).toContain('only flightless parrot');
    expect(container.textContent).toContain('produce chicks every year');
  });

  it('renders TRUE/FALSE/NOT GIVEN choices', () => {
    const { container } = render(<ReadingTrueFalseNotGiven {...baseProps} />);
    // Each statement gets 3 radio buttons
    const radios = container.querySelectorAll('input[type="radio"]');
    expect(radios.length).toBe(6); // 2 statements x 3 choices
  });

  it('calls onAnswerChange when a choice is selected', () => {
    const { container } = render(<ReadingTrueFalseNotGiven {...baseProps} />);
    const radios = container.querySelectorAll('input[type="radio"]');
    fireEvent.click(radios[0]);
    expect(baseProps.onAnswerChange).toHaveBeenCalledWith('r-01', 'TRUE');
  });

  it('displays selected answer', () => {
    const { container } = render(
      <ReadingTrueFalseNotGiven {...{ ...baseProps, answers: { 'r-01': 'TRUE' } }} />,
    );
    const radios = container.querySelectorAll('input[type="radio"]');
    expect((radios[0] as HTMLInputElement).checked).toBe(true);
  });
});
