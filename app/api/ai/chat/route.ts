import { NextRequest, NextResponse } from 'next/server';
import { generateEmmaAIResponse } from '@/lib/aiAgent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history = [], userLevel = 'B1' } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message text is required' }, { status: 400 });
    }

    // 1. If an external LLM API key is configured (Groq, OpenAI, Gemini), optional bridge can be called
    const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
    if (apiKey) {
      try {
        const endpoint = process.env.GROQ_API_KEY 
          ? 'https://api.groq.com/openai/v1/chat/completions' 
          : 'https://api.openai.com/v1/chat/completions';
        const model = process.env.GROQ_API_KEY ? 'llama-3.1-8b-instant' : 'gpt-4o-mini';

        const systemPrompt = `You are Emma, a friendly, encouraging, and articulate 24/7 AI English Speaking Partner and Fluency Coach on English Booster.
Your mission is to help international learners practice English dialogue naturally, comfortably, and effectively.
- Always communicate in clear, natural, engaging English.
- Adapt your vocabulary to the learner's level (${userLevel}).
- Keep responses conversational (2-4 sentences max per turn) so the user gets plenty of speaking practice.
- Ask an engaging open-ended question at the end of each response to maintain the conversation.
- If the learner makes a clear grammar mistake, include a short, gentle, friendly tip at the end.`;

        const messages = [
          { role: 'system', content: systemPrompt },
          ...history.slice(-6).map((h: any) => ({
            role: h.sender === 'user' ? 'user' : 'assistant',
            content: h.text,
          })),
          { role: 'user', content: message }
        ];

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.7,
            max_tokens: 250,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const reply = data.choices?.[0]?.message?.content;
          if (reply) {
            return NextResponse.json({
              reply,
              agent: 'Emma AI',
              timestamp: new Date().toISOString(),
            });
          }
        }
      } catch (externalErr) {
        console.warn('External LLM call failed, seamlessly falling back to internal engine:', externalErr);
      }
    }

    // 2. Built-in high-performance Natural Dialogue Engine (Zero latency, 100% reliable)
    const reply = generateEmmaAIResponse(message, history);

    return NextResponse.json({
      reply,
      agent: 'Emma AI',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Error in /api/ai/chat:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
