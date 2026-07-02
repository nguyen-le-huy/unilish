import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockEnrollmentRepo = {
    findActiveByUser: mock.fn(),
    findByUserAndCourse: mock.fn(),
    findByIdSecure: mock.fn(),
};

const mockProgressRepo = {};

const mockAttemptRepo = {};

const mockCourseModel = {
    findById: mock.fn(),
    findOne: mock.fn(),
};

const mockEnrollmentModel = {
    countDocuments: mock.fn(),
    find: mock.fn(),
};

const mockProgressModel = {
    find: mock.fn(),
};

const mockUnitModel = { find: mock.fn() };
const mockLessonModel = { find: mock.fn() };
const mockLanguageModel = { findById: mock.fn() };
const mockLearningGoalModel = { findById: mock.fn() };

// ─── Helper ────────────────────────────────────────────────────────────────────

function mockChain(returnValue: unknown) {
    return {
        select: () => mockChain(returnValue),
        sort: () => mockChain(returnValue),
        lean: () => mockChain(returnValue),
        exec: () => Promise.resolve(returnValue),
    };
}

// ─── Testable Service ──────────────────────────────────────────────────────────

class TestableAnalyticsService {
    constructor() {}

    async getMonthlyActivity(
        userId: string,
        month: string,
    ): Promise<Array<{ date: string; minutes: number }>> {
        const [yearStr, monthStr] = month.split('-');
        const year = parseInt(yearStr!, 10);
        const mon = parseInt(monthStr!, 10);

        // Start of month in ICT: YYYY-MM-01 00:00:00 ICT = YYYY-MM-01 -7h UTC
        const startICT = new Date(Date.UTC(year, mon - 1, 1, 0, 0, 0, 0));
        startICT.setHours(startICT.getHours() - 7);

        // End of month in ICT: YYYY-(MM+1)-01 00:00:00 ICT = ... -7h UTC
        const endICT = new Date(Date.UTC(year, mon, 1, 0, 0, 0, 0));
        endICT.setHours(endICT.getHours() - 7);

        const progressRecords = await mockProgressModel.find({
            userId,
            lastAccessedAt: { $gte: startICT, $lt: endICT },
        })
            .select('lastAccessedAt timeSpentSeconds')
            .lean()
            .exec() as Array<{ lastAccessedAt: Date; timeSpentSeconds: number }>;

        if (progressRecords.length === 0) return [];

        const dayMap = new Map<string, { count: number; timeSum: number }>();
        const ICT_OFFSET_MS = 7 * 60 * 60 * 1000;

        for (const record of progressRecords) {
            const localDate = new Date(record.lastAccessedAt.getTime() + ICT_OFFSET_MS);
            const dateStr = localDate.toISOString().slice(0, 10);

            const existing = dayMap.get(dateStr);
            if (existing) {
                existing.count += 1;
            } else {
                dayMap.set(dateStr, { count: 1, timeSum: 0 });
            }
        }

        const enrollments = await mockEnrollmentModel.find({ userId })
            .select('timeSpentSeconds')
            .lean()
            .exec() as Array<{ timeSpentSeconds: number }>;

        const totalMonthlySeconds = enrollments.reduce(
            (sum, e) => sum + (e.timeSpentSeconds || 0),
            0,
        );

        const activeDayCount = dayMap.size;
        const avgMinutesPerDay =
            activeDayCount > 0
                ? Math.round(totalMonthlySeconds / 60 / activeDayCount)
                : 0;

        const sortedDates = Array.from(dayMap.keys()).sort();
        return sortedDates.map((dateStr) => ({
            date: dateStr,
            minutes: avgMinutesPerDay,
        }));
    }
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('Monthly Learning Aggregates (BE-11)', () => {
    let service: TestableAnalyticsService;

    beforeEach(() => {
        mockProgressModel.find.mock.resetCalls();
        mockEnrollmentModel.find.mock.resetCalls();
        service = new TestableAnalyticsService();
    });

    it('returns empty array when no progress in the month', async () => {
        mockProgressModel.find.mock.mockImplementation(() => mockChain([]));

        const result = await service.getMonthlyActivity('user1', '2026-07');
        assert.deepEqual(result, []);
    });

    it('groups activity by distinct days in Asia/Ho_Chi_Minh timezone (AC-18)', async () => {
        // Create dates at various UTC times that fall on the same/next ICT day
        // 2026-07-15 20:00:00 UTC = 2026-07-16 03:00:00 ICT (next day!)
        // 2026-07-16 02:00:00 UTC = 2026-07-16 09:00:00 ICT (same day)
        // 2026-07-16 16:00:00 UTC = 2026-07-16 23:00:00 ICT (same day)
        // 2026-07-17 10:00:00 UTC = 2026-07-17 17:00:00 ICT

        const records = [
            { lastAccessedAt: new Date('2026-07-15T20:00:00Z'), timeSpentSeconds: 120 }, // → 07-16 ICT
            { lastAccessedAt: new Date('2026-07-16T02:00:00Z'), timeSpentSeconds: 60 },  // → 07-16 ICT
            { lastAccessedAt: new Date('2026-07-16T16:00:00Z'), timeSpentSeconds: 90 },  // → 07-16 ICT
            { lastAccessedAt: new Date('2026-07-17T10:00:00Z'), timeSpentSeconds: 30 },  // → 07-17 ICT
        ];

        mockProgressModel.find.mock.mockImplementation(() => mockChain(records));
        mockEnrollmentModel.find.mock.mockImplementation(() => mockChain([
            { timeSpentSeconds: 300 },
        ]));

        const result = await service.getMonthlyActivity('user1', '2026-07');

        // Should have 2 distinct days in ICT: 07-16 and 07-17
        assert.equal(result.length, 2);
        assert.equal(result[0]!.date, '2026-07-16');
        assert.equal(result[1]!.date, '2026-07-17');
    });

    it('returns dates sorted ascending', async () => {
        const records = [
            { lastAccessedAt: new Date('2026-07-20T05:00:00Z'), timeSpentSeconds: 60 }, // → 07-20 ICT
            { lastAccessedAt: new Date('2026-07-05T10:00:00Z'), timeSpentSeconds: 60 }, // → 07-05 ICT
            { lastAccessedAt: new Date('2026-07-15T03:00:00Z'), timeSpentSeconds: 60 }, // → 07-15 ICT
        ];

        mockProgressModel.find.mock.mockImplementation(() => mockChain(records));
        mockEnrollmentModel.find.mock.mockImplementation(() => mockChain([{ timeSpentSeconds: 180 }]));

        const result = await service.getMonthlyActivity('user1', '2026-07');

        assert.equal(result.length, 3);
        assert.equal(result[0]!.date, '2026-07-05');
        assert.equal(result[1]!.date, '2026-07-15');
        assert.equal(result[2]!.date, '2026-07-20');
    });

    it('handles month boundary correctly with ICT offset', async () => {
        // 2026-06-30 18:00:00 UTC = 2026-07-01 01:00:00 ICT (next month in ICT!)
        // This should appear in July, not June
        const records = [
            { lastAccessedAt: new Date('2026-06-30T18:00:00Z'), timeSpentSeconds: 60 },
        ];

        mockProgressModel.find.mock.mockImplementation(() => mockChain(records));
        mockEnrollmentModel.find.mock.mockImplementation(() => mockChain([{ timeSpentSeconds: 60 }]));

        const result = await service.getMonthlyActivity('user1', '2026-07');

        assert.equal(result.length, 1);
        assert.equal(result[0]!.date, '2026-07-01');
    });

    it('computes average minutes per day from total time', async () => {
        const records = [
            { lastAccessedAt: new Date('2026-07-10T02:00:00Z'), timeSpentSeconds: 0 },
            { lastAccessedAt: new Date('2026-07-11T02:00:00Z'), timeSpentSeconds: 0 },
            { lastAccessedAt: new Date('2026-07-12T02:00:00Z'), timeSpentSeconds: 0 },
            { lastAccessedAt: new Date('2026-07-13T02:00:00Z'), timeSpentSeconds: 0 },
            { lastAccessedAt: new Date('2026-07-14T02:00:00Z'), timeSpentSeconds: 0 },
        ];

        mockProgressModel.find.mock.mockImplementation(() => mockChain(records));
        // Total 3000 seconds across 5 days = 600 sec/day = 10 min/day
        mockEnrollmentModel.find.mock.mockImplementation(() => mockChain([
            { timeSpentSeconds: 3000 },
        ]));

        const result = await service.getMonthlyActivity('user1', '2026-07');

        assert.equal(result.length, 5);
        for (const day of result) {
            assert.equal(day.minutes, 10); // 3000/60/5 = 10
        }
    });
});
