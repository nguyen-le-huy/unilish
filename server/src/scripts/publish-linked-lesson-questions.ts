/**
 * Publish legacy questions that are already linked to a Lesson practice config.
 *
 * Course Studio historically created and attached questions without assigning a
 * publication status. The learner API intentionally returns published questions
 * only, so those linked legacy questions were treated as an empty exercise.
 *
 * Usage:
 *   npx tsx src/scripts/publish-linked-lesson-questions.ts --dry-run
 *   npx tsx src/scripts/publish-linked-lesson-questions.ts --yes
 *
 * The script is idempotent and only changes linked questions whose status is
 * missing, null, or draft. Questions in review or archived remain untouched.
 */

import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Lesson } from '../models/mongo/lesson.model.js';
import { EQuestionStatus, Question } from '../models/mongo/question.model.js';
import { resolveEffectivePracticeConfig } from '../utils/lesson-practice-config.js';

interface LessonPracticeProjection {
    _id: mongoose.Types.ObjectId;
    practiceConfig?: {
        mode?: string;
        questionIds?: Array<string | mongoose.Types.ObjectId>;
        passingScore?: number;
    } | null;
    content?: Record<string, unknown> | null;
}

async function main(): Promise<void> {
    const isDryRun = process.argv.includes('--dry-run');
    const isConfirmed = process.argv.includes('--yes');

    if (!isDryRun && !isConfirmed) {
        throw new Error('Live run requires --yes. Use --dry-run to inspect first.');
    }

    await mongoose.connect(env.MONGO_URI);

    try {
        const lessons = await Lesson.find({})
            .select('_id practiceConfig content.practiceConfig')
            .lean()
            .exec() as LessonPracticeProjection[];

        const linkedIds = new Set<string>();
        for (const lesson of lessons) {
            const config = resolveEffectivePracticeConfig({
                practiceConfig: lesson.practiceConfig,
                content: lesson.content,
            });

            for (const questionId of config.questionIds) {
                linkedIds.add(questionId.toString());
            }
        }

        const objectIds = [...linkedIds].map((id) => new mongoose.Types.ObjectId(id));
        const publishableFilter = {
            _id: { $in: objectIds },
            $or: [
                { status: { $exists: false } },
                { status: null },
                { status: EQuestionStatus.DRAFT },
            ],
        };

        const affectedCount = await Question.countDocuments(publishableFilter).exec();

        console.log(JSON.stringify({
            mode: isDryRun ? 'dry-run' : 'live',
            linkedQuestionCount: linkedIds.size,
            publishableQuestionCount: affectedCount,
        }));

        if (isDryRun || affectedCount === 0) {
            return;
        }

        const result = await Question.updateMany(
            publishableFilter,
            { $set: { status: EQuestionStatus.PUBLISHED } },
        ).exec();

        console.log(JSON.stringify({ modifiedQuestionCount: result.modifiedCount }));
    } finally {
        await mongoose.disconnect();
    }
}

main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown migration error';
    console.error(message);
    process.exitCode = 1;
});
