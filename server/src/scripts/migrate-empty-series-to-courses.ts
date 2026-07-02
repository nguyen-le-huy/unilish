/**
 * Converts CourseSeries without child Courses into standalone Courses.
 *
 * Series that already own child Courses are skipped because the existing
 * Course migration preserves their Unit/Lesson content without creating a
 * duplicate parent Course.
 *
 * Safety:
 * - Idempotent by source Series _id and slug.
 * - Preserves the Series _id on the generated Course.
 * - Never deletes or mutates the courseseries collection.
 * - Creates a JSON backup and rollback manifest before a live run.
 */

import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { env } from '../config/env.js';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
type CourseLevel = (typeof LEVELS)[number];

const LEVEL_ORDER: Record<CourseLevel, number> = {
    A1: 1,
    A2: 2,
    B1: 3,
    B2: 4,
    C1: 5,
    C2: 6,
};

interface RawSeries {
    _id: mongoose.Types.ObjectId;
    languageId?: mongoose.Types.ObjectId;
    learningGoalId?: mongoose.Types.ObjectId;
    title?: string;
    slug?: string;
    description?: string | null;
    thumbnailUrl?: string | null;
    isActive?: boolean;
    aiCache?: {
        analysis?: {
            levelMin?: string;
            levelMax?: string;
        };
    } | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface ProposedCourse {
    _id: mongoose.Types.ObjectId;
    sourceSeriesId: string;
    languageId: mongoose.Types.ObjectId;
    learningGoalId: mongoose.Types.ObjectId;
    name: string;
    slug: string;
    description: string | null;
    thumbnailUrl: string | null;
    level: CourseLevel;
    orderIndex: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

interface InvalidSeries {
    seriesId: string;
    title: string;
    reason: string;
}

const normalizeLevel = (value: unknown): CourseLevel | null => {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().toUpperCase();
    return LEVELS.includes(normalized as CourseLevel) ? normalized as CourseLevel : null;
};

const deriveLevel = (series: RawSeries): CourseLevel | null => {
    const slugMatch = series.slug?.match(/(?:^|-)(a1|a2|b1|b2|c1|c2)$/i)?.[1];
    const slugLevel = normalizeLevel(slugMatch);
    if (slugLevel) return slugLevel;

    const titleMatches = series.title?.toUpperCase().match(/\b(A1|A2|B1|B2|C1|C2)\b/g);
    if (titleMatches && titleMatches.length > 0) {
        return normalizeLevel(titleMatches[titleMatches.length - 1]);
    }

    return normalizeLevel(series.aiCache?.analysis?.levelMax)
        ?? normalizeLevel(series.aiCache?.analysis?.levelMin);
};

const ensureDir = (dir: string): void => {
    fs.mkdirSync(dir, { recursive: true });
};

const writeJson = (file: string, value: unknown): void => {
    fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8');
};

const defaultFinalExamConfig = {
    durationMinutes: 60,
    passScore: 65,
    structureMatrix: {
        vocabCount: 0,
        grammarCount: 0,
        readingTaskCount: 0,
        listeningTaskCount: 0,
        writingTaskCount: 0,
        speakingTaskCount: 0,
    },
    questionPool: {
        readingLessonIds: [],
        listeningLessonIds: [],
    },
};

async function run(dryRun: boolean, confirmed: boolean): Promise<void> {
    console.log('\nConnecting to MongoDB...');
    await mongoose.connect(env.MONGO_URI);

    const db = mongoose.connection.db;
    if (!db) throw new Error('MongoDB connection is not ready');

    const seriesCollection = db.collection<RawSeries>('courseseries');
    const courseCollection = db.collection('courses');
    const [series, courses] = await Promise.all([
        seriesCollection.find({}).toArray(),
        courseCollection.find({}).toArray(),
    ]);

    const childSeriesIds = new Set(
        courses
            .map((course) => course.seriesId)
            .filter((value): value is mongoose.Types.ObjectId => value instanceof mongoose.Types.ObjectId)
            .map(String),
    );
    const existingIds = new Set(courses.map((course) => String(course._id)));
    const existingSlugs = new Set(
        courses.map((course) => course.slug).filter((slug): slug is string => typeof slug === 'string'),
    );
    const occupiedCompoundKeys = new Set(
        courses
            .filter((course) => course.languageId && course.learningGoalId && course.level && course.orderIndex)
            .map((course) => [
                String(course.languageId),
                String(course.learningGoalId),
                String(course.level),
                String(course.orderIndex),
            ].join('::')),
    );

    const proposed: ProposedCourse[] = [];
    const invalid: InvalidSeries[] = [];
    let skippedWithChildren = 0;
    let skippedAlreadyConverted = 0;

    for (const source of series) {
        const sourceId = String(source._id);
        const title = source.title?.trim() || '(untitled)';

        if (childSeriesIds.has(sourceId)) {
            skippedWithChildren++;
            continue;
        }

        if (existingIds.has(sourceId) || (source.slug && existingSlugs.has(source.slug))) {
            skippedAlreadyConverted++;
            continue;
        }

        if (!source.languageId || !source.learningGoalId || !source.title || !source.slug) {
            invalid.push({ seriesId: sourceId, title, reason: 'Missing languageId, learningGoalId, title, or slug' });
            continue;
        }

        const level = deriveLevel(source);
        if (!level) {
            invalid.push({ seriesId: sourceId, title, reason: 'Cannot derive A1-C2 level' });
            continue;
        }

        let orderIndex = LEVEL_ORDER[level];
        let compoundKey = [String(source.languageId), String(source.learningGoalId), level, orderIndex].join('::');
        while (occupiedCompoundKeys.has(compoundKey)) {
            orderIndex++;
            compoundKey = [String(source.languageId), String(source.learningGoalId), level, orderIndex].join('::');
        }
        occupiedCompoundKeys.add(compoundKey);
        existingIds.add(sourceId);
        existingSlugs.add(source.slug);

        proposed.push({
            _id: source._id,
            sourceSeriesId: sourceId,
            languageId: source.languageId,
            learningGoalId: source.learningGoalId,
            name: source.title.trim(),
            slug: source.slug.trim().toLowerCase(),
            description: source.description?.trim() || null,
            thumbnailUrl: source.thumbnailUrl?.trim() || null,
            level,
            orderIndex,
            isActive: source.isActive ?? true,
            createdAt: source.createdAt ?? new Date(),
            updatedAt: source.updatedAt ?? new Date(),
        });
    }

    console.log(`Series found: ${series.length}`);
    console.log(`Existing Courses: ${courses.length}`);
    console.log(`Series with child Courses (skip parent duplicate): ${skippedWithChildren}`);
    console.log(`Already converted (id/slug): ${skippedAlreadyConverted}`);
    console.log(`Proposed standalone Courses: ${proposed.length}`);
    console.log(`Invalid Series: ${invalid.length}`);

    for (const item of proposed) {
        console.log(`  + ${item.name} [${item.level}] order=${item.orderIndex} slug=${item.slug}`);
    }
    for (const item of invalid) {
        console.error(`  ! ${item.title} (${item.seriesId}): ${item.reason}`);
    }

    if (dryRun) {
        console.log('\nDry run complete. No MongoDB documents were modified.');
        await mongoose.disconnect();
        return;
    }

    if (!confirmed) {
        throw new Error('Live migration requires --yes');
    }
    if (invalid.length > 0) {
        throw new Error('Live migration blocked by invalid Series records');
    }

    const outputDir = path.join(
        process.cwd(),
        'migration-backups',
        `empty-series-to-courses-${new Date().toISOString().replace(/[:.]/g, '-')}`,
    );
    ensureDir(outputDir);
    writeJson(path.join(outputDir, 'courses-before.json'), courses);
    writeJson(path.join(outputDir, 'courseseries-before.json'), series);
    writeJson(path.join(outputDir, 'rollback-created-course-ids.json'), proposed.map((item) => item.sourceSeriesId));

    if (proposed.length > 0) {
        await courseCollection.insertMany(
            proposed.map(({ sourceSeriesId: _sourceSeriesId, ...item }) => ({
                ...item,
                prerequisiteCourseId: null,
                totalUnits: 0,
                finalExamConfig: defaultFinalExamConfig,
                __v: 0,
            })),
            { ordered: true },
        );
    }

    const finalCount = await courseCollection.countDocuments({});
    console.log(`\nMigration complete. Created ${proposed.length} Courses. Total Courses: ${finalCount}.`);
    console.log('The courseseries collection was preserved unchanged.');
    console.log(`Rollback manifest: ${outputDir}`);
    await mongoose.disconnect();
}

const dryRun = process.argv.includes('--dry-run');
const confirmed = process.argv.includes('--yes');

run(dryRun, confirmed).catch(async (error: unknown) => {
    console.error('Migration failed:', error instanceof Error ? error.message : error);
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    process.exit(1);
});
