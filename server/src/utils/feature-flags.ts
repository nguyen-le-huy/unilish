import type { IeltsSkill } from '../types/ielts-practice.types.js';

/**
 * Get the env var value for a skill's feature flag.
 * Each skill can be independently enabled via env vars:
 *   IELTS_PRACTICE_LISTENING_ENABLED
 *   IELTS_PRACTICE_READING_ENABLED
 *   IELTS_PRACTICE_WRITING_ENABLED
 *   IELTS_PRACTICE_SPEAKING_ENABLED
 */
function getFlagValue(skill: IeltsSkill): string | undefined {
    const map: Record<string, string> = {
        listening: 'IELTS_PRACTICE_LISTENING_ENABLED',
        reading: 'IELTS_PRACTICE_READING_ENABLED',
        writing: 'IELTS_PRACTICE_WRITING_ENABLED',
        speaking: 'IELTS_PRACTICE_SPEAKING_ENABLED',
    };
    const key = map[skill];
    if (!key) return undefined;
    return process.env[key];
}

/**
 * Check if a given IELTS Practice skill is enabled via feature flag.
 * Returns true unless explicitly set to 'false'.
 */
export function isSkillEnabled(skill: IeltsSkill): boolean {
    const value = getFlagValue(skill);
    return value !== 'false';
}

/**
 * Check if a skill string is a valid and enabled IELTS skill.
 */
export function isSkillAvailable(skill: string): boolean {
    const validSkills: IeltsSkill[] = ['listening', 'reading', 'writing', 'speaking'];
    if (!validSkills.includes(skill as IeltsSkill)) return false;
    return isSkillEnabled(skill as IeltsSkill);
}
