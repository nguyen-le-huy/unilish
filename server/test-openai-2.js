import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
async function main() {
    console.log("Starting...");
    try {
        const stream = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'You are an Immigration Officer. Ask 1 question per turn. NEVER return an empty response. If the conversation is over, say goodbye.' },
                { role: 'assistant', content: 'Hello.' },
                { role: 'user', content: 'Hello, my full name is Nguyen Le Huy. I am a student. I am from Vietnam, and here is my passport.' },
                { role: 'assistant', content: 'Thank you, Nguyen Le Huy. I see you are a student from Vietnam. How long will you be staying in the country?' },
                { role: 'user', content: 'maybe two weeks.' },
                { role: 'assistant', content: 'Two weeks, did you say? Could you please confirm - will you stay for two weeks? Where will you be staying during your visit? Please give the name of the hotel or the address of the place. And do you have a return ticket?' },
                { role: 'user', content: 'I will stay for two weeks. I will stay at Holiday Hotel in New York City. Yes, I have a return ticket.' }
            ],
            stream: true,
            max_completion_tokens: 256,
        });
        
        let result = '';
        for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || '';
            process.stdout.write(text);
            result += text;
        }
        console.log('\n\nFinal Output length:', result.length);
    } catch (e) {
        console.error("API error:", e);
    }
}
main();
