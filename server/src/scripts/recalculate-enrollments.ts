/**
 * Script: Recalculate Enrollment Counters
 *
 * Idempotent maintenance script that:
 *   1. Recalculates totalRequiredLessonCount for each enrollment based on
 *      the current published/active lessons in the course's units.
 *   2. Recalculates completedLessonCount by counting COMPLETED progress records.
 *   3. Fixes enrollment status (COMPLETED if all lessons done).
 *
 * Should be run after curriculum changes (admin adds/removes lessons)
 * or to repair counter drift.
 *
 * Implements BE-10: "Recalculate required Lesson counts safely after curriculum changes."
 *
 * Usage:
 *   npx tsx src/scripts/recalculate-enrollments.ts
 *   npx tsx src/scripts/recalculate-enrollments.ts --dry-run
 *   npx tsx src/scripts/recalculate-enrollments.ts --course <courseId>
 */

import mongoose from 'mongoose';
import { createInterface } from 'node:readline';
import { CourseEnrollment, EEnrollmentStatus } from '../models/mongo/course-enrollment.model.js';
import { LearnerLessonProgress, ELessonProgressStatus } from '../models/mongo/learner-lesson-progress.model.js';
import { env } from '../config/env.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const BATCH_SIZE = 50;

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

/**
 * Count required (published, active) lessons for a course.
 */
async function countRequiredLessons(courseId: mongoose.Types.ObjectId): Promise<number> {
    const result = await mongoose.model('Unit').aggregate([
        { $match: { courseId, isActive: { $ne: false } } },
        {
            $lookup: {
                from: 'lessons',
                localField: '_id',
                foreignField: 'unitId',
                as: 'lessons',
                pipeline: [
                    { $match: { isActive: { $ne: false } } },
                    { $count: 'count' },
                ],
            },
        },
        {
            $group: {
                _id: null,
                total: { $sum: { $arrayElemAt: ['$lessons.count', 0] } },
            },
        },
    ]).exec();

    return (result[0] as { total: number } | undefined)?.total ?? 0;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

interface RecalcResult {
    enrollmentId: string;
    userId: string;
    courseId: string;
    oldRequired: number;
    newRequired: number;
    oldCompleted: number;
    newCompleted: number;
    statusChanged: boolean;
}

async function main() {
    const isDryRun = process.argv.includes('--dry-run');
    const courseFilter = process.argv.includes('--course')
        ? process.argv[process.argv.indexOf('--course') + 1]
        : null;

    console.log('=== Recalculate Enrollment Counters ===');
    console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes)' : 'LIVE RUN'}`);
    if (courseFilter) {
        console.log(`Filtering for course: ${courseFilter}`);
    }

    // Connect to MongoDB
    await mongoose.connect(env.MONGO_URI);
    console.log(`Connected to MongoDB: ${env.MONGO_URI}`);

    try {
        // Find all non-completed enrollments (completed ones should be accurate)
        const filter: Record<string, unknown> = {};
        if (courseFilter) {
            filter.courseId = new mongoose.Types.ObjectId(courseFilter);
        }

        const totalEnrollments = await CourseEnrollment.countDocuments(filter).exec();
        console.log(`\nTotal enrollments: ${totalEnrollments}`);

        const cursor = CourseEnrollment.find(filter)
            .select('_id userId courseId completedLessonCount totalRequiredLessonCount status')
            .sort({ updatedAt: -1 })
            .batchSize(BATCH_SIZE)
            .cursor();

        const results: RecalcResult[] = [];
        let processed = 0;

        for await (const enrollment of cursor) {
            processed++;
            const courseId = enrollment.courseId;
            const enrollmentId = String(enrollment._id);

            // Recalculate total required lessons
            const newRequired = await countRequiredLessons(courseId);

            // Recalculate completed count from progress records
            const newCompleted = await LearnerLessonProgress.countDocuments({
                enrollmentId: enrollment._id,
                status: ELessonProgressStatus.COMPLETED,
            }).exec();

            const oldRequired = enrollment.totalRequiredLessonCount;
            const oldCompleted = enrollment.completedLessonCount;
            let statusChanged = false;

            if (
                oldRequired !== newRequired ||
                oldCompleted !== newCompleted
            ) {
                if (isDryRun) {
                    console.log(
                        `[${processed}/${totalEnrollments}] ${enrollmentId}: ` +
                        `required ${oldRequired}→${newRequired}, ` +
                        `completed ${oldCompleted}→${newCompleted}`,
                    );
                } else {
                    const updateData: Record<string, unknown> = {
                        totalRequiredLessonCount: newRequired,
                        completedLessonCount: newCompleted,
                    };

                    // Auto-update status if course is now complete
                    if (
                        newCompleted >= newRequired &&
                        newRequired > 0 &&
                        enrollment.status !== EEnrollmentStatus.COMPLETED
                    ) {
                        updateData.status = EEnrollmentStatus.COMPLETED;
                        updateData.completedAt = new Date();
                        statusChanged = true;
                    }

                    await CourseEnrollment.findByIdAndUpdate(
                        enrollment._id,
                        { $set: updateData },
                    ).exec();

                    console.log(
                        `[${processed}/${totalEnrollments}] Updated ${enrollmentId}: ` +
                        `required ${oldRequired}→${newRequired}, ` +
                        `completed ${oldCompleted}→${newCompleted}` +
                        (statusChanged ? ', status→COMPLETED' : ''),
                    );
                }
            } else if (processed % 100 === 0) {
                console.log(`[${processed}/${totalEnrollments}] No change for ${enrollmentId}`);
            }

            results.push({
                enrollmentId,
                userId: String(enrollment.userId),
                courseId: String(enrollment.courseId),
                oldRequired,
                newRequired,
                oldCompleted,
                newCompleted,
                statusChanged,
            });
        }

        // Summary
        const changedCount = results.filter(
            (r) => r.oldRequired !== r.newRequired || r.oldCompleted !== r.newCompleted,
        ).length;
        const completedCount = results.filter((r) => r.statusChanged).length;

        console.log('\n=== Summary ===');
        console.log(`Processed: ${processed}`);
        console.log(`Changed: ${changedCount}`);
        console.log(`Auto-completed: ${completedCount}`);

        if (!isDryRun && changedCount > 0) {
            console.log('\n✅ Recalculation complete.');
        } else if (isDryRun && changedCount > 0) {
            console.log(`\n⚠️  Dry run: ${changedCount} enrollment(s) would be updated.`);
            const confirmed = await askConfirmation('Proceed with live update?');
            if (confirmed) {
                console.log('Please re-run without --dry-run flag.');
            }
        } else {
            console.log('✅ All enrollments are up to date.');
        }
    } catch (error) {
        console.error('❌ Recalculation failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

main();
