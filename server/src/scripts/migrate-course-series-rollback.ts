/**
 * Rollback script for CourseSeries → Course migration.
 *
 * Reads the rollback mapping (from file or MongoDB collection) and
 * restores the old `seriesId` + `orderInSeries` while removing the
 * new fields (languageId, learningGoalId, slug, description, thumbnailUrl, orderIndex).
 *
 * Usage:
 *   npx tsx src/scripts/migrate-course-series-rollback.ts
 *   npx tsx src/scripts/migrate-course-series-rollback.ts --dry-run
 *   npx tsx src/scripts/migrate-course-series-rollback.ts --from-file
 *
 * By default, reads from MongoDB collection `_courseSeriesMigrationRollback`.
 * Use `--from-file` to read from `migration-rollback-course-series.json` instead.
 */

import mongoose from 'mongoose';
import path from 'path';
import fs from 'node:fs';
import { Course } from '../models/mongo/course.model.js';
import { env } from '../config/env.js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CourseMigrationRecord {
    courseId: string;
    courseName: string;
    seriesId: string;
    seriesTitle: string;
    oldOrderInSeries: number;
    newFields: {
        languageId: string;
        learningGoalId: string;
        orderIndex: number;
        slug: string;
        description: string | null;
        thumbnailUrl: string | null;
    };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function loadRollbackData(fromFile: boolean): Promise<CourseMigrationRecord[]> {
    if (fromFile) {
        const filePath = path.join(process.cwd(), 'migration-rollback-course-series.json');
        if (!fs.existsSync(filePath)) {
            console.error(`❌ Rollback file not found: ${filePath}`);
            process.exit(1);
        }
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw) as CourseMigrationRecord[];
    }

    // Load from MongoDB
    const collection = mongoose.connection.collection('_courseSeriesMigrationRollback');
    const count = await collection.countDocuments();
    if (count === 0) {
        console.error('❌ No rollback data found in MongoDB collection `_courseSeriesMigrationRollback`.');
        process.exit(1);
    }

    const docs = await collection.find({}).toArray();
    return docs.map((doc) => {
        const d = doc as Record<string, unknown>;
        return {
            courseId: String(d.courseId ?? doc._id),
            courseName: d.courseName as string,
            seriesId: d.seriesId as string,
            seriesTitle: d.seriesTitle as string,
            oldOrderInSeries: d.oldOrderInSeries as number,
            newFields: d.newFields as CourseMigrationRecord['newFields'],
        };
    });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    const dryRun = process.argv.includes('--dry-run');
    const fromFile = process.argv.includes('--from-file');

    console.log(`\n🔄 Course Migration Rollback — ${dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log(`   Source: ${fromFile ? 'JSON file' : 'MongoDB collection'}\n`);

    console.log(`🔌 Connecting to MongoDB: ${env.MONGO_URI.slice(0, 30)}...`);
    await mongoose.connect(env.MONGO_URI);
    console.log('✅ Connected.\n');

    const records = await loadRollbackData(fromFile);
    console.log(`📋 Loaded ${records.length} rollback records.\n`);

    let restored = 0;
    let skipped = 0;
    let errors = 0;

    for (const rec of records) {
        try {
            if (!dryRun) {
                await Course.updateOne(
                    { _id: new mongoose.Types.ObjectId(rec.courseId) },
                    {
                        $set: {
                            seriesId: new mongoose.Types.ObjectId(rec.seriesId),
                            orderInSeries: rec.oldOrderInSeries,
                        },
                        $unset: {
                            languageId: '',
                            learningGoalId: '',
                            orderIndex: '',
                            slug: '',
                            description: '',
                            thumbnailUrl: '',
                        },
                    },
                );
            }
            restored++;
            console.log(`   ✅ [${restored}] ${rec.courseName} → series="${rec.seriesTitle}" order=${rec.oldOrderInSeries}`);
        } catch (err) {
            errors++;
            console.error(`   ❌ Failed: ${rec.courseName} —`, (err as Error).message);

            // Check if course still exists
            const exists = await Course.findById(rec.courseId).lean();
            if (!exists) {
                console.error(`      Course ${rec.courseId} no longer exists — skipping.`);
                skipped++;
            }
        }
    }

    console.log('\n═══════════════════════════════════════════════');
    console.log(`  Total records:  ${records.length}`);
    console.log(`  Restored:       ${restored}`);
    console.log(`  Skipped:        ${skipped}`);
    console.log(`  Errors:         ${errors}`);
    console.log('═══════════════════════════════════════════════');

    if (dryRun) {
        console.log('\n📊 DRY RUN COMPLETE — No data was modified.');
    } else {
        console.log(`\n✅ Rollback complete. ${restored} courses restored.`);
    }

    await mongoose.disconnect();
    console.log('🔌 Disconnected.');
}

main().catch((err) => {
    console.error('❌ Rollback failed:', err);
    process.exit(1);
});
