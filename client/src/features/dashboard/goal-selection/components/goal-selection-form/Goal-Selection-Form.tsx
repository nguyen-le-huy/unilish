import { useState } from 'react';
import styles from './goal-selection-form.module.css';
import SelectionCard from '@/components/core/SelectionCard/SelectionCard';
import SelectionForm from '@/components/core/SelectionForm/SelectionForm';
import planeIcon from '@/assets/icons/plane.svg';

const GOALS = [
    { id: 'travel', icon: planeIcon, title: 'Du lịch & Sinh tồn', description: 'Lộ trình giao tiếp cấp tốc giúp bạn tự tin xử lý mọi tình huống thực tế khi đi du lịch hoặc công tác nước ngoài.' },
    { id: 'business', icon: planeIcon, title: 'Kinh doanh & Công việc', description: 'Nâng cao kỹ năng giao tiếp chuyên nghiệp trong môi trường công sở và đàm phán quốc tế.' },
    { id: 'academic', icon: planeIcon, title: 'Học thuật & Thi cử', description: 'Chuẩn bị cho các kỳ thi quốc tế như IELTS, TOEFL, SAT với lộ trình học bài bản.' },
    { id: 'daily', icon: planeIcon, title: 'Giao tiếp hàng ngày', description: 'Xây dựng vốn từ vựng và phản xạ ngôn ngữ tự nhiên trong các tình huống đời thường.' },
    { id: 'culture', icon: planeIcon, title: 'Văn hóa & Giải trí', description: 'Khám phá văn hóa qua phim, âm nhạc, sách và các nội dung giải trí bằng tiếng Anh.' },
    { id: 'kids', icon: planeIcon, title: 'Dành cho trẻ em', description: 'Phương pháp học vui nhộn, phù hợp lứa tuổi giúp trẻ tiếp thu ngôn ngữ tự nhiên.' },
] as const;

const GoalSelectionForm = () => {
    const [selectedId, setSelectedId] = useState<string | null>(null);

    return (
        <SelectionForm
            title="Chọn mục tiêu học tập của bạn"
            subtitle="Hãy chọn mục tiêu học tập bạn mong muốn, bạn có thể thay đổi lựa chọn này sau."
            primaryAction={{ label: 'Tiếp tục', disabled: !selectedId }}
        >
            <div className={styles.cardGrid}>
                {GOALS.map((goal) => (
                    <SelectionCard
                        key={goal.id}
                        icon={<img src={goal.icon} alt="" width={24} height={24} />}
                        title={goal.title}
                        description={goal.description}
                        selected={selectedId === goal.id}
                        onClick={() => setSelectedId(goal.id)}
                    />
                ))}
            </div>
        </SelectionForm>
    );
};

export default GoalSelectionForm;