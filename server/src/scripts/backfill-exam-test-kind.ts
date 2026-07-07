/**
 * Backfill script: sets `kind='full_exam'` for all existing ExamTest records.
 *
 * Run: npx tsx src/scripts/backfill-exam-test-kind.ts
 * Dry-run: npx tsx src/scripts/backfill-exam-test-kind.ts --dry-run
 */
import mongoose from 'mongoose';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });

async function main() {
    const mongoUri = process.env.MONGO_URI ?? process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error('MONGO_URI or MONGODB_URI is required');
        process.exit(1);
    }

    const isDryRun = process.argv.includes('--dry-run');

    await mongoose.connect(mongoUri);
    console.log(`Connected to MongoDB (dry-run: ${isDryRun})`);

    const collection = mongoose.connection.collection('examtests');

    // Find records without kind field or with kind=null
    const recordsToUpdate = await collection
        .find({
            $or: [
                { kind: { $exists: false } },
                { kind: null },
                { kind: '' },
            ],
        })
        .project({ _id: 1, name: 1, format: 1 })
        .toArray();

    console.log(`Found ${recordsToUpdate.length} records needing backfill`);

    if (recordsToUpdate.length > 0 && !isDryRun) {
        const result = await collection.updateMany(
            {
                $or: [
                    { kind: { $exists: false } },
                    { kind: null },
                    { kind: '' },
                ],
            },
            { $set: { kind: 'full_exam' } },
        );

        console.log(`Backfilled ${result.modifiedCount} records`);
    }

    if (isDryRun) {
        console.log('Dry-run — would update:');
        for (const doc of recordsToUpdate.slice(0, 10)) {
            console.log(`  - ${String(doc._id)}: "${doc.name}" (${doc.format})`);
        }
        if (recordsToUpdate.length > 10) {
            console.log(`  ... and ${recordsToUpdate.length - 10} more`);
        }
    }

    // Create suggested indexes
    if (!isDryRun) {
        try {
            await collection.createIndexes([
                { key: { kind: 1, format: 1, skill: 1, status: 1, publishedAt: -1 }, background: true },
                { key: { logicalTestId: 1, version: -1 }, unique: true, sparse: true, background: true },
                { key: { slug: 1, status: 1 }, background: true },
                { key: { languageId: 1, kind: 1, skill: 1 }, background: true },
            ]);
            console.log('Indexes created/verified');
        } catch (err) {
            console.warn('Index creation warning (may already exist):', err);
        }
    }

    await mongoose.disconnect();
    console.log('Done');
}

main().catch((err) => {
    console.error('Backfill failed:', err);
    process.exit(1);
});
