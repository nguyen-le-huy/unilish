import { apiPostUnwrappedEnvelope } from '@/lib/axios';
import type { EnrollmentDto } from '../types/learning.types';

export const enrollCourse = async (courseId: string): Promise<EnrollmentDto> => {
    return apiPostUnwrappedEnvelope<EnrollmentDto>(
        `/learning/courses/${courseId}/enroll`,
        {},
        {
            headers: {
                'Idempotency-Key': crypto.randomUUID(),
            },
        },
    );
};
