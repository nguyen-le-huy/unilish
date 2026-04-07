import mongoose from 'mongoose';
import { HttpStatus } from '../constants/http-status.js';
import { placementTestMongoRepository } from '../repositories/mongo/placement-test.mongo.repository.js';
import { placementTestAttemptMongoRepository } from '../repositories/mongo/placement-test-attempt.mongo.repository.js';
import { UserMongoRepository } from '../repositories/mongo/user.mongo.repository.js';
import {
    EPlacementTestStatus,
    type IModuleEssay,
    type IModuleMCQ,
    type IModuleSpeaking,
    type IPlacementTest,
} from '../models/mongo/placement-test.model.js';
import { EPlacementAttemptStatus, type IAttemptModuleSnapshot, type IAttemptPartSnapshot, type IAttemptQuestionSnapshot, type IPlacementTestAttempt } from '../models/mongo/placement-test-attempt.model.js';
import { ESkill } from '../models/mongo/user.model.js';
import { Question } from '../models/mongo/question.model.js';
import type { CreatePlacementAttemptBody, SavePlacementAnswersBody } from '../validations/placement-test-runtime.validation.js';
import { AppError } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';

interface RuntimeQuestionView {
    questionId: string;
    questionNumber: number;
    part: number;
    skill: 'listening' | 'reading';
    questionText: string;
    options: Array<{ id: 'A' | 'B' | 'C' | 'D'; text: string }>;
    groupId?: string;
    imageUrl?: string;
    imageUrls?: string[];
    audioUrl?: string;
}

interface RuntimePartView {
    part: number;
    name: string;
    skill: 'listening' | 'reading';
    audioUrl?: string;
    questions: RuntimeQuestionView[];
}

interface RuntimeModuleView {
    order: number;
    type: 'mcq';
    name: string;
    timeLimitMinutes: number;
    parts: RuntimePartView[];
}

interface AttemptView {
    attemptId: string;
    placementTestId: string;
    language: string;
    status: string;
    startedAt: Date;
    expiresAt: Date;
    submittedAt?: Date | null;
    durationSeconds?: number | null;
    totalQuestions: number;
    modules: RuntimeModuleView[];
    answerSheet: Array<{
        questionId: string;
        selectedOption?: 'A' | 'B' | 'C' | 'D' | null;
        flagged: boolean;
        answeredAt?: Date | null;
    }>;
    scoring?: IPlacementTestAttempt['scoring'] | null;
}

interface SubmitResult {
    attempt: AttemptView;
    profileUpdate: {
        placementTestScore: number;
        currentLevel: string;
        weakSkills: string[];
    };
}

interface ActiveRuntimeView {
    _id: IPlacementTest['_id'];
    placementTestId: string;
    language: string;
    name: string;
    version: number;
    status: IPlacementTest['status'];
    mcqModule: IModuleMCQ | null;
    essayModule: IModuleEssay | null;
    speakingModule: IModuleSpeaking | null;
    cefrMapping: IPlacementTest['cefrMapping'];
    modules: IPlacementTest['modules'];
}

interface PoolQuestionOption {
    id: string;
    text: string;
    isCorrect?: boolean;
}

interface RuntimeOptionCandidate {
    id: 'A' | 'B' | 'C' | 'D';
    text: string;
    isCorrect?: boolean;
}

interface PoolQuestionDoc {
    _id: mongoose.Types.ObjectId;
    stem?: {
        text?: string;
        imageUrl?: string;
        audioUrl?: string;
    };
    content?: {
        options?: PoolQuestionOption[];
    };
}

const DEFAULT_ATTEMPT_DURATION_MINUTES = 45;

const getAttemptDurationMinutes = (modules: IAttemptModuleSnapshot[]): number => {
    const total = modules.reduce((sum, module) => sum + Math.max(module.timeLimitMinutes, 0), 0);
    return total > 0 ? total : DEFAULT_ATTEMPT_DURATION_MINUTES;
};

const toRuntimeView = (attempt: IPlacementTestAttempt): AttemptView => {
    const modules: RuntimeModuleView[] = attempt.runtimeSnapshot.modules.map((module) => {
        const parts: RuntimePartView[] = module.parts.map((part) => {
            const questions: RuntimeQuestionView[] = part.questions.map((question) => {
                const questionView: RuntimeQuestionView = {
                    questionId: question.questionId,
                    questionNumber: question.questionNumber,
                    part: question.part,
                    skill: question.skill,
                    questionText: question.questionText,
                    options: question.options,
                };

                if (question.groupId) {
                    questionView.groupId = question.groupId;
                }
                if (question.imageUrl) {
                    questionView.imageUrl = question.imageUrl;
                }
                if (question.imageUrls && question.imageUrls.length > 0) {
                    questionView.imageUrls = question.imageUrls;
                }
                if (question.audioUrl) {
                    questionView.audioUrl = question.audioUrl;
                }

                return questionView;
            });

            const partView: RuntimePartView = {
                part: part.part,
                name: part.name,
                skill: part.skill,
                questions,
            };

            if (part.audioUrl) {
                partView.audioUrl = part.audioUrl;
            }

            return partView;
        });

        return {
            order: module.order,
            type: module.type,
            name: module.name,
            timeLimitMinutes: module.timeLimitMinutes,
            parts,
        };
    });

    const view: AttemptView = {
        attemptId: String(attempt._id),
        placementTestId: String(attempt.placementTestId),
        language: attempt.language,
        status: attempt.status,
        startedAt: attempt.startedAt,
        expiresAt: attempt.expiresAt,
        totalQuestions: attempt.totalQuestions,
        modules,
        answerSheet: attempt.answerSheet,
    };

    if (attempt.submittedAt !== undefined) {
        view.submittedAt = attempt.submittedAt;
    }
    if (attempt.durationSeconds !== undefined) {
        view.durationSeconds = attempt.durationSeconds;
    }
    if (attempt.scoring !== undefined) {
        view.scoring = attempt.scoring;
    }

    return view;
};

const getSkillByPart = (part: number): 'listening' | 'reading' => (part <= 4 ? 'listening' : 'reading');

const getCefrByScore = (score: number, thresholds: IPlacementTest['cefrMapping']['thresholds']): string => {
    for (const threshold of thresholds) {
        if (score >= threshold.mcqMin && score <= threshold.mcqMax) {
            return threshold.level;
        }
    }

    if (thresholds.length === 0) {
        return 'A1';
    }

    return thresholds[thresholds.length - 1]?.level ?? 'A1';
};

export class PlacementTestRuntimeService {
    private readonly userRepo = new UserMongoRepository();

    private async ensureAttemptNotExpired(attempt: IPlacementTestAttempt): Promise<void> {
        const isInProgress = attempt.status === EPlacementAttemptStatus.IN_PROGRESS;
        const isExpiredByTime = new Date(attempt.expiresAt).getTime() <= Date.now();

        if (!isInProgress || !isExpiredByTime) {
            return;
        }

        await placementTestAttemptMongoRepository.updateStatus(
            String(attempt._id),
            EPlacementAttemptStatus.EXPIRED,
        );

        throw new AppError('Placement attempt has expired', HttpStatus.CONFLICT);
    }

    async getActive(language: string): Promise<ActiveRuntimeView> {
        const test = await placementTestMongoRepository.findActiveByLanguage(language);

        if (!test || test.status !== EPlacementTestStatus.ACTIVE) {
            throw new AppError('No active placement test found for language', HttpStatus.NOT_FOUND);
        }

        const mcqModule = test.modules.find((module): module is IModuleMCQ => module.type === 'mcq') ?? null;
        const essayModule = test.modules.find((module): module is IModuleEssay => module.type === 'essay') ?? null;
        const speakingModule = test.modules.find((module): module is IModuleSpeaking => module.type === 'speaking') ?? null;

        return {
            _id: test._id,
            placementTestId: String(test._id),
            language: test.language,
            name: test.name,
            version: test.version,
            status: test.status,
            mcqModule,
            essayModule,
            speakingModule,
            cefrMapping: test.cefrMapping,
            modules: test.modules,
        };
    }

    async createAttempt(userId: string, payload: CreatePlacementAttemptBody): Promise<AttemptView> {
        const placementTest = await placementTestMongoRepository.findByIdWithModules(payload.placementTestId);

        if (!placementTest || placementTest.status !== EPlacementTestStatus.ACTIVE) {
            throw new AppError('Placement test is not available for runtime', HttpStatus.NOT_FOUND);
        }

        await placementTestAttemptMongoRepository.expireInProgressByUserAndTest(
            userId,
            payload.placementTestId,
        );

        const mcqModules = placementTest.modules.filter((module): module is IModuleMCQ => module.type === 'mcq');

        if (mcqModules.length === 0) {
            throw new AppError('Placement test has no MCQ module configured', HttpStatus.UNPROCESSABLE_ENTITY);
        }

        const configuredAttemptDurationMinutes = mcqModules.reduce(
            (sum, module) => sum + Math.max(module.timeLimitMinutes, 0),
            0,
        ) || DEFAULT_ATTEMPT_DURATION_MINUTES;

        const existingAttempt = await placementTestAttemptMongoRepository.findInProgressByUserAndTest(
            userId,
            payload.placementTestId,
        );

        if (existingAttempt) {
            const existingDurationMinutes = getAttemptDurationMinutes(existingAttempt.runtimeSnapshot.modules);
            if (existingDurationMinutes === configuredAttemptDurationMinutes) {
                return toRuntimeView(existingAttempt);
            }

            await placementTestAttemptMongoRepository.updateStatus(
                String(existingAttempt._id),
                EPlacementAttemptStatus.EXPIRED,
            );

            logger.info('Expired in-progress attempt due to module duration change', {
                attemptId: String(existingAttempt._id),
                userId,
                existingDurationMinutes,
                configuredAttemptDurationMinutes,
            });
        }

        const runtimeModules: IAttemptModuleSnapshot[] = [];

        for (const module of mcqModules) {
            const runtimeParts: IAttemptPartSnapshot[] = [];

            for (const part of module.parts) {
                const skill = getSkillByPart(part.part);
                const manualItems = part.manualContent?.questionItems ?? [];

                const selectedManual = manualItems.slice(0, part.questionsCount);
                const questions: IAttemptQuestionSnapshot[] = selectedManual.map((item, index) => {
                    const question: IAttemptQuestionSnapshot = {
                        questionId: new mongoose.Types.ObjectId().toString(),
                        questionNumber: index + 1,
                        part: part.part,
                        skill,
                        questionText: item.question,
                        options: [
                            { id: 'A', text: item.options.A },
                            { id: 'B', text: item.options.B },
                            { id: 'C', text: item.options.C },
                            { id: 'D', text: item.options.D },
                        ],
                        correctOption: item.correctOption,
                    };

                    if (item.imageUrl) {
                        question.imageUrl = item.imageUrl;
                    }
                    if (item.imageUrls && item.imageUrls.length > 0) {
                        question.imageUrls = item.imageUrls;
                    }
                    if (item.audioUrl) {
                        question.audioUrl = item.audioUrl;
                    }

                    return question;
                });

                const remaining = Math.max(part.questionsCount - questions.length, 0);

                if (remaining > 0) {
                    const poolQuestions = (await Question.aggregate([
                        {
                            $match: {
                                languageId: new mongoose.Types.ObjectId(String(placementTest.languageId)),
                                tags: part.poolTag.toLowerCase(),
                                status: 'published',
                                skill,
                                part: part.part,
                                type: 'MULTIPLE_CHOICE',
                            },
                        },
                        { $sample: { size: remaining } },
                        {
                            $project: {
                                stem: 1,
                                content: 1,
                            },
                        },
                    ]).exec()) as PoolQuestionDoc[];

                    for (const poolQuestion of poolQuestions) {
                        const options: RuntimeOptionCandidate[] = (poolQuestion.content?.options ?? [])
                            .filter((option): option is PoolQuestionOption =>
                                ['A', 'B', 'C', 'D'].includes(option.id)
                                && typeof option.text === 'string',
                            )
                            .map((option) => {
                                const candidate: RuntimeOptionCandidate = {
                                    id: option.id as RuntimeOptionCandidate['id'],
                                    text: option.text,
                                };

                                if (option.isCorrect !== undefined) {
                                    candidate.isCorrect = option.isCorrect;
                                }

                                return candidate;
                            });

                        if (options.length !== 4) {
                            continue;
                        }

                        const correctOption = options.find((option) => option.isCorrect === true)?.id;
                        if (!correctOption) {
                            continue;
                        }

                        const pooledQuestion: IAttemptQuestionSnapshot = {
                            questionId: String(poolQuestion._id),
                            questionNumber: questions.length + 1,
                            part: part.part,
                            skill,
                            questionText: poolQuestion.stem?.text ?? '',
                            options: options.map((option) => ({ id: option.id, text: option.text })),
                            correctOption,
                        };

                        if (poolQuestion.stem?.imageUrl) {
                            pooledQuestion.imageUrl = poolQuestion.stem.imageUrl;
                        }
                        if (poolQuestion.stem?.audioUrl) {
                            pooledQuestion.audioUrl = poolQuestion.stem.audioUrl;
                        }

                        questions.push(pooledQuestion);
                    }
                }

                if (questions.length < part.questionsCount) {
                    throw new AppError(
                        `Not enough questions for part ${part.part}. Required ${part.questionsCount}, got ${questions.length}`,
                        HttpStatus.UNPROCESSABLE_ENTITY,
                    );
                }

                const groupPattern = part.manualContent?.groupPattern ?? [];
                if (groupPattern.length > 0) {
                    let cursor = 0;
                    let groupIndex = 1;
                    for (const size of groupPattern) {
                        const slice = questions.slice(cursor, cursor + size);
                        const groupId = `p${part.part}-g${groupIndex}`;
                        for (const question of slice) {
                            question.groupId = groupId;
                        }
                        cursor += size;
                        groupIndex += 1;
                    }
                }

                const runtimePart: IAttemptPartSnapshot = {
                    part: part.part,
                    name: part.name,
                    skill,
                    questions: questions.slice(0, part.questionsCount),
                };

                const partAudioUrl = part.manualContent?.media?.audioUrl ?? questions.find((question) => question.audioUrl)?.audioUrl;
                if (partAudioUrl) {
                    runtimePart.audioUrl = partAudioUrl;
                }

                runtimeParts.push(runtimePart);
            }

            runtimeModules.push({
                order: module.order,
                type: 'mcq',
                name: module.name,
                timeLimitMinutes: module.timeLimitMinutes,
                parts: runtimeParts,
            });
        }

        const totalQuestions = runtimeModules.reduce(
            (total, module) => total + module.parts.reduce((partTotal, part) => partTotal + part.questions.length, 0),
            0,
        );

        const now = new Date();
        const attemptDurationMinutes = getAttemptDurationMinutes(runtimeModules);
        const expiresAt = new Date(now.getTime() + attemptDurationMinutes * 60 * 1000);

        const createdAttempt = await placementTestAttemptMongoRepository.create({
            userId: new mongoose.Types.ObjectId(userId),
            placementTestId: new mongoose.Types.ObjectId(payload.placementTestId),
            language: placementTest.language,
            status: EPlacementAttemptStatus.IN_PROGRESS,
            startedAt: now,
            expiresAt,
            totalQuestions,
            runtimeSnapshot: {
                modules: runtimeModules,
            },
            answerSheet: [],
            scoring: null,
        } as Partial<IPlacementTestAttempt>);

        const freshAttempt = await placementTestAttemptMongoRepository.findByIdForUser(String(createdAttempt._id), userId);

        if (!freshAttempt) {
            throw new AppError('Failed to read created attempt', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        logger.info('Placement test attempt created', {
            attemptId: String(freshAttempt._id),
            placementTestId: payload.placementTestId,
            userId,
            totalQuestions,
            attemptDurationMinutes,
        });

        return toRuntimeView(freshAttempt);
    }

    async getAttemptById(userId: string, attemptId: string): Promise<AttemptView> {
        const attempt = await placementTestAttemptMongoRepository.findByIdForUser(attemptId, userId);

        if (!attempt) {
            throw new AppError('Placement attempt not found', HttpStatus.NOT_FOUND);
        }

        await this.ensureAttemptNotExpired(attempt);

        return toRuntimeView(attempt);
    }

    async saveAnswers(
        userId: string,
        attemptId: string,
        payload: SavePlacementAnswersBody,
    ): Promise<Pick<AttemptView, 'attemptId' | 'status' | 'answerSheet'> & { progress: { answered: number; total: number; flagged: number } }> {
        const attempt = await placementTestAttemptMongoRepository.findByIdForUser(attemptId, userId);

        if (!attempt) {
            throw new AppError('Placement attempt not found', HttpStatus.NOT_FOUND);
        }

        await this.ensureAttemptNotExpired(attempt);

        if (attempt.status !== EPlacementAttemptStatus.IN_PROGRESS) {
            throw new AppError('Cannot update answers for submitted attempt', HttpStatus.CONFLICT);
        }

        const allowedQuestionIds = new Set<string>();
        for (const module of attempt.runtimeSnapshot.modules) {
            for (const part of module.parts) {
                for (const question of part.questions) {
                    allowedQuestionIds.add(question.questionId);
                }
            }
        }

        const merged = new Map<string, IPlacementTestAttempt['answerSheet'][number]>();
        for (const item of attempt.answerSheet) {
            merged.set(item.questionId, item);
        }

        for (const incoming of payload.answers) {
            if (!allowedQuestionIds.has(incoming.questionId)) {
                continue;
            }

            const current = merged.get(incoming.questionId) ?? {
                questionId: incoming.questionId,
                flagged: false,
                selectedOption: null,
                answeredAt: null,
            };

            const selectedOption = incoming.selectedOption === undefined
                ? current.selectedOption ?? null
                : incoming.selectedOption;

            const flagged = incoming.flagged === undefined ? current.flagged : incoming.flagged;

            merged.set(incoming.questionId, {
                questionId: incoming.questionId,
                selectedOption,
                flagged,
                answeredAt: selectedOption ? new Date() : current.answeredAt ?? null,
            });
        }

        const updatedAnswerSheet = Array.from(merged.values());

        const updated = await placementTestAttemptMongoRepository.updateAnswerSheet(attemptId, updatedAnswerSheet);
        if (!updated) {
            throw new AppError('Failed to update placement attempt answers', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        const answered = updated.answerSheet.filter((item) => Boolean(item.selectedOption)).length;
        const flagged = updated.answerSheet.filter((item) => item.flagged).length;

        return {
            attemptId: String(updated._id),
            status: updated.status,
            answerSheet: updated.answerSheet,
            progress: {
                answered,
                total: updated.totalQuestions,
                flagged,
            },
        };
    }

    async submitAttempt(userId: string, attemptId: string): Promise<SubmitResult> {
        const attempt = await placementTestAttemptMongoRepository.findByIdForUser(attemptId, userId);

        if (!attempt) {
            throw new AppError('Placement attempt not found', HttpStatus.NOT_FOUND);
        }

        await this.ensureAttemptNotExpired(attempt);

        if (attempt.status !== EPlacementAttemptStatus.IN_PROGRESS) {
            throw new AppError('Attempt already submitted', HttpStatus.CONFLICT);
        }

        const answerMap = new Map<string, IPlacementTestAttempt['answerSheet'][number]>();
        for (const answer of attempt.answerSheet) {
            answerMap.set(answer.questionId, answer);
        }

        let listeningCorrect = 0;
        let listeningTotal = 0;
        let readingCorrect = 0;
        let readingTotal = 0;

        for (const module of attempt.runtimeSnapshot.modules) {
            for (const part of module.parts) {
                for (const question of part.questions) {
                    const selected = answerMap.get(question.questionId)?.selectedOption;
                    const isCorrect = selected != null && selected === question.correctOption;

                    if (question.skill === 'listening') {
                        listeningTotal += 1;
                        if (isCorrect) {
                            listeningCorrect += 1;
                        }
                    } else {
                        readingTotal += 1;
                        if (isCorrect) {
                            readingCorrect += 1;
                        }
                    }
                }
            }
        }

        const totalCorrect = listeningCorrect + readingCorrect;
        const totalQuestions = Math.max(listeningTotal + readingTotal, 1);
        const mcqScoreNormalized = totalCorrect / totalQuestions;

        const placementTest = await placementTestMongoRepository.findByIdWithModules(String(attempt.placementTestId));
        if (!placementTest) {
            throw new AppError('Placement test not found for attempt', HttpStatus.NOT_FOUND);
        }

        const provisionalCefr = getCefrByScore(mcqScoreNormalized, placementTest.cefrMapping.thresholds);
        const listeningAccuracy = listeningTotal > 0 ? listeningCorrect / listeningTotal : 0;
        const readingAccuracy = readingTotal > 0 ? readingCorrect / readingTotal : 0;

        const weakSkills: string[] = [];
        if (listeningAccuracy < 0.6) {
            weakSkills.push(ESkill.LISTENING);
        }
        if (readingAccuracy < 0.6) {
            weakSkills.push(ESkill.READING);
        }

        const submittedAt = new Date();
        const durationSeconds = Math.max(
            Math.floor((submittedAt.getTime() - new Date(attempt.startedAt).getTime()) / 1000),
            0,
        );

        const submittedAttempt = await placementTestAttemptMongoRepository.submitAttempt(attemptId, {
            status: EPlacementAttemptStatus.SUBMITTED,
            submittedAt,
            durationSeconds,
            answerSheet: attempt.answerSheet,
            scoring: {
                listeningCorrect,
                listeningTotal,
                readingCorrect,
                readingTotal,
                mcqScoreNormalized,
                provisionalCefr,
            },
        });

        if (!submittedAttempt) {
            throw new AppError('Failed to submit placement attempt', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        const placementTestScore = Math.round(mcqScoreNormalized * 100);

        const updatedUser = await this.userRepo.update(
            userId,
            {
                placementTestScore,
                currentLevel: provisionalCefr,
                weakSkills,
                lastActiveAt: submittedAt,
            },
        );

        if (!updatedUser) {
            throw new AppError('User not found while updating placement profile', HttpStatus.NOT_FOUND);
        }

        logger.info('Placement test attempt submitted', {
            attemptId,
            userId,
            placementTestScore,
            provisionalCefr,
            listeningCorrect,
            listeningTotal,
            readingCorrect,
            readingTotal,
        });

        return {
            attempt: toRuntimeView(submittedAttempt),
            profileUpdate: {
                placementTestScore,
                currentLevel: provisionalCefr,
                weakSkills,
            },
        };
    }
}

export const placementTestRuntimeService = new PlacementTestRuntimeService();
