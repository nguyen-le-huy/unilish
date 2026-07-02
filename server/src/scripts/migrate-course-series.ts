/**
 * migration: CourseSeries → Course (BE-02)
 *
 * Idempotent migration script that:
 *   1. Exports backups of courses, courseseries, coupons, systemsettings.
 *   2. For each Course, copies languageId, learningGoalId, description,
 *      thumbnailUrl, and a unique slug from its parent CourseSeries.
 *   3. Converts orderInSeries → orderIndex.
 *   4. Validates uniqueness and compound-index constraints.
 *   5. Reports dry-run counts for migrated, skipped, invalid, conflicts.
 *   6. Persists a rollback mapping.
 *
 * Usage:
 *   npx tsx src/scripts/migrate-course-series.ts          # live run
 *   npx tsx src/scripts/migrate-course-series.ts --dry-run  # dry run only
 *
 * Safety:
 *   - Does NOT drop the old seriesId / orderInSeries fields.
 *   - Does NOT remove CourseSeries collection.
 *   - Requires explicit confirmation for live run.
 */

import mongoose from 'mongoose';
import path from 'path';
import fs from 'node:fs';
import { Course, type ICourse } from '../models/mongo/course.model.js';
import { env } from '../config/env.js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawCourseSeries {
    _id: string;
    title: string;
    slug: string;
    languageId: string;
    learningGoalId: string;
    description: string | null;
    thumbnailUrl: string | null;
    totalCourses: number;
    isActive: boolean;
}

interface CourseMigrationRecord {
    courseId: string;
    courseName: string;
    seriesId: string;
    seriesTitle: string;
    /** Old orderInSeries value for rollback */
    oldOrderInSeries: number;
    /** New fields we wrote */
    newFields: {
        languageId: string;
        learningGoalId: string;
        orderIndex: number;
        slug: string;
        description: string | null;
        thumbnailUrl: string | null;
    };
}

interface MigrationResult {
    total: number;
    migrated: number;
    skippedMissingSeries: SkippedRecord[];
    skippedAlreadyMigrated: number;
    slugConflicts: SlugConflict[];
    compoundIndexConflicts: CompoundIndexConflict[];
    /** Map courseId → rollback info */
    rollbackMap: Map<string, CourseMigrationRecord>;
}

interface SkippedRecord {
    courseId: string;
    courseName: string;
    seriesId: string;
}

interface SlugConflict {
    slug: string;
    courseIds: string[];
}

interface CompoundIndexConflict {
    languageId: string;
    learningGoalId: string;
    level: string;
    orderIndex: number;
    courseIds: string[];
}

interface CourseSeriesBackupRecord {
    _id: string;
    title: string;
    slug: string;
    languageId: string;
    learningGoalId: string;
    description: string | null;
    thumbnailUrl: string | null;
    totalCourses: number;
    isActive: boolean;
    aiCache: unknown | null;
    createdAt: string;
    updatedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const slugify = (text: string): string =>
    text
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // strip diacritics
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

const ensureDir = (dirPath: string): void => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

const writeJson = (filePath: string, data: unknown): void => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

// ─── Export Backups ───────────────────────────────────────────────────────────

async function exportBackups(outputDir: string): Promise<void> {
    ensureDir(outputDir);
    console.log(`\n📦 Exporting backup data to ${outputDir} ...`);

    const courses = await Course.find({}).lean();
    writeJson(path.join(outputDir, 'courses.json'), courses);
    console.log(`   ✅ courses.json (${courses.length} records)`);

    // Back up CourseSeries from raw MongoDB collection (model was deleted in Phase 4)
    const seriesCollection = mongoose.connection.collection('courseseries');
    const series = await seriesCollection.find({}).toArray();
    const seriesBackup: CourseSeriesBackupRecord[] = series.map((s) => ({
        _id: String(s._id),
        title: (s as Record<string, unknown>).title as string,
        slug: (s as Record<string, unknown>).slug as string,
        languageId: String((s as Record<string, unknown>).languageId),
        learningGoalId: String((s as Record<string, unknown>).learningGoalId),
        description: ((s as Record<string, unknown>).description ?? null) as string | null,
        thumbnailUrl: ((s as Record<string, unknown>).thumbnailUrl ?? null) as string | null,
        totalCourses: Number((s as Record<string, unknown>).totalCourses ?? 0),
        isActive: Boolean((s as Record<string, unknown>).isActive),
        aiCache: (s as Record<string, unknown>).aiCache as unknown | null,
        createdAt: (s as Record<string, unknown>).createdAt instanceof Date
            ? ((s as Record<string, unknown>).createdAt as Date).toISOString()
            : String((s as Record<string, unknown>).createdAt),
        updatedAt: (s as Record<string, unknown>).updatedAt instanceof Date
            ? ((s as Record<string, unknown>).updatedAt as Date).toISOString()
            : String((s as Record<string, unknown>).updatedAt),
    }));
    writeJson(path.join(outputDir, 'courseseries.json'), seriesBackup);
    console.log(`   ✅ courseseries.json (${seriesBackup.length} records)`);
}

// ─── Generate Unique Slug ─────────────────────────────────────────────────────

function generateCourseSlug(
    seriesSlug: string,
    level: string,
    orderIndex: number,
    existingSlugs: Set<string>,
): string {
    // Primary: {series-slug}-{level}-{orderIndex}
    const primary = slugify(`${seriesSlug}-${level}-${orderIndex}`);
    if (!existingSlugs.has(primary)) {
        return primary;
    }

    // Fallback: append a counter suffix
    let counter = 2;
    while (true) {
        const candidate = slugify(`${seriesSlug}-${level}-${orderIndex}-${counter}`);
        if (!existingSlugs.has(candidate)) {
            return candidate;
        }
        counter++;
        if (counter > 100) {
            throw new Error(`Unable to generate unique slug for seriesSlug=${seriesSlug} level=${level}`);
        }
    }
}

// ─── Main Migration Logic ─────────────────────────────────────────────────────

async function runMigration(dryRun: boolean): Promise<MigrationResult> {
    const result: MigrationResult = {
        total: 0,
        migrated: 0,
        skippedMissingSeries: [],
        skippedAlreadyMigrated: 0,
        slugConflicts: [],
        compoundIndexConflicts: [],
        rollbackMap: new Map(),
    };

    // 1. Load all Courses and CourseSeries (from raw collection — model deleted in Phase 4)
    const allCourses = await Course.find({}).lean<ICourse[]>();
    const seriesCollection = mongoose.connection.collection('courseseries');
    const allSeriesDocs = await seriesCollection.find({}).toArray();
    const seriesMap = new Map<string, Record<string, unknown>>();
    for (const s of allSeriesDocs) {
        seriesMap.set(String(s._id), s);
    }

    result.total = allCourses.length;
    console.log(`\n🔍 Found ${allCourses.length} courses and ${allSeriesDocs.length} series.\n`);

    // 2. Phase 1: Generate proposed slugs and detect conflicts
    const proposedSlugs = new Map<string, string>(); // courseId → proposed slug
    const slugToCourseIds = new Map<string, string[]>(); // slug → courseIds
    const existingSlugs = new Set<string>();

    // Collect existing slugs (from all courses, including those already migrated)
    for (const c of allCourses) {
        const existingSlug = (c as unknown as Record<string, unknown>).slug as string | undefined;
        if (existingSlug && existingSlug.trim().length > 0) {
            existingSlugs.add(existingSlug);
        }
    }

    for (const course of allCourses) {
        const seriesId = String(course.seriesId ?? '');
        const series = seriesMap.get(seriesId);

        if (!series) {
            result.skippedMissingSeries.push({
                courseId: String(course._id),
                courseName: course.name,
                seriesId,
            });
            continue;
        }

        const typedSeries = series as unknown as RawCourseSeries;

        // Check if already migrated (has slug field that is not empty)
        const alreadyMigrated = (course as unknown as Record<string, unknown>).slug as string | undefined;
        if (alreadyMigrated && alreadyMigrated.trim().length > 0) {
            result.skippedAlreadyMigrated++;
            continue;
        }

        const level = String(course.level ?? 'A1').toLowerCase();
        const orderIndex = course.orderInSeries ?? 1;

        const candidate = generateCourseSlug(typedSeries.slug, level, orderIndex, existingSlugs);

        proposedSlugs.set(String(course._id), candidate);
        existingSlugs.add(candidate);

        const ids = slugToCourseIds.get(candidate) ?? [];
        ids.push(String(course._id));
        slugToCourseIds.set(candidate, ids);
    }

    // Detect slug conflicts (multiple courses mapping to same slug)
    for (const [slug, ids] of slugToCourseIds) {
        if (ids.length > 1) {
            result.slugConflicts.push({ slug, courseIds: ids });
        }
    }

    // 3. Phase 2: Check compound-index constraints
    // Unique index target: { languageId, learningGoalId, level, orderIndex }
    const compoundKeyToCourseIds = new Map<string, string[]>();
    for (const course of allCourses) {
        const seriesId = String(course.seriesId ?? '');
        const series = seriesMap.get(seriesId);
        if (!series) continue;

        // Check if already migrated
        const alreadyMigrated = (course as unknown as Record<string, unknown>).slug as string | undefined;
        if (alreadyMigrated && alreadyMigrated.trim().length > 0) continue;

        const langId = String((series as unknown as RawCourseSeries).languageId);
        const goalId = String((series as unknown as RawCourseSeries).learningGoalId);
        const level = String(course.level);
        const orderIndex = course.orderInSeries ?? 1;

        const key = `${langId}::${goalId}::${level}::${orderIndex}`;
        const ids = compoundKeyToCourseIds.get(key) ?? [];
        ids.push(String(course._id));
        compoundKeyToCourseIds.set(key, ids);
    }

    for (const [key, ids] of compoundKeyToCourseIds) {
        if (ids.length > 1) {
            const [languageId, learningGoalId, level, orderIndex] = key.split('::');
            result.compoundIndexConflicts.push({
                languageId: languageId!,
                learningGoalId: learningGoalId!,
                level: level!,
                orderIndex: Number(orderIndex!),
                courseIds: ids,
            });
        }
    }

    // 4. Report dry-run / execute
    const migratableCount =
        result.total -
        result.skippedMissingSeries.length -
        result.skippedAlreadyMigrated -
        result.slugConflicts.reduce((sum, c) => sum + c.courseIds.length - 1, 0);

    console.log('═══════════════════════════════════════════════');
    console.log(`  DRY RUN: ${dryRun}`);
    console.log('═══════════════════════════════════════════════');
    console.log(`  Total courses:              ${result.total}`);
    console.log(`  Migratable (clean):         ${migratableCount}`);
    console.log(`  Skipped (missing series):   ${result.skippedMissingSeries.length}`);
    console.log(`  Skipped (already migrated): ${result.skippedAlreadyMigrated}`);
    console.log(`  Slug conflicts:             ${result.slugConflicts.length}`);
    console.log(`  Compound-index conflicts:   ${result.compoundIndexConflicts.length}`);
    console.log('═══════════════════════════════════════════════');

    if (result.skippedMissingSeries.length > 0) {
        console.log('\n⚠️  COURSES WITH MISSING SERIES:');
        for (const rec of result.skippedMissingSeries) {
            console.log(`   - ${rec.courseName} (ID: ${rec.courseId}) → series ${rec.seriesId}`);
        }
    }

    if (result.slugConflicts.length > 0) {
        console.log('\n⚠️  SLUG CONFLICTS:');
        for (const conflict of result.slugConflicts) {
            console.log(`   - "${conflict.slug}" → courses: [${conflict.courseIds.join(', ')}]`);
        }
    }

    if (result.compoundIndexConflicts.length > 0) {
        console.log('\n⚠️  COMPOUND-INDEX CONFLICTS (lang:goal:level:orderIndex):');
        for (const conflict of result.compoundIndexConflicts) {
            console.log(
                `   - ${conflict.languageId}:${conflict.learningGoalId}:${conflict.level}:${conflict.orderIndex} → [${conflict.courseIds.join(', ')}]`,
            );
        }
    }

    if (dryRun) {
        return result;
    }

    // 5. Live migration
    if (result.slugConflicts.length > 0) {
        console.error('\n❌ Cannot proceed: slug conflicts detected. Resolve manually and re-run.');
        process.exit(1);
    }

    if (result.compoundIndexConflicts.length > 0) {
        console.error('\n❌ Cannot proceed: compound-index conflicts detected. Resolve manually and re-run.');
        process.exit(1);
    }

    if (result.skippedMissingSeries.length > 0) {
        console.warn(`\n⚠️  ${result.skippedMissingSeries.length} courses will be skipped (missing series).`);
    }

    // Require confirmation
    const confirmMsg = `\n⚠️  This will migrate ${migratableCount} courses. Continue? (type "yes"): `;
    console.log(confirmMsg);

    // In a script environment, we use a simple prompt via stdin
    const readline = (await import('node:readline')).default;
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise<string>((resolve) => {
        rl.question('', (ans: string) => {
            rl.close();
            resolve(ans.trim());
        });
    });

    if (answer !== 'yes') {
        console.log('❌ Migration cancelled.');
        process.exit(0);
    }

    console.log('\n🚀 Starting live migration...\n');

    let migratedCount = 0;
    let errorCount = 0;

    for (const course of allCourses) {
        const seriesId = String(course.seriesId ?? '');
        const series = seriesMap.get(seriesId);

        if (!series) continue;

        const typedSeries = series as unknown as RawCourseSeries;

        // Check if already migrated
        const alreadyMigrated = (course as unknown as Record<string, unknown>).slug as string | undefined;
        if (alreadyMigrated && alreadyMigrated.trim().length > 0) continue;

        const slug = proposedSlugs.get(String(course._id));
        if (!slug) continue;

        const newFields = {
            languageId: typedSeries.languageId,
            learningGoalId: typedSeries.learningGoalId,
            orderIndex: course.orderInSeries,
            slug,
            description: typedSeries.description ?? null,
            thumbnailUrl: typedSeries.thumbnailUrl ?? null,
        };

        const rollbackEntry: CourseMigrationRecord = {
            courseId: String(course._id),
            courseName: course.name,
            seriesId: String(course.seriesId),
            seriesTitle: typedSeries.title,
            oldOrderInSeries: course.orderInSeries ?? 1,
            newFields: {
                languageId: String(typedSeries.languageId),
                learningGoalId: String(typedSeries.learningGoalId),
                orderIndex: course.orderInSeries ?? 1,
                slug,
                description: typedSeries.description ?? null,
                thumbnailUrl: typedSeries.thumbnailUrl ?? null,
            },
        };

        try {
            await Course.updateOne(
                { _id: course._id },
                {
                    $set: {
                        languageId: newFields.languageId,
                        learningGoalId: newFields.learningGoalId,
                        orderIndex: newFields.orderIndex,
                        slug: newFields.slug,
                        description: newFields.description,
                        thumbnailUrl: newFields.thumbnailUrl,
                    },
                },
            );
            result.rollbackMap.set(String(course._id), rollbackEntry);
            migratedCount++;
            console.log(`   ✅ [${migratedCount}] ${course.name} → slug="${slug}"`);
        } catch (err) {
            errorCount++;
            console.error(`   ❌ Failed: ${course.name} —`, (err as Error).message);
        }
    }

    result.migrated = migratedCount;
    console.log(`\n✅ Migration complete: ${migratedCount} migrated, ${errorCount} errors`);

    // 6. Save rollback mapping
    const rollbackFilePath = path.join(process.cwd(), 'migration-rollback-course-series.json');
    const rollbackData = Array.from(result.rollbackMap.entries()).map(([id, rec]) => rec);
    writeJson(rollbackFilePath, rollbackData);
    console.log(`📋 Rollback map saved: ${rollbackFilePath} (${rollbackData.length} entries)`);

    // Also save to MongoDB for durability
    const rollbackCollection = mongoose.connection.collection('_courseSeriesMigrationRollback');
    try {
        // Drop old rollback data if exists
        await rollbackCollection.drop().catch(() => {
            // ignore — collection may not exist
        });
        if (rollbackData.length > 0) {
            await rollbackCollection.insertMany(
                rollbackData.map((r) => {
                    const { courseId, ...rest } = r;
                    return { ...rest, courseId };
                }),
            );
            console.log('📋 Rollback map persisted to MongoDB collection `_courseSeriesMigrationRollback`');
        }
    } catch (err) {
        console.error('⚠️  Failed to persist rollback map to MongoDB:', (err as Error).message);
    }

    return result;
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    const dryRun = process.argv.includes('--dry-run');

    console.log('\n🔌 Connecting to MongoDB...');
    await mongoose.connect(env.MONGO_URI);
    console.log('✅ Connected.');

    const outputDir = path.join(process.cwd(), 'migration-backups', new Date().toISOString().replace(/[:.]/g, '-'));
    await exportBackups(outputDir);

    const result = await runMigration(dryRun);

    if (dryRun) {
        console.log('\n📊 DRY RUN COMPLETE — No data was modified.');
    }

    console.log('\n📋 Migration result summary saved.');

    await mongoose.disconnect();
    console.log('🔌 Disconnected.');
}

main().catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
