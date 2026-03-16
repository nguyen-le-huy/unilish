import a1Icon from '@/assets/icons/A1.svg';
import a2Icon from '@/assets/icons/A2.svg';
import b1Icon from '@/assets/icons/B1.svg';
import b2Icon from '@/assets/icons/B2.svg';
import type { LevelItem } from '../types/level';

export const ERROR_MISSING_LANGUAGE = 'Vui lòng chọn ngôn ngữ trước khi chọn trình độ.';
export const ERROR_MISSING_GOAL = 'Vui lòng chọn mục tiêu học tập trước khi chọn trình độ.';
export const ERROR_ONBOARDING_FAILED = 'Không thể hoàn thành thiết lập. Vui lòng thử lại.';

export const LEVELS: LevelItem[] = [
	{
		id: 'a1',
		cefrLevel: 'A1',
		icon: a1Icon,
		title: 'A1 - Cơ bản',
		description:
			'Bạn mới bắt đầu học tiếng Anh. Có thể hiểu và sử dụng những câu đơn giản trong giao tiếp hằng ngày (chào hỏi, giới thiệu bản thân, hỏi thông tin).',
	},
	{
		id: 'a2',
		cefrLevel: 'A2',
		icon: a2Icon,
		title: 'A2 - Sơ cấp',
		description:
			'Bạn có thể giao tiếp trong các tình huống quen thuộc như mua sắm, hỏi đường, công việc đơn giản. Hiểu các đoạn hội thoại ngắn, rõ ràng.',
	},
	{
		id: 'b1',
		cefrLevel: 'B1',
		icon: b1Icon,
		title: 'B1 - Trung cấp',
		description:
			'Bạn có thể xử lý hầu hết tình huống khi đi du lịch hoặc làm việc cơ bản. Có thể diễn đạt ý kiến, kể chuyện và viết đoạn văn đơn giản.',
	},
	{
		id: 'b2',
		cefrLevel: 'B2',
		icon: b2Icon,
		title: 'B2 - Trung cao cấp',
		description:
			'Bạn giao tiếp khá trôi chảy và tự nhiên với người bản xứ. Có thể thảo luận chủ đề chuyên môn, trình bày quan điểm rõ ràng và chi tiết.',
	},
];
