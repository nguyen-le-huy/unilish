// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { WritingTaskOneChart } from './WritingTaskOneChart';
import type { WritingDetailDto } from '../../types/ielts-practice.types';

const mockDetail: WritingDetailDto = {
  id: 'test-3',
  slug: 'cam-20-writing-1',
  title: 'Cam 20 Writing · Test 1',
  skill: 'writing',
  questionType: 'academic_task_1_chart',
  itemCount: 1,
  durationMinutes: 20,
  attemptCount: 328,
  availability: 'free',
  publishedAt: '2026-07-01T02:00:00.000Z',
  version: 1,
  content: {
    prompt: 'The chart below shows the percentage of water used for different agricultural products.',
    instruction: 'Summarise the information by selecting and reporting the main features.',
    image: { assetId: 'img-1', url: 'https://example.com/chart.png', alt: 'Water usage chart' },
    minWords: 150,
  },
};

describe('WritingTaskOneChart', () => {
  const baseProps = {
    detail: mockDetail,
    essay: '',
    onEssayChange: vi.fn(),
    disabled: false,
  };

  it('renders the prompt text', () => {
    const { container } = render(<WritingTaskOneChart {...baseProps} />);
    expect(container.textContent).toContain('percentage of water used');
  });

  it('renders the instruction text', () => {
    const { container } = render(<WritingTaskOneChart {...baseProps} />);
    expect(container.textContent).toContain('Summarise the information');
  });

  it('renders the min words requirement', () => {
    const { container } = render(<WritingTaskOneChart {...baseProps} />);
    expect(container.textContent).toContain('150');
    expect(container.textContent).toContain('words');
  });

  it('renders the chart image with alt text', () => {
    const { container } = render(<WritingTaskOneChart {...baseProps} />);
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('alt')).toBe('Water usage chart');
    expect(img?.getAttribute('src')).toContain('chart.png');
  });

  it('renders the essay textarea', () => {
    const { container } = render(<WritingTaskOneChart {...baseProps} />);
    const textarea = container.querySelector('textarea');
    expect(textarea).toBeTruthy();
  });

  it('displays current word count as 0 when essay is empty', () => {
    const { container } = render(<WritingTaskOneChart {...baseProps} />);
    expect(container.textContent).toContain('0 từ');
  });

  it('displays correct word count', () => {
    const { container } = render(
      <WritingTaskOneChart {...{ ...baseProps, essay: 'The two charts compare data.' }} />,
    );
    expect(container.textContent).toContain('5 từ');
  });

  it('calls onEssayChange when user types', () => {
    const { container } = render(<WritingTaskOneChart {...baseProps} />);
    const textarea = container.querySelector('textarea')!;
    fireEvent.change(textarea, { target: { value: 'The chart shows' } });
    expect(baseProps.onEssayChange).toHaveBeenCalledWith('The chart shows');
  });

  it('disables textarea when disabled is true', () => {
    const { container } = render(
      <WritingTaskOneChart {...{ ...baseProps, disabled: true }} />,
    );
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.disabled).toBe(true);
  });
});
