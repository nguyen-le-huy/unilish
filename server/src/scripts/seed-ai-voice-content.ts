import mongoose from 'mongoose';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { AiVoiceTopic } from '../models/mongo/ai-voice-topic.model.js';

config({ path: resolve(process.cwd(), '.env') });

const topics = [
    {
        slug: 'free-talk', title: 'Trò chuyện tự do', description: 'Nói về những chủ đề gần gũi trong cuộc sống', icon: '✦', order: 0,
        scenarios: [
            ['Làm quen với một người bạn mới', 'Bạn là học viên đang làm quen với một người bạn mới tại câu lạc bộ tiếng Anh.'],
            ['Chia sẻ về ngày của bạn', 'Bạn là người đang kể cho một người bạn nghe về những việc đã xảy ra trong ngày.'],
            ['Nói về sở thích', 'Bạn là người đang trò chuyện với một người bạn về sở thích và hoạt động cuối tuần.'],
        ],
    },
    {
        slug: 'ielts-speaking', title: 'IELTS Speaking', description: 'Luyện phản xạ theo chủ đề IELTS', icon: '◎', order: 1,
        scenarios: [
            ['Giới thiệu bản thân', 'Bạn là thí sinh IELTS đang trả lời các câu hỏi ngắn về bản thân, quê quán và công việc hoặc học tập.'],
            ['Trình bày một trải nghiệm đáng nhớ', 'Bạn là thí sinh IELTS đang trình bày về một trải nghiệm đáng nhớ và trả lời câu hỏi mở rộng.'],
            ['Thảo luận về giáo dục', 'Bạn là thí sinh IELTS đang thảo luận quan điểm về giáo dục và việc học trong tương lai.'],
        ],
    },
    {
        slug: 'travel', title: 'Du lịch', description: 'Giao tiếp trong các chuyến đi', icon: '⌖', order: 2,
        scenarios: [
            ['Làm thủ tục nhận phòng', 'Bạn là khách du lịch đang làm thủ tục nhận phòng và hỏi về các dịch vụ của khách sạn.'],
            ['Gọi món tại nhà hàng', 'Bạn là khách đang hỏi nhân viên về thực đơn, gọi món và nêu yêu cầu ăn uống.'],
            ['Hỏi đường', 'Bạn là khách du lịch đang hỏi người dân địa phương cách đi đến một địa điểm nổi tiếng.'],
        ],
    },
    {
        slug: 'office', title: 'Công sở', description: 'Tình huống chuyên nghiệp hằng ngày', icon: '▣', order: 3,
        scenarios: [
            ['Cập nhật tiến độ công việc', 'Bạn là nhân viên đang báo cáo tiến độ, khó khăn và kế hoạch tiếp theo với quản lý.'],
            ['Sắp xếp cuộc họp', 'Bạn là đồng nghiệp đang trao đổi để chọn thời gian và nội dung cho một cuộc họp.'],
            ['Trao đổi với khách hàng', 'Bạn là nhân viên đang tiếp nhận yêu cầu và giải thích phương án xử lý cho khách hàng.'],
        ],
    },
];

const main = async () => {
    const mongoUri = process.env.MONGO_URI ?? process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('MONGO_URI or MONGODB_URI is required');

    await mongoose.connect(mongoUri);
    for (const topic of topics) {
        await AiVoiceTopic.updateOne(
            { slug: topic.slug },
            {
                $setOnInsert: {
                    ...topic,
                    isActive: true,
                    scenarios: topic.scenarios.map(([title, description], order) => ({
                        id: randomUUID(), title, description, order, isActive: true,
                    })),
                },
            },
            { upsert: true },
        );
    }
    console.log('AI Voice topics seeded without overwriting existing admin content.');
    await mongoose.disconnect();
};

main().catch(async (error: unknown) => {
    console.error(error);
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    process.exitCode = 1;
});
