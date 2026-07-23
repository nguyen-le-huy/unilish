import type { EnrollmentDto } from '../../learning/types/learning.types';

export const getJoinLabel = (enrollment: EnrollmentDto | undefined, isJoining: boolean) => {
    if (isJoining) return 'Đang tham gia...';
    if (enrollment?.status === 'ACTIVE') return 'Đang tham gia';
    if (enrollment?.status === 'PAUSED') return 'Tiếp tục học';
    if (enrollment?.status === 'COMPLETED') return 'Đã hoàn thành';
    return 'Tham gia';
};
