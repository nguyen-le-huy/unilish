// ─── Question Factory ─────────────────────────────────────────────────────────
// Single unified factory replacing 6 near-identical createPartXQuestion() functions.

export interface ManualQuestion {
    question: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctOption: 'A' | 'B' | 'C' | 'D';
    explanation: string;
    transcript: string;
    mediaUrl: string;
    imageUrl: string;
    imageUrls: string[];
    audioUrl: string;
}

export function createDefaultQuestion(part: number, index: number, audioUrl = ''): ManualQuestion {
    const base: ManualQuestion = {
        question: `Part ${part} Question ${index + 1}`,
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        correctOption: 'A',
        explanation: '',
        transcript: '',
        mediaUrl: '',
        imageUrl: '',
        imageUrls: [],
        audioUrl,
    };

    // Part 1 — Photographs: options are letter labels (A/B/C/D)
    if (part === 1) {
        base.optionA = 'A';
        base.optionB = 'B';
        base.optionC = 'C';
        base.optionD = 'D';
    }

    // Part 2 — Question-Response: only 3 choices (A/B/C), D is N/A
    if (part === 2) {
        base.optionD = 'N/A';
    }

    return base;
}
