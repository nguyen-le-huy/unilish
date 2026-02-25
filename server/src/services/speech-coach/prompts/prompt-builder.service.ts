/**
 * @module prompt-builder.service
 * @description Composes system prompts and greeting messages by combining persona templates
 * with runtime context (user language, lesson metadata, Pinecone-retrieved context).
 * Phase 0: Template-based. Phase 1+: Can be augmented with RAG context from Pinecone.
 */

import { logger } from '../../../utils/logger.js';
import { AppError } from '../../../utils/app-error.js';
import { HttpStatus } from '../../../constants/http-status.js';
import { PERSONA_TEMPLATES } from './prompt-template.registry.js';
import type { SpeakingPersonaId } from '../contracts/session.contract.js';

export interface SystemPromptContext {
    readonly personaId: SpeakingPersonaId;
    readonly targetLanguage: string;
    readonly lessonTopic?: string;
    readonly ragContext?: string; // Injected from Pinecone in Phase 1+
}

export class PromptBuilderService {
    /**
     * Build the full system prompt for the OpenAI engine.
     */
    buildSystemPrompt(context: SystemPromptContext): string {
        const template = PERSONA_TEMPLATES[context.personaId];
        if (!template) {
            throw new AppError(
                `Unknown personaId: ${context.personaId}`,
                HttpStatus.BAD_REQUEST,
            );
        }

        let prompt = template.systemPrompt;

        if (context.lessonTopic) {
            prompt += `\n\nThe current lesson topic is: "${context.lessonTopic}". Keep the conversation focused on this topic.`;
        }

        if (context.ragContext) {
            prompt += `\n\nAdditional context retrieved for this lesson:\n${context.ragContext}`;
        }

        logger.debug('[PromptBuilderService] System prompt built', {
            personaId: context.personaId,
            targetLanguage: context.targetLanguage,
            hasLessonTopic: !!context.lessonTopic,
            hasRagContext: !!context.ragContext,
        });

        return prompt;
    }

    /**
     * Build a persona greeting message for session start.
     * Falls back to English if the target language has no template.
     */
    async buildGreeting(personaId: SpeakingPersonaId, targetLanguage: string): Promise<string> {
        const template = PERSONA_TEMPLATES[personaId];
        if (!template) {
            throw new AppError(
                `Unknown personaId: ${personaId}`,
                HttpStatus.BAD_REQUEST,
            );
        }

        const greeting =
            template.greetings[targetLanguage] ?? template.greetings['en'] ?? '';

        logger.debug('[PromptBuilderService] Greeting built', {
            personaId,
            targetLanguage,
            usedFallback: !template.greetings[targetLanguage],
        });

        return greeting;
    }
}
