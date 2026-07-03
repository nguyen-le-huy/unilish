import fs from 'fs';
import mongoose from 'mongoose';
import { Lesson } from '../models/mongo/lesson.model.js';

interface NestedPracticeConfig {
    mode?: string;
    questionIds?: Array<string | mongoose.Types.ObjectId>;
    passingScore?: number;
}

interface LessonDoc {
    _id: mongoose.Types.ObjectId;
    type: string;
    practiceConfig?: NestedPracticeConfig | null;
    content?: {
        practiceConfig?: NestedPracticeConfig | null;
    } | null;
}

function resolveMongoUri(): string {
    const envPath = new URL('../../.env', import.meta.url);
    const raw = fs.readFileSync(envPath, 'utf8');
    const match = raw.match(/^(MONGO_URI|MONGODB_URI)=(.*)$/m);
    if (!match?.[2]) {
        throw new Error('Missing MONGO_URI in server/.env');
    }
    return match[2];
}

function hasQuestionIds(config: NestedPracticeConfig | null | undefined): boolean {
    return Array.isArray(config?.questionIds) && config.questionIds.length > 0;
}

async function main() {
    const uri = resolveMongoUri();
    await mongoose.connect(uri, { dbName: 'test' });

    const lessons = await Lesson.find({
        'content.practiceConfig.questionIds.0': { $exists: true },
    })
        .select('_id type practiceConfig content.practiceConfig')
        .lean()
        .exec() as LessonDoc[];

    let updatedCount = 0;

    for (const lesson of lessons) {
        const nested = lesson.content?.practiceConfig;
        if (!hasQuestionIds(nested)) {
            continue;
        }

        const topLevel = lesson.practiceConfig;
        const topLevelLooksStale =
            !hasQuestionIds(topLevel)
            || topLevel?.mode === 'DYNAMIC'
            || topLevel?.passingScore !== nested?.passingScore;

        if (!topLevelLooksStale) {
            continue;
        }

        await Lesson.updateOne(
            { _id: lesson._id },
            {
                $set: {
                    practiceConfig: {
                        mode: nested?.mode ?? 'FIXED',
                        questionIds: nested?.questionIds ?? [],
                        passingScore: nested?.passingScore ?? 80,
                    },
                },
            },
        ).exec();

        updatedCount += 1;
    }

    console.log(`Updated ${updatedCount} lesson(s).`);
    await mongoose.disconnect();
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
