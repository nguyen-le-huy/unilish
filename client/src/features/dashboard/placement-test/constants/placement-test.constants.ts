export const PT_QUERY_KEYS = {
    active: (language: string) => ['placement-test', 'runtime', 'active', language] as const,
    attempt: (attemptId?: string) => ['placement-test', 'runtime', 'attempt', attemptId] as const,
    create: (placementTestId?: string) => ['placement-test', 'runtime', 'attempt', 'create', placementTestId] as const,
} as const;

export const PT_MESSAGES = {
    autosaveError: 'Đang lưu đáp án bị gián đoạn. Hệ thống sẽ tự động thử lại.',
    sessionExpired: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.',
    noActiveTest: 'Chưa có đề placement test active cho ngôn ngữ hiện tại.',
    submitSuccess: 'Nộp bài thành công. Đang quay về trang chủ.',
    submitError: 'Không thể nộp bài. Vui lòng thử lại.',
    notFoundView: 'Chưa tìm thấy đề placement test active.',
    sessionExpiredView: 'Phiên đăng nhập hết hạn. Đang chuyển tới trang đăng nhập...',
    loadErrorView: 'Không tải được bài thi đầu vào. Vui lòng thử lại sau.',
    timeUpInfo: 'Đã hết thời gian làm bài. Đang tự động nộp bài...',
} as const;
