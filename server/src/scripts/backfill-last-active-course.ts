/**
 * Backfill: User.lastActiveCourseId → CourseEnrollment
 *
 * Idempotent script that synchronizes `User.lastActiveCourseId` from
 * the authoritative `CourseEnrollment` collection.
 *
 * This is a one-time migration to ensure existing users with active
 * enrollments have their `lastActiveCourseId` set correctly.
 *
 * Implements: "Synchronize User.lastActiveCourseId only as a compatibility
 * projection" (plan.md BE-04)
 *
 * Usage:
 *   npx tsx src/scripts/backfill-last-active-course.ts           # live run
 *   npx tsx src/scripts/backfill-last-active-course.ts --dry-run  # dry run only
 *
 * Safety:
 *   - Does NOT overwrite lastActiveCourseId if it already matches the
 *     active enrollment's courseId.
 *   - Does NOT create enrollments; only syncs the pointer.
 *   - Requires explicit confirmation for live run.
 */

import mongoose from 'mongoose';
import { createInterface } from 'node:readline';
import { User } from '../models/mongo/user.model.js';
import { CourseEnrollment, EEnrollmentStatus } from '../models/mongo/course-enrollment.model.js';
import { env } from '../config/env.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const BATCH_SIZE = 100;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const askConfirmation = async (message: string): Promise<boolean> => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question(`${message} (yes/no): `, (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
        });
    });
};

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    const isDryRun = process.argv.includes('--dry-run');

    console.log('=== Backfill: User.lastActiveCourseId ===');
    console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes)' : 'LIVE RUN'}`);

    // Connect to MongoDB
    await mongoose.connect(env.MONGO_URI);
    console.log(`Connected to MongoDB: ${env.MONGO_URI}`);

    try {
        // Phase 1: Users with ACTIVE enrollment but null/mismatched lastActiveCourseId
        const activeEnrollments = await CourseEnrollment.aggregate([
            { $match: { status: EEnrollmentStatus.ACTIVE } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user',
                    pipeline: [
                        {
                            $match: {
                                $or: [
                                    { lastActiveCourseId: null },
                                    { lastActiveCourseId: { $exists: false } },
                                ],
                            },
                        },
                        { $project: { _id: 1, lastActiveCourseId: 1, fullName: 1 } },
                    ],
                },
            },
            { $unwind: { path: '$user', preserveNullAndEmptyArrays: false } },
            {
                $project: {
                    _id: 0,
                    userId: '$user._id',
                    userName: '$user.fullName',
                    enrollmentId: '$_id',
                    courseId: 1,
                },
            },
        ]);

        console.log(`\nPhase 1: Users with ACTIVE enrollment but no lastActiveCourseId`);
        console.log(`Found ${activeEnrollments.length} record(s) to backfill.`);

        if (activeEnrollments.length > 0 && !isDryRun) {
            console.log('\nRecords to update:');
            activeEnrollments.forEach((r, i) => {
                console.log(`  ${i + 1}. userId=${r.userId} courseId=${r.courseId}`);
            });

            const confirmed = await askConfirmation(
                `\nProceed to update ${activeEnrollments.length} user(s)?`,
            );
            if (!confirmed) {
                console.log('Aborted by user.');
                return;
            }

            // Update in batches
            let updated = 0;
            for (let i = 0; i < activeEnrollments.length; i += BATCH_SIZE) {
                const batch = activeEnrollments.slice(i, i + BATCH_SIZE);
                const operations = batch.map((record) => ({
                    updateOne: {
                        filter: { _id: new mongoose.Types.ObjectId(record.userId) },
                        update: {
                            $set: {
                                lastActiveCourseId: new mongoose.Types.ObjectId(record.courseId),
                                lastActiveAt: new Date(),
                            },
                        },
                    },
                }));

                const result = await User.bulkWrite(operations);
                updated += result.modifiedCount;
                console.log(
                    `  Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${result.modifiedCount} updated`,
                );
            }

            console.log(`\n✅ Backfill complete: ${updated} user(s) updated.`);
        } else if (activeEnrollments.length > 0 && isDryRun) {
            console.log('\nRecords that would be updated (DRY RUN):');
            activeEnrollments.forEach((r, i) => {
                console.log(`  ${i + 1}. userId=${r.userId} userName=${r.userName} → courseId=${r.courseId}`);
            });
        } else {
            console.log('✅ No users need backfill.');
        }

        // Phase 2: Users with lastActiveCourseId pointing to a non-existent enrollment
        // This handles stale pointers from the old system.
        const stalePointers = await User.aggregate([
            {
                $match: {
                    lastActiveCourseId: { $ne: null, $exists: true },
                },
            },
            {
                $lookup: {
                    from: 'courseenrollments',
                    let: { userId: '$_id', courseId: '$lastActiveCourseId' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$userId', '$$userId'] },
                                        { $eq: ['$courseId', '$$courseId'] },
                                    ],
                                },
                            },
                        },
                    ],
                    as: 'enrollment',
                },
            },
            { $match: { enrollment: { $size: 0 } } },
            {
                $project: {
                    _id: 1,
                    fullName: 1,
                    lastActiveCourseId: 1,
                },
            },
        ]);

        console.log(`\nPhase 2: Users with stale lastActiveCourseId (no matching enrollment)`);
        console.log(`Found ${stalePointers.length} user(s) with stale pointers.`);

        if (stalePointers.length > 0 && !isDryRun) {
            console.log('\nStale pointers to clear:');
            stalePointers.forEach((r, i) => {
                console.log(
                    `  ${i + 1}. userId=${r._id} userName=${r.fullName} stale courseId=${r.lastActiveCourseId}`,
                );
            });

            const confirmed2 = await askConfirmation(
                `\nClear ${stalePointers.length} stale lastActiveCourseId value(s)?`,
            );
            if (!confirmed2) {
                console.log('Phase 2 skipped by user.');
                return;
            }

            const ids = stalePointers.map((r) => new mongoose.Types.ObjectId(r._id));
            const result = await User.updateMany(
                { _id: { $in: ids } },
                { $set: { lastActiveCourseId: null } },
            );

            console.log(`✅ Cleared ${result.modifiedCount} stale pointer(s).`);
        } else if (stalePointers.length > 0 && isDryRun) {
            console.log('\nStale pointers that would be cleared (DRY RUN):');
            stalePointers.forEach((r, i) => {
                console.log(
                    `  ${i + 1}. userId=${r._id} userName=${r.fullName} stale courseId=${r.lastActiveCourseId}`,
                );
            });
        } else {
            console.log('✅ No stale pointers found.');
        }

        console.log('\n=== Backfill complete ===');
    } catch (error) {
        console.error('❌ Backfill failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

main();
