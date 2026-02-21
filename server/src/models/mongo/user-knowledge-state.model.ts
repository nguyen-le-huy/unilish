import mongoose from 'mongoose';

// --- Enums & Types ---
export const EMasteryLevel = {
    NEW: 0,         // Mới học
    LEARNING: 1,    // Đang học
    FAMILIAR: 2,    // Quen thuộc
    PROFICIENT: 3,  // Thành thạo
    MASTERED: 4,    // Đã thuộc
    EXPERT: 5,      // Chuyên gia
} as const;

export interface IUserKnowledgeState extends mongoose.Document {
    // --- 1. REFERENCES ---
    userId: mongoose.Types.ObjectId;
    conceptId: mongoose.Types.ObjectId;
    courseId: mongoose.Types.ObjectId;

    // --- 2. SPACED REPETITION SYSTEM (SRS) ---
    // Following FSRS/SuperMemo algorithm
    masteryLevel: number; // 0-5
    stability: number;    // Độ bền trí nhớ (tính bằng ngày)
    difficulty: number;   // Độ khó cá nhân (0-10)

    // --- 3. SCHEDULING ---
    lastReviewedAt: Date;
    nextReviewAt: Date; // CRITICAL: For querying due reviews

    // --- 4. STATISTICS ---
    reviewCount: number;    // Tổng số lần ôn tập
    mistakeCount: number;   // Số lần làm sai
    correctStreak: number;  // Chuỗi làm đúng liên tiếp

    // --- 5. METADATA ---
    createdAt: Date;
    updatedAt: Date;
}

const UserKnowledgeStateSchema = new mongoose.Schema<IUserKnowledgeState>(
    {
        // --- 1. REFERENCES ---
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        conceptId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Concept',
            required: true,
            index: true,
        },
        courseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
            required: true,
            index: true,
        },

        // --- 2. SPACED REPETITION SYSTEM (SRS) ---
        masteryLevel: {
            type: Number,
            default: EMasteryLevel.NEW,
            min: 0,
            max: 5,
            index: true, // For filtering by mastery level
        },
        stability: {
            type: Number,
            default: 0,
            min: 0,
        },
        difficulty: {
            type: Number,
            default: 0,
            min: 0,
            max: 10,
        },

        // --- 3. SCHEDULING ---
        lastReviewedAt: {
            type: Date,
            default: Date.now,
        },
        nextReviewAt: {
            type: Date,
            required: true,
            index: true, // CRITICAL: For querying due reviews
        },

        // --- 4. STATISTICS ---
        reviewCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        mistakeCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        correctStreak: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// --- INDEXES (Enterprise Performance) ---

// Primary query: Find due reviews for user in a course
// Query: "Tìm tất cả concepts cần ôn trong khóa học X của user Y"
UserKnowledgeStateSchema.index({
    userId: 1,
    courseId: 1,
    nextReviewAt: 1
});

// Secondary query: Find all concepts by user (for analytics)
UserKnowledgeStateSchema.index({
    userId: 1,
    masteryLevel: 1
});

// Unique constraint: One knowledge state per user-concept-course combination
UserKnowledgeStateSchema.index({
    userId: 1,
    conceptId: 1,
    courseId: 1
}, { unique: true });

// Query: Find weak concepts across all courses
UserKnowledgeStateSchema.index({
    userId: 1,
    masteryLevel: 1,
    mistakeCount: -1
});

// --- VIRTUALS ---

// Virtual: Is this concept due for review?
UserKnowledgeStateSchema.virtual('isDue').get(function (this: IUserKnowledgeState) {
    return this.nextReviewAt <= new Date();
});

// Virtual: Accuracy rate
UserKnowledgeStateSchema.virtual('accuracyRate').get(function (this: IUserKnowledgeState) {
    if (this.reviewCount === 0) return 0;
    const correctCount = this.reviewCount - this.mistakeCount;
    return (correctCount / this.reviewCount) * 100;
});

// Virtual: Is mastered?
UserKnowledgeStateSchema.virtual('isMastered').get(function (this: IUserKnowledgeState) {
    return this.masteryLevel >= EMasteryLevel.MASTERED;
});

// --- METHODS ---

// Method: Update after review
UserKnowledgeStateSchema.methods.updateAfterReview = function (
    this: IUserKnowledgeState,
    isCorrect: boolean,
    newStability: number,
    newDifficulty: number,
    nextReviewDate: Date
) {
    this.lastReviewedAt = new Date();
    this.reviewCount += 1;

    if (isCorrect) {
        this.correctStreak += 1;
        // Increase mastery level (max 5)
        if (this.masteryLevel < EMasteryLevel.EXPERT) {
            this.masteryLevel += 1;
        }
    } else {
        this.mistakeCount += 1;
        this.correctStreak = 0;
        // Decrease mastery level (min 0)
        if (this.masteryLevel > EMasteryLevel.NEW) {
            this.masteryLevel -= 1;
        }
    }

    this.stability = newStability;
    this.difficulty = newDifficulty;
    this.nextReviewAt = nextReviewDate;

    return this.save();
};

// --- STATICS ---

// Static: Find due reviews for user in course
UserKnowledgeStateSchema.statics.findDueReviews = function (
    userId: string | mongoose.Types.ObjectId,
    courseId: string | mongoose.Types.ObjectId,
    limit: number = 20
) {
    return this.find({
        userId,
        courseId,
        nextReviewAt: { $lte: new Date() },
    })
        .sort({ nextReviewAt: 1 }) // Oldest due first
        .limit(limit)
        .populate('conceptId');
};

// Static: Find weak concepts (for targeted practice)
UserKnowledgeStateSchema.statics.findWeakConcepts = function (
    userId: string | mongoose.Types.ObjectId,
    courseId: string | mongoose.Types.ObjectId,
    limit: number = 10
) {
    return this.find({
        userId,
        courseId,
        masteryLevel: { $lte: EMasteryLevel.FAMILIAR },
    })
        .sort({ mistakeCount: -1, masteryLevel: 1 })
        .limit(limit)
        .populate('conceptId');
};

// Static: Get learning statistics
UserKnowledgeStateSchema.statics.getStatistics = async function (
    userId: string | mongoose.Types.ObjectId,
    courseId?: string | mongoose.Types.ObjectId
) {
    const query: any = { userId };
    if (courseId) query.courseId = courseId;

    const stats = await this.aggregate([
        { $match: query },
        {
            $group: {
                _id: null,
                totalConcepts: { $sum: 1 },
                masteredConcepts: {
                    $sum: {
                        $cond: [{ $gte: ['$masteryLevel', EMasteryLevel.MASTERED] }, 1, 0],
                    },
                },
                avgMasteryLevel: { $avg: '$masteryLevel' },
                totalReviews: { $sum: '$reviewCount' },
                totalMistakes: { $sum: '$mistakeCount' },
                dueConcepts: {
                    $sum: {
                        $cond: [{ $lte: ['$nextReviewAt', new Date()] }, 1, 0],
                    },
                },
            },
        },
    ]);

    return stats[0] || {
        totalConcepts: 0,
        masteredConcepts: 0,
        avgMasteryLevel: 0,
        totalReviews: 0,
        totalMistakes: 0,
        dueConcepts: 0,
    };
};

export const UserKnowledgeState = mongoose.model<IUserKnowledgeState>(
    'UserKnowledgeState',
    UserKnowledgeStateSchema
);
