import mongoose from 'mongoose';
import OpenAI from 'openai';
import { HttpStatus } from '../constants/http-status.js';
import { env } from '../config/env.js';
import {
    EPlacementAttemptStatus,
    type IPlacementTestAttempt,
} from '../models/mongo/placement-test-attempt.model.js';
import {
    EPlacementSessionModule,
    EPlacementSessionStatus,
    EPlacementSubmoduleStatus,
    type IPlacementSession,
    type ISpeakingCriteria,
    type ISpeakingFeedback,
    type IWritingCriteria,
    type IWritingFeedback,
    type WritingLevel,
} from '../models/mongo/placement-session.model.js';
import {
    type IModuleEssay,
    type IModuleSpeaking,
    type ISpeakingQuestion,
    type ICEFRThreshold,
} from '../models/mongo/placement-test.model.js';
import { placementSessionMongoRepository } from '../repositories/mongo/placement-session.mongo.repository.js';
import { placementTestAttemptMongoRepository } from '../repositories/mongo/placement-test-attempt.mongo.repository.js';
import { placementTestMongoRepository } from '../repositories/mongo/placement-test.mongo.repository.js';
import { AppError } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';
import { computeFinalCEFR } from '../utils/cefr.js';
import { writingGradingQueue } from '../jobs/queues/writing-grading.queue.js';
import { speakingGradingQueue } from '../jobs/queues/speaking-grading.queue.js';
import { speakingPipelineService } from './speaking-pipeline.service.js';
import type {
    CreatePlacementSessionBody,
    StartWritingAttemptBody,
    SubmitSpeakingAttemptBody,
    SubmitWritingAttemptBody,
    UploadSpeakingAudioChunkBody,
} from '../validations/placement-session.validation.js';

const openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });

interface StartWritingResult {
    writingAttemptId: string;
    prompt: string;
    promptImageUrl?: string | undefined;
    timeLimitMinutes: number;
    wordLimit: number;
    level: WritingLevel;
}

interface SubmitResult {
    jobId?: string;
    status: 'grading' | 'pending' | 'done';
}

interface WritingResult {
    status: 'grading' | 'pending' | 'done';
    band?: number | undefined;
    criteria?: IWritingCriteria | undefined;
    feedback?: IWritingFeedback | undefined;
}

interface StartSpeakingResult {
    speakingAttemptId: string;
    part1Qs: Array<{ text: string; audioKey?: string | undefined }>;
    cueCard: { text: string; audioKey?: string | undefined; shouldSay?: string[] | undefined };
    part3Qs: Array<{ text: string; audioKey?: string | undefined }>;
    config?: {
        ttsVoice?: string | undefined;
        gradingModel?: string | undefined;
        silenceThresholdSeconds?: number | undefined;
    } | undefined;
}

interface UploadAudioChunkResult {
    saved: boolean;
}

interface SpeakingResult {
    status: 'grading' | 'pending' | 'done';
    band?: number | undefined;
    criteria?: ISpeakingCriteria | undefined;
    feedback?: ISpeakingFeedback | undefined;
}

interface PlacementResult {
    status: 'ready' | 'computing' | 'pending';
    sessionId: string;
    cefr: string;
    cefrDescription: string;
    scores: {
        listening: { rawPercent: number; cefr?: string | undefined };
        reading: { rawPercent: number; cefr?: string | undefined };
        writing: { band: number; cefr?: string | undefined; criteria?: IWritingCriteria | undefined };
        speaking: { band: number; cefr?: string | undefined; criteria?: ISpeakingCriteria | undefined };
    };
    feedback: {
        writing?: IWritingFeedback | undefined;
        speaking?: ISpeakingFeedback | undefined;
    };
}

const toPercent = (normalized: number | undefined): number => {
    if (typeof normalized !== 'number' || !Number.isFinite(normalized)) {
        return 0;
    }

    const value = normalized * 100;
    return Math.max(0, Math.min(100, Math.round(value)));
};

const clampBand = (value: number): number => {
    if (!Number.isFinite(value)) {
        return 0;
    }

    const rounded = Math.round(value * 2) / 2;
    return Math.max(0, Math.min(9, rounded));
};

const pickRandomOne = <T>(items: T[]): T | null => {
    if (items.length === 0) {
        return null;
    }

    const idx = Math.floor(Math.random() * items.length);
    return items[idx] ?? null;
};

const pickWritingLevel = (lrScore: number): WritingLevel => {
    if (lrScore < 45) {
        return 'low';
    }

    if (lrScore <= 75) {
        return 'mid';
    }

    return 'high';
};

const buildWritingFeedback = (ratio: number): IWritingFeedback => {
    if (ratio >= 1) {
        return {
            strengths: [
                'Bai viet dap ung dung yeu cau de bai.',
                'Y tuong duoc trien khai ro rang va de theo doi.',
            ],
            errors: ['Can tiep tuc mo rong collocation de tang tinh tu nhien.'],
            tips: [
                'Them vi du cu the cho tung luan diem quan trong.',
                'Ra soat cau phuc de toi uu do chinh xac ngu phap.',
            ],
        };
    }

    return {
        strengths: ['Bai viet co huong trinh bay ro rang.'],
        errors: [
            'Do dai bai viet chua dat muc khuyen nghi nen y tuong chua du sau.',
            'Lien ket giua cac doan van chua that su mach lac.',
        ],
        tips: [
            'Hoan thien so tu toi thieu truoc khi nop bai.',
            'Su dung them tu noi de lam ro quan he logic.',
        ],
    };
};

const buildSpeakingFeedback = (chunkCount: number): ISpeakingFeedback => {
    if (chunkCount >= 3) {
        return {
            strengths: [
                'Cau tra loi co do luu loat on dinh trong nhieu phan.',
                'Von tu vung kha linh hoat o chu de quen thuoc.',
            ],
            errors: ['Van con nhung khoang dung ngan khi mo rong y.'],
            tips: [
                'Tang toc do phan hoi o cau hoi tru tuong trong Part 3.',
                'Uu tien dung cau phuc co menh de bo nghia de nang diem grammar.',
            ],
            transcriptHighlights: ['Mau cau tra loi da bao phu day du part1, part2, part3.'],
        };
    }

    return {
        strengths: ['Da hoan thanh duoc cac phan tra loi co ban.'],
        errors: ['So luong du lieu am thanh it, can tra loi day du hon moi cau hoi.'],
        tips: [
            'Tra loi toi thieu 2-3 cau cho moi cau hoi Part 1 va Part 3.',
            'Part 2 can neu ro mo ta, ly do va cam nhan ca nhan.',
        ],
        transcriptHighlights: ['Can thu am day du tung cau hoi de AI phan tich chinh xac hon.'],
    };
};

const isEssayModule = (module: { type: string }): module is IModuleEssay => module.type === 'essay';
const isSpeakingModule = (module: { type: string }): module is IModuleSpeaking => module.type === 'speaking';

const pickSpeakingQuestions = (
    topics: ISpeakingQuestion[],
    range: [number, number] | undefined,
): ISpeakingQuestion[] => {
    if (topics.length === 0) {
        return [];
    }

    const hasExplicitRange = Array.isArray(range) && range.length === 2;
    const fallbackCount = topics.length;
    const minRange = Math.max(1, Number(hasExplicitRange ? range?.[0] : fallbackCount));
    const maxRange = Math.max(minRange, Number(hasExplicitRange ? range?.[1] : fallbackCount));
    const cappedMax = Math.min(maxRange, topics.length);
    const count = Math.max(minRange, Math.min(cappedMax, Math.floor(Math.random() * (cappedMax - minRange + 1)) + minRange));

    // Keep admin-authored order stable on client runtime.
    return topics.slice(0, count);
};

const getCefrByBand = (band: number): string => {
    if (band >= 8) return 'C2';
    if (band >= 7) return 'C1';
    if (band >= 5.5) return 'B2';
    if (band >= 4) return 'B1';
    if (band >= 2.5) return 'A2';
    return 'A1';
};

const buildAiOverallFeedback = async (payload: {
    cefr: string;
    listeningPercent: number;
    readingPercent: number;
    writingBand: number;
    speakingBand: number;
}): Promise<string | null> => {
    const prompt = `Ban la co van hoc tap IELTS.
Viet CHINH XAC 1 doan nhan xet tong quan bang tieng Viet, do dai 2-3 cau, de nguoi hoc de hieu.

Du lieu dau vao:
- CEFR tong hop: ${payload.cefr}
- Listening: ${payload.listeningPercent}%
- Reading: ${payload.readingPercent}%
- Writing: ${payload.writingBand}/9
- Speaking: ${payload.speakingBand}/9

Yeu cau:
- Chi viet tieng Viet, khong chen tieng Anh.
- Tom tat muc do hien tai va huong cai thien uu tien.
- Khong dung markdown, khong bullet, khong them tieu de.`;

    try {
        const completion = await openaiClient.chat.completions.create({
            model: env.OPENAI_GRADING_MODEL,
            reasoning_effort: env.OPENAI_GRADING_REASONING_EFFORT,
            messages: [
                {
                    role: 'system',
                    content: 'Ban chi tra loi bang tieng Viet tu nhien, ngan gon, ro rang.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
        });

        const text = completion.choices[0]?.message?.content?.trim() ?? '';
        return text.length > 0 ? text : null;
    } catch (error) {
        logger.warn('Failed to generate AI overall feedback', { error });
        return null;
    }
};

export class PlacementSessionService {
    async createSession(userId: string, payload: CreatePlacementSessionBody): Promise<{ sessionId: string }> {
        const attempt = await placementTestAttemptMongoRepository.findByIdForUser(payload.lrAttemptId, userId);

        if (!attempt) {
            throw new AppError('Listening & Reading attempt not found', HttpStatus.NOT_FOUND);
        }

        if (attempt.status !== EPlacementAttemptStatus.SUBMITTED) {
            throw new AppError('Listening & Reading attempt must be submitted before creating session', HttpStatus.CONFLICT);
        }

        const existing = await placementSessionMongoRepository.findByLrAttemptId(userId, payload.lrAttemptId);
        if (existing) {
            return { sessionId: String(existing._id) };
        }

        const placementTest = await placementTestMongoRepository.findByIdWithModules(String(attempt.placementTestId));
        if (!placementTest) {
            throw new AppError('Placement test not found for session bootstrap', HttpStatus.NOT_FOUND);
        }

        const essayModule = placementTest.modules.find(isEssayModule);
        if (!essayModule) {
            throw new AppError('Essay module is not configured for this placement test', HttpStatus.UNPROCESSABLE_ENTITY);
        }

        const listeningRawPercent = toPercent(attempt.scoring?.listeningTotal
            ? (attempt.scoring?.listeningCorrect ?? 0) / Math.max(attempt.scoring?.listeningTotal ?? 1, 1)
            : attempt.scoring?.mcqScoreNormalized ?? payload.lrRawScore / 100);

        const readingRawPercent = toPercent(attempt.scoring?.readingTotal
            ? (attempt.scoring?.readingCorrect ?? 0) / Math.max(attempt.scoring?.readingTotal ?? 1, 1)
            : attempt.scoring?.mcqScoreNormalized ?? payload.lrRawScore / 100);

        const created = await placementSessionMongoRepository.create({
            userId: new mongoose.Types.ObjectId(userId),
            placementTestId: attempt.placementTestId,
            lrAttemptId: attempt._id,
            lrRawScore: payload.lrRawScore,
            lrScoring: {
                listeningRawPercent,
                readingRawPercent,
                provisionalCefr: attempt.scoring?.provisionalCefr ?? 'A1',
            },
            status: EPlacementSessionStatus.IN_PROGRESS,
            currentModule: EPlacementSessionModule.WRITING,
            writing: {
                moduleSnapshot: {
                    timeLimitMinutes: essayModule.timeLimitMinutes,
                    wordLimits: essayModule.wordLimits,
                    topicsByLevel: essayModule.topicsByLevel,
                    promptImageUrl: essayModule.promptImageUrl ?? null,
                },
                status: EPlacementSubmoduleStatus.NOT_STARTED,
            },
            speaking: {
                status: EPlacementSubmoduleStatus.NOT_STARTED,
                part1Qs: [],
                part3Qs: [],
                audioChunks: [],
            },
        } as Partial<IPlacementSession>);

        logger.info('Placement session created', {
            sessionId: String(created._id),
            userId,
            lrAttemptId: payload.lrAttemptId,
        });

        return { sessionId: String(created._id) };
    }

    private async getSessionOrThrow(userId: string, sessionId: string): Promise<IPlacementSession> {
        const session = await placementSessionMongoRepository.findByIdForUser(sessionId, userId);

        if (!session) {
            throw new AppError('Placement session not found', HttpStatus.NOT_FOUND);
        }

        return session;
    }

    private async getPlacementModulesFromSession(session: IPlacementSession): Promise<{
        essayModule: IModuleEssay;
        speakingModule: IModuleSpeaking;
    }> {
        const placementTest = await placementTestMongoRepository.findByIdWithModules(String(session.placementTestId));

        if (!placementTest) {
            throw new AppError('Placement test not found for session', HttpStatus.NOT_FOUND);
        }

        const essayModule = placementTest.modules.find(isEssayModule);
        if (!essayModule) {
            throw new AppError('Essay module is not configured for this placement test', HttpStatus.UNPROCESSABLE_ENTITY);
        }

        const speakingModule = placementTest.modules.find(isSpeakingModule);
        if (!speakingModule) {
            throw new AppError('Speaking module is not configured for this placement test', HttpStatus.UNPROCESSABLE_ENTITY);
        }

        return { essayModule, speakingModule };
    }

    async startWritingAttempt(
        userId: string,
        sessionId: string,
        payload: StartWritingAttemptBody,
    ): Promise<StartWritingResult> {
        const session = await this.getSessionOrThrow(userId, sessionId);

        if (session.writing?.attemptId && session.writing?.prompt && session.writing?.timeLimitMinutes && session.writing?.wordLimit && session.writing?.level) {
            return {
                writingAttemptId: session.writing.attemptId,
                prompt: session.writing.prompt,
                promptImageUrl: session.writing.promptImageUrl ?? undefined,
                timeLimitMinutes: session.writing.timeLimitMinutes,
                wordLimit: session.writing.wordLimit,
                level: session.writing.level,
            };
        }

        const essayModuleSnapshot = session.writing.moduleSnapshot;
        if (!essayModuleSnapshot) {
            throw new AppError('Essay module snapshot is missing in placement session', HttpStatus.UNPROCESSABLE_ENTITY);
        }

        const level = pickWritingLevel(payload.lrScore);
        const topics = essayModuleSnapshot.topicsByLevel[level] ?? [];
        const prompt = pickRandomOne(topics)
            ?? pickRandomOne(essayModuleSnapshot.topicsByLevel.mid)
            ?? 'Describe a memorable experience and explain why it was meaningful to you.';
        const wordLimit = essayModuleSnapshot.wordLimits[level] ?? essayModuleSnapshot.wordLimits.mid;
        const writingAttemptId = new mongoose.Types.ObjectId().toString();

        const updated = await placementSessionMongoRepository.patchById(sessionId, {
            $set: {
                currentModule: EPlacementSessionModule.WRITING,
                'writing.attemptId': writingAttemptId,
                'writing.level': level,
                'writing.prompt': prompt,
                'writing.promptImageUrl': essayModuleSnapshot.promptImageUrl ?? null,
                'writing.timeLimitMinutes': essayModuleSnapshot.timeLimitMinutes,
                'writing.wordLimit': wordLimit,
                'writing.status': EPlacementSubmoduleStatus.IN_PROGRESS,
            },
        });

        if (!updated) {
            throw new AppError('Failed to initialize writing attempt', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        return {
            writingAttemptId,
            prompt,
            promptImageUrl: essayModuleSnapshot.promptImageUrl ?? undefined,
            timeLimitMinutes: essayModuleSnapshot.timeLimitMinutes,
            wordLimit,
            level,
        };
    }

    async submitWritingAttempt(
        userId: string,
        sessionId: string,
        payload: SubmitWritingAttemptBody,
    ): Promise<SubmitResult> {
        const session = await this.getSessionOrThrow(userId, sessionId);

        if (!session.writing?.attemptId || session.writing.attemptId !== payload.writingAttemptId) {
            throw new AppError('Invalid writing attempt id for this session', HttpStatus.BAD_REQUEST);
        }

        const updated = await placementSessionMongoRepository.patchById(sessionId, {
            $set: {
                'writing.status': EPlacementSubmoduleStatus.PENDING,
                'writing.essay': payload.essay,
                'writing.wordCount': payload.wordCount,
                'writing.durationSeconds': payload.durationSeconds,
            },
        });

        if (!updated) {
            throw new AppError('Failed to submit writing attempt', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        const job = await writingGradingQueue.add('grade-writing-attempt', {
            sessionId,
            writingAttemptId: payload.writingAttemptId,
            essay: payload.essay,
            promptText: session.writing.prompt ?? '',
            criteria: ['TR', 'CC', 'LR', 'GRA'],
        });

        return {
            jobId: String(job.id),
            status: 'grading',
        };
    }

    async getWritingResult(userId: string, sessionId: string): Promise<WritingResult> {
        const session = await this.getSessionOrThrow(userId, sessionId);

        if (session.writing?.status === EPlacementSubmoduleStatus.NOT_STARTED || session.writing?.status === EPlacementSubmoduleStatus.IN_PROGRESS) {
            return {
                status: 'pending',
            };
        }

        if (session.writing?.status === EPlacementSubmoduleStatus.PENDING) {
            return {
                status: 'grading',
            };
        }

        return {
            status: 'done',
            band: session.writing.band ?? undefined,
            criteria: session.writing.criteria ?? undefined,
            feedback: session.writing.feedback ?? undefined,
        };
    }

    async startSpeakingAttempt(userId: string, sessionId: string): Promise<StartSpeakingResult> {
        const session = await this.getSessionOrThrow(userId, sessionId);

        if (session.speaking?.attemptId && session.speaking.cueCard && session.speaking.part1Qs.length > 0 && session.speaking.part3Qs.length > 0) {
            return {
                speakingAttemptId: session.speaking.attemptId,
                part1Qs: session.speaking.part1Qs,
                cueCard: session.speaking.cueCard,
                part3Qs: session.speaking.part3Qs,
                config: session.speaking.config ?? undefined,
            };
        }

        const { speakingModule } = await this.getPlacementModulesFromSession(session);
        const level = pickWritingLevel(session.lrRawScore);
        const speakingAttemptId = new mongoose.Types.ObjectId().toString();

        const part1Qs = pickSpeakingQuestions(
            speakingModule.parts.part1.topics,
            speakingModule.parts.part1.questionsRange,
        );

        const part3Qs = pickSpeakingQuestions(
            speakingModule.parts.part3.topics,
            speakingModule.parts.part3.questionsRange,
        );

        const cuePoolByLevel = speakingModule.parts.part2.cueCards.filter((cueCard) => cueCard.level === level);
        const cueCard = pickRandomOne(cuePoolByLevel) ?? pickRandomOne(speakingModule.parts.part2.cueCards);

        if (!cueCard || part1Qs.length === 0 || part3Qs.length === 0) {
            throw new AppError('Speaking module question bank is not sufficient', HttpStatus.UNPROCESSABLE_ENTITY);
        }

        const serializedPart1Qs = part1Qs.map((item) => ({ text: item.text, audioKey: item.audioKey }));
        const serializedPart3Qs = part3Qs.map((item) => ({ text: item.text, audioKey: item.audioKey }));
        const serializedCueCard = {
            text: cueCard.text,
            audioKey: cueCard.audioKey,
            shouldSay: cueCard.shouldSay,
        };

        const updated = await placementSessionMongoRepository.patchById(sessionId, {
            $set: {
                currentModule: EPlacementSessionModule.SPEAKING,
                'speaking.attemptId': speakingAttemptId,
                'speaking.status': EPlacementSubmoduleStatus.IN_PROGRESS,
                'speaking.part1Qs': serializedPart1Qs,
                'speaking.cueCard': serializedCueCard,
                'speaking.part3Qs': serializedPart3Qs,
                'speaking.config': {
                    ttsVoice: speakingModule.ttsVoice ?? null,
                    gradingModel: speakingModule.gradingModel ?? null,
                    silenceThresholdSeconds: speakingModule.silenceThresholdSeconds ?? null,
                },
            },
        });

        if (!updated) {
            throw new AppError('Failed to initialize speaking attempt', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        return {
            speakingAttemptId,
            part1Qs: serializedPart1Qs,
            cueCard: serializedCueCard,
            part3Qs: serializedPart3Qs,
            config: {
                ttsVoice: speakingModule.ttsVoice,
                gradingModel: speakingModule.gradingModel,
                silenceThresholdSeconds: speakingModule.silenceThresholdSeconds,
            },
        };
    }

    async uploadSpeakingAudioChunk(
        userId: string,
        sessionId: string,
        payload: UploadSpeakingAudioChunkBody,
        file: Express.Multer.File | undefined,
    ): Promise<UploadAudioChunkResult> {
        const session = await this.getSessionOrThrow(userId, sessionId);

        if (!session.speaking?.attemptId || session.speaking.attemptId !== payload.speakingAttemptId) {
            throw new AppError('Invalid speaking attempt id for this session', HttpStatus.BAD_REQUEST);
        }

        let transcript: string | null = payload.transcript?.trim() || null;

        if (!transcript && file?.buffer?.length) {
            try {
                const transcriptionResult = await speakingPipelineService.transcribeAudio(file.buffer);
                transcript = transcriptionResult.transcript.trim() || null;
            } catch (error) {
                logger.warn('[Placement Session] Failed to auto-transcribe speaking chunk', {
                    sessionId,
                    speakingAttemptId: payload.speakingAttemptId,
                    part: payload.part,
                    questionIdx: payload.questionIdx,
                    error,
                });
            }
        }

        const updated = await placementSessionMongoRepository.patchById(sessionId, {
            $push: {
                'speaking.audioChunks': {
                    part: payload.part,
                    questionIdx: payload.questionIdx,
                    byteSize: file?.size ?? 0,
                    mimeType: file?.mimetype ?? null,
                    transcript,
                    pronunciationData: payload.pronunciationData
                        ? (() => {
                            try {
                                return JSON.parse(payload.pronunciationData) as Record<string, unknown>;
                            } catch {
                                return null;
                            }
                        })()
                        : null,
                    uploadedAt: new Date(),
                },
            },
        });

        if (!updated) {
            throw new AppError('Failed to save speaking audio chunk', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        return { saved: true };
    }

    async submitSpeakingAttempt(
        userId: string,
        sessionId: string,
        payload: SubmitSpeakingAttemptBody,
    ): Promise<SubmitResult> {
        const session = await this.getSessionOrThrow(userId, sessionId);

        if (!session.speaking?.attemptId || session.speaking.attemptId !== payload.speakingAttemptId) {
            throw new AppError('Invalid speaking attempt id for this session', HttpStatus.BAD_REQUEST);
        }

        const updated = await placementSessionMongoRepository.patchById(sessionId, {
            $set: {
                currentModule: EPlacementSessionModule.RESULT,
                'speaking.status': EPlacementSubmoduleStatus.PENDING,
            },
        });

        if (!updated) {
            throw new AppError('Failed to submit speaking attempt', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        const job = await speakingGradingQueue.add('grade-speaking-attempt', {
            sessionId,
            speakingAttemptId: payload.speakingAttemptId,
            transcripts: session.speaking.audioChunks
                .map((chunk) => chunk.transcript)
                .filter((item): item is string => Boolean(item && item.trim())),
            pronunciationData: session.speaking.audioChunks
                .map((chunk) => chunk.pronunciationData)
                .filter((item): item is Record<string, unknown> => Boolean(item)),
        });

        return {
            jobId: String(job.id),
            status: 'grading',
        };
    }

    async getSpeakingResult(userId: string, sessionId: string): Promise<SpeakingResult> {
        const session = await this.getSessionOrThrow(userId, sessionId);

        if (session.speaking?.status === EPlacementSubmoduleStatus.NOT_STARTED || session.speaking?.status === EPlacementSubmoduleStatus.IN_PROGRESS) {
            return {
                status: 'pending',
            };
        }

        if (session.speaking?.status === EPlacementSubmoduleStatus.PENDING) {
            return {
                status: 'grading',
            };
        }

        return {
            status: 'done',
            band: session.speaking.band ?? undefined,
            criteria: session.speaking.criteria ?? undefined,
            feedback: session.speaking.feedback ?? undefined,
        };
    }

    async getPlacementResult(userId: string, sessionId: string): Promise<PlacementResult> {
        const session = await this.getSessionOrThrow(userId, sessionId);

        if (session.writing.status !== EPlacementSubmoduleStatus.DONE || session.speaking.status !== EPlacementSubmoduleStatus.DONE) {
            return {
                status: 'computing',
                sessionId,
                cefr: session.lrScoring.provisionalCefr,
                cefrDescription: 'AI dang tiep tuc tong hop ket qua.',
                scores: {
                    listening: {
                        rawPercent: session.lrScoring.listeningRawPercent,
                        cefr: session.lrScoring.provisionalCefr,
                    },
                    reading: {
                        rawPercent: session.lrScoring.readingRawPercent,
                        cefr: session.lrScoring.provisionalCefr,
                    },
                    writing: {
                        band: 0,
                    },
                    speaking: {
                        band: 0,
                    },
                },
                feedback: {},
            };
        }

        const placementTest = await placementTestMongoRepository.findByIdWithModules(String(session.placementTestId));
        const writingBand = session.writing.band ?? 0;
        const speakingBand = session.speaking.band ?? 0;
        const lrPercentNormalized = Math.max(0, Math.min(1, ((session.lrScoring.listeningRawPercent + session.lrScoring.readingRawPercent) / 2) / 100));
        const writingBandNormalized = Math.max(0, Math.min(1, writingBand / 9));
        const speakingBandNormalized = Math.max(0, Math.min(1, speakingBand / 9));

        const cefr = placementTest
            ? computeFinalCEFR({
                lrPercent: lrPercentNormalized,
                writingBandNormalized,
                speakingBandNormalized,
                weights: placementTest.cefrMapping.weights,
                thresholds: placementTest.cefrMapping.thresholds as ICEFRThreshold[],
            })
            : getCefrByBand((writingBand + speakingBand) / 2);

        logger.info('Placement result resolved', {
            sessionId,
            userId,
            cefr,
            writingBand,
            speakingBand,
        });

        let overallFeedback = session.overallFeedback?.trim() || null;
        if (!overallFeedback) {
            overallFeedback = await buildAiOverallFeedback({
                cefr,
                listeningPercent: session.lrScoring.listeningRawPercent,
                readingPercent: session.lrScoring.readingRawPercent,
                writingBand,
                speakingBand,
            });

            if (overallFeedback) {
                await placementSessionMongoRepository.patchById(sessionId, {
                    $set: {
                        overallFeedback,
                    },
                });
            }
        }

        return {
            status: 'ready',
            sessionId,
            cefr,
            cefrDescription: overallFeedback ?? `Ban dang o muc ${cefr}. He thong da tong hop ket qua tu ca 4 ky nang de de xuat lo trinh hoc phu hop.`,
            scores: {
                listening: {
                    rawPercent: session.lrScoring.listeningRawPercent,
                    cefr,
                },
                reading: {
                    rawPercent: session.lrScoring.readingRawPercent,
                    cefr,
                },
                writing: {
                    band: writingBand,
                    cefr: getCefrByBand(writingBand),
                    criteria: session.writing.criteria ?? undefined,
                },
                speaking: {
                    band: speakingBand,
                    cefr: getCefrByBand(speakingBand),
                    criteria: session.speaking.criteria ?? undefined,
                },
            },
            feedback: {
                writing: session.writing.feedback ?? undefined,
                speaking: session.speaking.feedback ?? undefined,
            },
        };
    }
}

export const placementSessionService = new PlacementSessionService();
