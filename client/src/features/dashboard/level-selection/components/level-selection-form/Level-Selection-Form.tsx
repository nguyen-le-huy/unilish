import { useState } from 'react';
import styles from './level-selection-form.module.css';
import SelectionCard from '@/components/core/SelectionCard/SelectionCard';
import SelectionForm from '@/components/core/SelectionForm/SelectionForm';
import a1Icon from '@/assets/icons/A1.svg';
import a2Icon from '@/assets/icons/A2.svg';
import b1Icon from '@/assets/icons/B1.svg';
import b2Icon from '@/assets/icons/B2.svg';

interface LevelItem {
	id: string;
	icon: string;
	title: string;
	description: string;
}

const LEVELS: LevelItem[] = [
	{
		id: 'a1',
		icon: a1Icon,
		title: 'A1 – Cơ bản',
		description:
			'Bạn mới bắt đầu học tiếng Anh. Có thể hiểu và sử dụng những câu đơn giản trong giao tiếp hằng ngày (chào hỏi, giới thiệu bản thân, hỏi thông tin).',
	},
	{
		id: 'a2',
		icon: a2Icon,
		title: 'A2 – Sơ cấp',
		description:
			'Bạn có thể giao tiếp trong các tình huống quen thuộc như mua sắm, hỏi đường, công việc đơn giản. Hiểu các đoạn hội thoại ngắn, rõ ràng.',
	},
	{
		id: 'b1',
		icon: b1Icon,
		title: 'B1 – Trung cấp',
		description:
			'Bạn có thể xử lý hầu hết tình huống khi đi du lịch hoặc làm việc cơ bản. Có thể diễn đạt ý kiến, kể chuyện và viết đoạn văn đơn giản.',
	},
	{
		id: 'b2',
		icon: b2Icon,
		title: 'B2 – Trung cao cấp',
		description:
			'Bạn giao tiếp khá trôi chảy và tự nhiên với người bản xứ. Có thể thảo luận chủ đề chuyên môn, trình bày quan điểm rõ ràng và chi tiết.',
	},
];

const LevelSelectionForm = () => {
	const [selectedId, setSelectedId] = useState<string | null>(null);

	return (
		<SelectionForm
			title="Chọn trình độ tiếng Anh của bạn"
			subtitle="Hãy chọn trình độ hiện tại của bạn theo khung tham chiếu CEFR (A1–C2) hoặc bạn có thể làm bài kiểm tra đầu vào để được đánh giá chính xác hơn."
			primaryAction={{ label: 'Tiếp tục', disabled: !selectedId }}
			secondaryAction={{ label: 'Làm bài kiểm tra đầu vào' }}
		>
			<div className={styles.cardGrid}>
				{LEVELS.map((level) => (
					<SelectionCard
						key={level.id}
						icon={<img src={level.icon} alt="" width={50} height={50} />}
						title={level.title}
						description={level.description}
						selected={selectedId === level.id}
						iconBackground={false}
						onClick={() => setSelectedId(level.id)}
					/>
				))}
			</div>
		</SelectionForm>
	);
};

export default LevelSelectionForm;
