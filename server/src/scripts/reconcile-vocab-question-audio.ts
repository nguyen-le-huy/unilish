import mongoose from 'mongoose';
import type { AnyBulkWriteOperation } from 'mongodb';
import {
    HeadObjectCommand,
    ListObjectsV2Command,
    S3Client,
    type _Object,
} from '@aws-sdk/client-s3';
import { env } from '../config/env.js';

type QuestionDocument = {
    _id: mongoose.Types.ObjectId;
    stem?: { audioUrl?: string | null };
    content?: {
        options?: Array<{ text?: string; isCorrect?: boolean }>;
    };
};

const applyChanges = process.argv.includes('--apply');

const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: env.R2_SECRET_ACCESS_KEY || '',
    },
});

function audioKey(rawUrl: string): string {
    const trimmed = rawUrl.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        return trimmed.replace(/^\/+/, '').replace(/^api\/audio\//, '');
    }

    return new URL(trimmed).pathname.replace(/^\/+/, '').replace(/^api\/audio\//, '');
}

function wordAudioSuffix(word: string): string {
    const sanitized = word
        .replace(/[^a-zA-Z0-9\u00C0-\u024F\s-]/g, '_')
        .replace(/\s+/g, '-');
    return `-${sanitized}-word.mp3`.toLowerCase();
}

async function objectExists(key: string): Promise<boolean> {
    try {
        await r2Client.send(new HeadObjectCommand({
            Bucket: env.R2_BUCKET_NAME || '',
            Key: key,
        }));
        return true;
    } catch {
        return false;
    }
}

async function listAllObjects(prefix: string): Promise<_Object[]> {
    const objects: _Object[] = [];
    let continuationToken: string | undefined;

    do {
        const response = await r2Client.send(new ListObjectsV2Command({
            Bucket: env.R2_BUCKET_NAME || '',
            Prefix: prefix,
            ContinuationToken: continuationToken,
        }));
        objects.push(...(response.Contents ?? []));
        continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return objects;
}

async function main(): Promise<void> {
    await mongoose.connect(env.MONGO_URI);
    const db = mongoose.connection.db;
    if (!db) throw new Error('MongoDB connection is unavailable');

    const lessons = await db.collection('lessons').find({
        type: 'VOCAB',
        'practiceConfig.questionIds.0': { $exists: true },
    }, {
        projection: { 'practiceConfig.questionIds': 1 },
    }).toArray();

    const operations: AnyBulkWriteOperation<QuestionDocument>[] = [];
    let checked = 0;
    let healthy = 0;
    let unresolved = 0;

    for (const lesson of lessons) {
        const lessonId = String(lesson._id);
        const questionIds = lesson.practiceConfig?.questionIds as mongoose.Types.ObjectId[] | undefined;
        if (!questionIds?.length) continue;

        const questions = await db.collection<QuestionDocument>('questions').find({
            _id: { $in: questionIds },
            'stem.audioUrl': { $type: 'string', $ne: '' },
        }).toArray();
        if (!questions.length) continue;

        const prefix = `audio/vocab/${lessonId}/`;
        const availableObjects = await listAllObjects(prefix);

        for (const question of questions) {
            checked += 1;
            const currentUrl = question.stem?.audioUrl;
            if (!currentUrl) continue;

            const currentKey = audioKey(currentUrl);
            if (await objectExists(currentKey)) {
                healthy += 1;
                continue;
            }

            const correctWord = question.content?.options?.find((option) => option.isCorrect)?.text?.trim();
            if (!correctWord) {
                unresolved += 1;
                console.warn(`UNRESOLVED ${question._id}: no correct option`);
                continue;
            }

            const suffix = wordAudioSuffix(correctWord);
            const replacement = availableObjects
                .filter((object) => object.Key?.toLowerCase().endsWith(suffix))
                .sort((left, right) =>
                    (right.LastModified?.getTime() ?? 0) - (left.LastModified?.getTime() ?? 0),
                )[0]?.Key;

            if (!replacement) {
                unresolved += 1;
                console.warn(`UNRESOLVED ${question._id}: no R2 audio for "${correctWord}"`);
                continue;
            }

            operations.push({
                updateOne: {
                    filter: { _id: question._id },
                    update: { $set: { 'stem.audioUrl': replacement } },
                },
            });
            console.log(`${applyChanges ? 'UPDATE' : 'WOULD_UPDATE'} ${question._id}: ${currentKey} -> ${replacement}`);
        }
    }

    if (applyChanges && operations.length > 0) {
        await db.collection<QuestionDocument>('questions').bulkWrite(operations);
    }

    console.log(JSON.stringify({
        mode: applyChanges ? 'apply' : 'dry-run',
        checked,
        healthy,
        repaired: operations.length,
        unresolved,
    }));
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
