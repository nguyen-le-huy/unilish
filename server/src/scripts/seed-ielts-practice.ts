/**
 * Seed script: creates sample IELTS Practice content for dev/test.
 *
 * Run: npx tsx src/scripts/seed-ielts-practice.ts
 *       npx tsx src/scripts/seed-ielts-practice.ts --yes   (skip confirmation)
 */
import mongoose from 'mongoose';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });

const SKIP_CONFIRM = process.argv.includes('--yes');

const SEED_DATA = [
    {
        name: 'Listening Practice · Form Completion 1',
        slug: 'listening-form-completion-1',
        skill: 'listening',
        questionType: 'form_completion',
        durationMinutes: 12,
        content: {
            questionType: 'form_completion',
            instruction: 'Listen to the recording and fill in the blanks with the correct word or number.',
            heading: 'Questions 1–10',
            audioAssetId: 'seed-audio-listening-1',
            items: Array.from({ length: 10 }, (_, i) => ({
                id: `l-${i + 1}`,
                order: i + 1,
                before: `Before ${i + 1} `,
                after: ` after ${i + 1}.`,
                acceptedAnswers: [`answer${i + 1}`],
                caseSensitive: false,
            })),
        },
    },
    {
        name: 'Reading Practice · TFNG 1',
        slug: 'reading-tfng-1',
        skill: 'reading',
        questionType: 'true_false_not_given',
        durationMinutes: 20,
        content: {
            questionType: 'true_false_not_given',
            title: 'Climate Change and Agriculture',
            passage: [
                'Climate change is having a significant impact on global agriculture. Rising temperatures are affecting crop yields in many regions around the world.',
                'According to recent studies, some crops may benefit from warmer conditions in certain areas, while others face severe losses.',
                'Farmers are adapting by changing planting dates and developing drought-resistant crop varieties.',
            ],
            instruction: 'Do the following statements agree with the information in the passage?',
            statements: [
                { id: 'r-1', order: 1, text: 'Climate change only has negative effects on agriculture.', correctAnswer: 'FALSE' },
                { id: 'r-2', order: 2, text: 'Some crops may benefit from warmer conditions in certain regions.', correctAnswer: 'TRUE' },
                { id: 'r-3', order: 3, text: 'All farmers are using drought-resistant crops.', correctAnswer: 'NOT_GIVEN' },
                { id: 'r-4', order: 4, text: 'Farmers are changing their practices to adapt to climate change.', correctAnswer: 'TRUE' },
            ],
        },
    },
    {
        name: 'Writing Practice · Task 1 Chart',
        slug: 'writing-task-1-chart-1',
        skill: 'writing',
        questionType: 'academic_task_1_chart',
        durationMinutes: 20,
        content: {
            questionType: 'academic_task_1_chart',
            prompt: 'The chart below shows the percentage of households in the UK with internet access from 2000 to 2020.',
            instruction: 'Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
            imageAssetId: 'seed-image-writing-1',
            imageAlt: 'Line chart showing internet access growth in UK households from 2000 to 2020',
            minWords: 150,
        },
    },
    {
        name: 'Speaking Practice · AI Conversation 1',
        slug: 'speaking-ai-conversation-1',
        skill: 'speaking',
        questionType: 'ai_conversation',
        durationMinutes: 5,
        content: {
            questionType: 'ai_conversation',
            scenarioTitle: 'Travel Booking',
            context: 'You are planning a trip to London and need to book a hotel. The receptionist will help you with your reservation.',
            openingPrompt: 'Good morning! Welcome to London Central Hotel. How can I assist you today?',
            expectedDurationMinutes: 5,
            voice: 'marin',
        },
    },
];

async function main() {
    const mongoUri = process.env.MONGO_URI ?? process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error('MONGO_URI or MONGODB_URI is required');
        process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db!;
    const collection = db.collection('examtests');

    // Find a default language
    const language = await db.collection('languages').findOne({ code: 'en' });
    if (!language) {
        console.error('No English language found. Please seed languages first.');
        await mongoose.disconnect();
        process.exit(1);
    }

    // Find an admin user
    const admin = await db.collection('users').findOne({ role: 'admin' });
    if (!admin) {
        console.error('No admin user found. Please create an admin first.');
        await mongoose.disconnect();
        process.exit(1);
    }

    console.log(`Using language: ${language.code} (${language._id})`);
    console.log(`Using admin: ${admin.email} (${admin._id})`);

    if (!SKIP_CONFIRM) {
        console.log(`\nThis will create ${SEED_DATA.length} IELTS Practice tests.`);
        console.log('Press Ctrl+C to cancel or Enter to continue...');
        await new Promise<void>((resolve) => {
            process.stdin.once('data', () => resolve());
        });
    }

    let created = 0;
    for (const data of SEED_DATA) {
        const logicalTestId = new mongoose.Types.ObjectId();
        const now = new Date();

        const doc = {
            name: data.name,
            format: 'ielts',
            kind: 'skill_practice',
            logicalTestId,
            slug: data.slug,
            languageId: language._id,
            language: 'en',
            description: `Seed data for ${data.skill} practice`,
            status: 'active',
            version: 1,
            skill: data.skill,
            questionType: data.questionType,
            durationMinutes: data.durationMinutes,
            itemCount: data.content.questionType === 'form_completion'
                ? (data.content as any).items?.length ?? 0
                : data.content.questionType === 'true_false_not_given'
                ? (data.content as any).statements?.length ?? 0
                : data.content.questionType === 'academic_task_1_chart' ? 1 : 0,
            modules: [],
            content: data.content,
            scoringConfig: { framework: 'ielts_band', bandThresholds: [] },
            settings: { allowRetake: false, retakeCooldownDays: 30 },
            publishedAt: now,
            createdAt: now,
            updatedAt: now,
            createdBy: admin._id,
            updatedBy: admin._id,
        };

        // Check if slug already exists
        const existing = await collection.findOne({ slug: data.slug });
        if (existing) {
            console.log(`  ⏭ Skipping "${data.name}" — slug already exists`);
            continue;
        }

        await collection.insertOne(doc);
        console.log(`  ✅ Created "${data.name}" (${data.slug})`);
        created++;
    }

    console.log(`\nDone. Created ${created} new tests.`);

    // Create attempt indexes if they don't exist
    const attemptsCollection = db.collection('ieltspracticeattempts');
    try {
        await attemptsCollection.createIndexes([
            { key: { userId: 1, createdAt: -1 }, background: true },
            { key: { examTestId: 1, status: 1 }, background: true },
            { key: { logicalTestId: 1, userId: 1, createdAt: -1 }, background: true },
            { key: { status: 1, deadlineAt: 1 }, background: true },
        ]);
        console.log('Attempt indexes verified');
    } catch (err) {
        console.warn('Index creation warning:', err);
    }

    await mongoose.disconnect();
    console.log('Seed complete.');
}

main().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
