import { describe, expect, it } from 'vitest';
import type { EnrollmentDto } from '../../learning/types/learning.types';
import { getJoinLabel } from './recommend-course.utils';

const enrollment = (status: EnrollmentDto['status']): EnrollmentDto => ({
    enrollmentId: 'enrollment-1',
    courseId: 'course-1',
    status,
    completedLessonCount: 0,
    totalRequiredLessonCount: 2,
    timeSpentSeconds: 0,
    startedAt: '2026-07-23T00:00:00.000Z',
    completedAt: null,
});

describe('getJoinLabel', () => {
    it('shows the current enrollment state for recommended courses', () => {
        expect(getJoinLabel(enrollment('ACTIVE'), false)).toBe('Đang tham gia');
        expect(getJoinLabel(enrollment('PAUSED'), false)).toBe('Tiếp tục học');
        expect(getJoinLabel(enrollment('COMPLETED'), false)).toBe('Đã hoàn thành');
        expect(getJoinLabel(undefined, false)).toBe('Tham gia');
        expect(getJoinLabel(undefined, true)).toBe('Đang tham gia...');
    });
});
