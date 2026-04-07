import OpenAI from 'openai';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/app-error.js';
import { HttpStatus } from '../constants/http-status.js';
import { listeningRepo } from '../repositories/mongo/listening.mongo.repository.js';
import { listeningMixSyncQueue } from '../jobs/queues/listening-mix-sync.queue.js';
import { ContextAlignmentService } from './context-alignment.service.js';
import type { GenerateListeningScriptBody, MixAndSyncBody } from '../validations/listening.validation.js';
import type { TranscriptLine } from '../types/lesson-content.types.js';

// ─── Infrastructure ───────────────────────────────────────────────────────────

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

// ─── Service ──────────────────────────────────────────────────────────────────

export class ListeningAiService {

    private static readonly PROCESSING_STATUSES = new Set([
        'GENERATING_SCRIPT',
        'GENERATING_AUDIO',
        'SYNCING',
    ]);

    // ── GENERATE SCRIPT ───────────────────────────────────────────────────────

    /**
     * Use OpenAI GPT to draft a dialogue transcript for a LISTENING lesson.
     * Persists the transcript to MongoDB and sets generationStatus → IDLE.
     */
    static async generateScript(
        lessonId: string,
        body: GenerateListeningScriptBody,
    ): Promise<TranscriptLine[]> {
        const { lineCount = 8, speakerCount = 2, scriptFormat = 'DIALOGUE', topic } = body;

        // Guard: lesson must exist and be LISTENING type
        const existing = await listeningRepo.getContent(lessonId);
        const context = await ContextAlignmentService.getUnitContext(lessonId);

        const accent = existing.media.accent;
        const accentLabel = accent === 'en-UK' ? 'British English' : accent === 'mixed' ? 'mixed American/British English' : 'American English';
        const resolvedTopic = topic ?? context.scenario ?? 'everyday conversational scenario (airport, restaurant, hotel, office, etc.)';

        const systemPrompt = `You are a professional EFL content writer who creates natural, engaging listening dialogues for language learners. 
Write dialogues that use realistic conversational language with natural speech patterns.
Always respond with valid JSON only — no markdown, no code-fences.`;

        const formatInstruction = scriptFormat === 'PODCAST'
            ? `- Format style: PODCAST (host-driven flow, natural long-form conversation, informative but friendly)
    - Suggested roles: Host, Guest/Expert
    - Keep transitions smooth between lines (intro → discussion → wrap-up)`
            : scriptFormat === 'NEWS'
            ? `- Format style: NEWS (news bulletin/report tone, concise factual statements)
    - Suggested roles: News Anchor, Field Reporter / Witness
    - Keep wording formal-clear and information-oriented`
            : `- Format style: DIALOGUE (everyday role-play conversation)
    - Suggested roles: context-based participants (e.g., staff/customer, traveler/officer)
    - Keep lines highly interactive with turn-taking`;

        const userPrompt = `Write a listening dialogue for an English language lesson.

Requirements:
- Exactly ${lineCount} lines of dialogue
- Exactly ${speakerCount} speakers (give them realistic first names)
- Each speaker should have a role/occupation relevant to the scenario
- Language: ${accentLabel}
- Script format: ${scriptFormat}
${formatInstruction}
- Unit Scenario (must follow): ${context.scenario || 'everyday conversational scenario'}
- Unit Keywords (must naturally include several): ${context.keywords.join(', ') || 'none'}
- Topic: ${resolvedTopic}

Return a JSON array with this exact schema — no extra fields:
[
  {
    "id": "<uuid-v4>",
    "speaker": "<FirstName>",
    "role": "<Role/Occupation>",
    "text": "<dialogue line>",
    "translation": "<Vietnamese translation of this line>",
    "startTime": 0,
    "endTime": 0,
    "words": []
  },
  {
    "id": "<uuid-v4>",
    "speaker": "<FirstName>",
    "role": "<Role/Occupation>",
    "text": "<dialogue line>",
    "translation": "<Vietnamese translation of this line>",
    "startTime": 0,
    "endTime": 0,
    "words": []
  }
  // ... continue until exactly ${lineCount} objects
]

Important:
- ids must be unique UUID v4 strings
- Keep each line under 150 characters
- Output must be valid JSON only (no markdown, no explanation)
- Never return {"error": "..."} — always return the dialogue array.`;

    logger.info('[ListeningAiService] generateScript → calling OpenAI', {
        lessonId,
        lineCount,
        speakerCount,
        scriptFormat,
    });

        const completion = await openai.chat.completions.create({
            model: env.OPENAI_MODEL,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
        });

        const raw = completion.choices[0]?.message?.content ?? '';
        const cleanRaw = raw
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/\s*```$/, '')
            .trim();

        let transcript: TranscriptLine[];
        try {
            // GPT may wrap in { "dialogue": [...] } or return array directly
            const parsed = JSON.parse(cleanRaw);
            transcript = Array.isArray(parsed)
                ? parsed
                : (parsed.dialogue ?? parsed.transcript ?? parsed.lines ?? Object.values(parsed)[0]);

            if (!Array.isArray(transcript)) {
                throw new Error('Parsed value is not an array');
            }
        } catch (err) {
            logger.error('[ListeningAiService] Failed to parse OpenAI JSON response', { raw: cleanRaw, err });
            throw new AppError('AI trả về dữ liệu không hợp lệ. Vui lòng thử lại.', HttpStatus.BAD_GATEWAY);
        }

        // Normalise fields — ensure id, words default etc.
        const normalised: TranscriptLine[] = transcript.map((line, i) => ({
            id: line.id ?? crypto.randomUUID(),
            speaker: String(line.speaker ?? `Speaker ${i + 1}`),
            role: String(line.role ?? ''),
            text: String(line.text ?? ''),
            translation: String(line.translation ?? ''),
            startTime: 0,
            endTime: 0,
            words: [],
        }));

        await ContextAlignmentService.assertLessonAligned(
            lessonId,
            [
                context.scenario,
                ...normalised.flatMap((line) => [line.speaker, line.role, line.text, line.translation ?? '']),
            ],
            'LISTENING',
        );

        // Persist transcript only — does not touch media/interactiveConfig
        await listeningRepo.setTranscript(lessonId, normalised);

        logger.info('[ListeningAiService] generateScript complete', { lessonId, lines: normalised.length });

        return normalised;
    }

    // ── ENQUEUE MIX & SYNC ────────────────────────────────────────────────────

    /**
     * Validate state then enqueue the heavy Mix & Sync pipeline job.
     * Returns immediately — the worker runs asynchronously.
     *
     * Pipeline (inside worker):
     *   1. ElevenLabs TTS → per-speaker MP3 files
     *   2. FFmpeg mix → interleaved audio + optional background noise → upload to R2
     *   3. Deepgram Nova-2 → word-level timestamps → patch transcript
     */
    static async enqueueMixAndSync(
        lessonId: string,
        body: MixAndSyncBody,
    ): Promise<{ jobId: string }> {
        const content = await listeningRepo.getContent(lessonId);

        if (content.transcript.length === 0) {
            throw new AppError(
                'Bài học chưa có kịch bản. Hãy tạo kịch bản trước khi Mix & Sync.',
                HttpStatus.BAD_REQUEST,
            );
        }

        if (!env.ELEVENLABS_API_KEY) {
            throw new AppError(
                'ELEVENLABS_API_KEY chưa được cấu hình trên server.',
                HttpStatus.SERVICE_UNAVAILABLE,
            );
        }

        // DEEPGRAM_API_KEY is optional — word-level sync will be skipped in the
        // worker if the key is absent, but audio generation still proceeds.

        const jobId = `mix-sync-${lessonId}`;
        const existingJob = await listeningMixSyncQueue.getJob(jobId);
        if (existingJob) {
            const existingState = await existingJob.getState();

            // waiting | active | delayed | prioritized | waiting-children
            if (
                existingState !== 'completed'
                && existingState !== 'failed'
            ) {
                logger.info('[ListeningAiService] enqueueMixAndSync: existing in-flight job reused', {
                    lessonId,
                    jobId,
                    existingState,
                });
                await listeningRepo.setGenerationStatus(lessonId, 'GENERATING_AUDIO');
                return { jobId };
            }

            // Remove old terminal job so a fresh run can be enqueued with same deterministic id.
            await existingJob.remove();
        }

        // Set status → GENERATING_AUDIO immediately so the frontend polling starts
        await listeningRepo.setGenerationStatus(lessonId, 'GENERATING_AUDIO');

        const job = await listeningMixSyncQueue.add(
            'mix-and-sync',
            {
                lessonId,
                transcript: content.transcript,
                accent: content.media.accent,
                noiseLevel: content.media.noiseLevel,
                speakerVoiceMap: body.speakerVoiceMap ?? {},
            },
            {
                jobId,
                removeOnFail: false,              // keep for inspection on failure
            },
        );

        logger.info('[ListeningAiService] enqueueMixAndSync enqueued', { lessonId, jobId: job.id });

        return { jobId: job.id ?? `mix-sync-${lessonId}` };
    }

    // ── CANCEL MIX & SYNC ─────────────────────────────────────────────────────

    /**
     * Remove the BullMQ job (if still waiting/active) and reset generationStatus
     * back to IDLE so the user can re-trigger the pipeline.
     */
    static async cancelMixAndSync(lessonId: string): Promise<void> {
        const jobId = `mix-sync-${lessonId}`;
        const job = await listeningMixSyncQueue.getJob(jobId);

        if (job) {
            const state = await job.getState();
            // Only forcibly remove if not already completed
            if (state !== 'completed') {
                await job.remove();
                logger.info('[ListeningAiService] cancelMixAndSync: job removed', { lessonId, jobId, state });
            }
        }

        // Always reset status so the UI unlocks
        await listeningRepo.setGenerationStatus(lessonId, 'IDLE');
        logger.info('[ListeningAiService] cancelMixAndSync: status reset to IDLE', { lessonId });
    }

    // ── SYNC STATUS ───────────────────────────────────────────────────────────

    /**
     * Return only the generationStatus field — lightweight poll endpoint.
     */
    static async getSyncStatus(lessonId: string): Promise<{
        status: string;
        progress: number;
        result?: {
            audioUrl: string | null;
            duration: number;
            transcript: TranscriptLine[];
        };
    }> {
        const content = await listeningRepo.getContent(lessonId);
        const jobId = `mix-sync-${lessonId}`;
        const job = await listeningMixSyncQueue.getJob(jobId);

        if (job) {
            const state = await job.getState();
            const rawProgress = await job.progress;
            const progress = typeof rawProgress === 'number' ? rawProgress : 0;

            if (state === 'failed') {
                if (content.generationStatus !== 'ERROR') {
                    await listeningRepo.setGenerationStatus(lessonId, 'ERROR');
                }
                return { status: 'ERROR', progress: Math.min(progress, 99) };
            }

            if (state === 'completed') {
                if (content.generationStatus !== 'DONE') {
                    await listeningRepo.setGenerationStatus(lessonId, 'DONE');
                }
                const latest = await listeningRepo.getContent(lessonId);
                return {
                    status: 'DONE',
                    progress: 100,
                    result: {
                        audioUrl: latest.media.audioUrl,
                        duration: latest.media.duration,
                        transcript: latest.transcript,
                    },
                };
            }

            // waiting | active | delayed | prioritized | waiting-children
            if (content.generationStatus === 'SYNCING') {
                return { status: 'SYNCING', progress: Math.max(progress, 78) };
            }

            if (content.generationStatus === 'GENERATING_AUDIO' || content.generationStatus === 'GENERATING_SCRIPT') {
                return { status: content.generationStatus, progress: Math.max(progress, 10) };
            }

            return { status: 'GENERATING_AUDIO', progress: Math.max(progress, 10) };
        }

        // No BullMQ job found. If DB still says processing (often after restart / stale cache),
        // recover to a terminal state so UI will not spin forever.
        if (ListeningAiService.PROCESSING_STATUSES.has(content.generationStatus)) {
            const recoveredStatus = content.media.audioUrl ? 'DONE' : 'IDLE';
            await listeningRepo.setGenerationStatus(lessonId, recoveredStatus);
            if (recoveredStatus === 'DONE') {
                const latest = await listeningRepo.getContent(lessonId);
                return {
                    status: 'DONE',
                    progress: 100,
                    result: {
                        audioUrl: latest.media.audioUrl,
                        duration: latest.media.duration,
                        transcript: latest.transcript,
                    },
                };
            }
            return { status: recoveredStatus, progress: 0 };
        }

        if (content.generationStatus === 'DONE') {
            return {
                status: 'DONE',
                progress: 100,
                result: {
                    audioUrl: content.media.audioUrl,
                    duration: content.media.duration,
                    transcript: content.transcript,
                },
            };
        }
        if (content.generationStatus === 'ERROR') return { status: 'ERROR', progress: 0 };
        return { status: content.generationStatus, progress: 0 };
    }
}
