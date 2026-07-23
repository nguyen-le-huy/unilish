import type { AiVoiceLevel, AiVoiceScenario, AiVoiceTopic } from '../validations/ai-voice.validation.js';

interface BuildSystemPromptParams {
    scenario: AiVoiceScenario;
    level: AiVoiceLevel;
    topic: AiVoiceTopic;
    maxTurns: number;
    shouldEndConversation: boolean;
}

const levelGuidanceMap: Record<AiVoiceLevel, string> = {
    'free-level': 'Use neutral conversational English and adapt naturally to the learner in real time.',
    a1: 'Use very simple words, short sentences, and clear everyday expressions.',
    a2: 'Use simple daily vocabulary, short clauses, and gentle follow-up questions.',
    b1: 'Use practical vocabulary and moderate sentence structures suitable for independent users.',
    b2: 'Use richer vocabulary with natural connectors and varied but clear sentence forms.',
    c1: 'Use advanced natural language with idiomatic but understandable expressions.',
    c2: 'Use fluent, nuanced, native-like language while staying concise and approachable.',
};

const topicGuidanceMap: Record<string, string> = {
    'free-talk': 'Keep the conversation broad, personal, and friendly without fixed scripts.',
    'ielts-speaking': 'Use IELTS-style spoken prompts naturally, but keep it as a real conversation.',
    travel: 'Prioritize travel situations such as airport, hotel, restaurant, transport, and directions.',
    office: 'Prioritize workplace situations such as meetings, task updates, scheduling, and collaboration.',
};

const closingSentence = 'It was great talking to you! Goodbye and good luck with your English!';

const inferAssistantPersona = (topic: AiVoiceTopic, scenario: AiVoiceScenario): string => {
    const normalized = `${scenario.title} ${scenario.description}`.toLowerCase();

    if (/quán cà phê|cà phê|coffee|barista|nhà hàng|restaurant|menu|đồ uống/.test(normalized)) {
        return 'a cafe or restaurant staff member helping the customer';
    }

    if (/khách sạn|hotel|lễ tân|check-in|check in/.test(normalized)) {
        return 'a hotel receptionist assisting a guest';
    }

    if (/ga tàu|station|sân bay|airport|vé|ticket|chuyến|platform/.test(normalized)) {
        return 'a station or airport staff member giving travel support';
    }

    if (/phỏng vấn|interview|tuyển dụng/.test(normalized)) {
        return 'an interviewer evaluating the candidate';
    }

    if (/họp|meeting|deadline|báo cáo|office|công sở/.test(normalized)) {
        return 'a coworker or manager in a workplace conversation';
    }

    if (/bệnh viện|hospital|bác sĩ|doctor|triệu chứng/.test(normalized)) {
        return 'a doctor or nurse speaking with a patient';
    }

    if (topic === 'ielts-speaking') {
        return 'an IELTS speaking examiner conducting a natural test-style interview';
    }

    if (topic === 'office') {
        return 'a coworker or manager in a workplace conversation';
    }

    if (topic === 'travel') {
        return 'a service staff member or local person helping a traveler';
    }

    return 'a natural conversation partner speaking with the learner';
};

export const aiVoicePromptBuilder = {
    buildSystemPrompt: ({
        scenario,
        level,
        topic,
        maxTurns,
        shouldEndConversation,
    }: BuildSystemPromptParams): string => {
        const assistantPersona = inferAssistantPersona(topic, scenario);
        const lines: string[] = [];

        lines.push('You are an in-character conversation partner helping the learner practice spoken English.');
        lines.push(`You are role-playing as: ${assistantPersona}.`);
        lines.push('Important: the Vietnamese phrase "Bạn là ..." in scenario text describes the learner role, not your role.');
        lines.push('Never speak as the learner persona. Always reply as the counterpart character talking to the learner.');
        lines.push(`Learner scenario context (for reference): ${scenario.description}`);
        lines.push(`Scenario title: ${scenario.title}`);

        lines.push('');
        lines.push('Level adaptation:');
        lines.push(`- CEFR target: ${level}.`);
        lines.push(`- ${levelGuidanceMap[level]}`);

        lines.push('');
        lines.push('Topic context:');
        lines.push(`- Topic: ${topic}.`);
        lines.push(`- ${topicGuidanceMap[topic] ?? 'Follow the administrator-defined scenario and keep the role-play natural.'}`);

        lines.push('');
        lines.push('Conversation rules:');
        lines.push('- Keep each reply concise: 2-4 sentences.');
        lines.push('- Stay fully in character and respond naturally like a real person in this situation.');
        lines.push('- Do not teach grammar, do not explain vocabulary, and do not switch into tutor mode.');
        lines.push('- On the first turn, open as the counterpart role (for example staff/receptionist/examiner), not as customer/learner.');
        lines.push('- Ask at most one direct question per turn.');
        lines.push(`- Conversation should finish naturally by around ${maxTurns} prior turns from the learner+assistant history.`);

        if (shouldEndConversation) {
            lines.push('- This is the closing turn. End the conversation now with a warm farewell.');
            lines.push(`- You must include this exact sentence at the end: "${closingSentence}"`);
        } else {
            lines.push('- Continue the conversation naturally and keep the flow moving forward.');
        }

        lines.push('');
        lines.push('Special start behavior:');
        lines.push('- If the user message is a start signal, begin with a warm greeting and one short opening question.');
        lines.push('- Respond in English only.');

        return lines.join('\n');
    },
};

export const AI_VOICE_CLOSING_SENTENCE = closingSentence;
