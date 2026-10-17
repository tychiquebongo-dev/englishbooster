import { NextRequest, NextResponse } from 'next/server';
import { generateEmmaAIResponse } from '@/lib/aiAgent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function cleanTextForSpeech(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/💡.*?(?=\n|$)/gi, '')
    .replace(/[🤖✨🎉✈️💼☕🎬🌍💡🎙️❤️🔥👍👏]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function generateTTSAudio(text: string): Promise<{ audioUrl: string | null; duration: number }> {
  try {
    const cleaned = cleanTextForSpeech(text);
    if (!cleaned) return { audioUrl: null, duration: 0 };

    const chunks = cleaned.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [cleaned];
    const buffers: Buffer[] = [];

    for (const chunk of chunks.slice(0, 4)) {
      const trimmed = chunk.trim();
      if (!trimmed) continue;
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en-GB&client=tw-ob&q=${encodeURIComponent(trimmed.slice(0, 150))}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://translate.google.com/',
        },
      });
      if (res.ok) {
        const ab = await res.arrayBuffer();
        buffers.push(Buffer.from(ab));
      }
    }

    if (buffers.length > 0) {
      const combined = Buffer.concat(buffers);
      const audioUrl = `data:audio/mp3;base64,${combined.toString('base64')}`;
      const words = cleaned.split(/\s+/).length;
      const duration = Math.max(1, Math.round((words / 130) * 60));
      return { audioUrl, duration };
    }
  } catch (err) {
    console.warn('generateTTSAudio error in /api/ai/chat:', err);
  }
  return { audioUrl: null, duration: 0 };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history = [], userLevel = 'B1', includeAudio = false } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message text is required' }, { status: 400 });
    }

    let reply = '';

    // 1. External LLM Bridge (Groq / OpenAI) if keys are provided
    const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
    if (apiKey) {
      try {
        const endpoint = process.env.GROQ_API_KEY 
          ? 'https://api.groq.com/openai/v1/chat/completions' 
          : 'https://api.openai.com/v1/chat/completions';
        const model = process.env.GROQ_API_KEY ? 'llama-3.1-8b-instant' : 'gpt-4o-mini';

        const systemPrompt = `You are Emma, a friendly, warm, and articulate 24/7 AI English Speaking Partner and Fluency Coach on English Booster.
You talk like an authentic, empathetic human English tutor from London, UK.
- Communicate in natural, engaging conversational English.
- Adapt your vocabulary to the learner's level (${userLevel}).
- Keep responses conversational (2-4 sentences max per turn) so the user gets plenty of speaking practice.
- Ask an engaging open-ended question at the end of each response to maintain the conversation.
- If the learner makes a clear grammar mistake, include a short, gentle, friendly tip at the end.`;

        const messages = [
          { role: 'system', content: systemPrompt },
          ...history.slice(-8).map((h: any) => ({
            role: (h.role === 'assistant' || h.sender_id === 'eb-ai-coach' || h.sender === 'assistant') ? 'assistant' : 'user',
            content: h.content || h.text || '',
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
          const llmReply = data.choices?.[0]?.message?.content;
          if (llmReply) {
            reply = llmReply;
          }
        }
      } catch (externalErr) {
        console.warn('External LLM call failed, falling back to internal engine:', externalErr);
      }
    }

    // 2. Built-in high-performance Natural Dialogue Engine (Zero latency, 100% reliable)
    if (!reply) {
      reply = generateEmmaAIResponse(message, history, userLevel);
    }

    // 3. Generate Audio Voice Note if requested
    let audioUrl: string | null = null;
    let duration = 0;
    if (includeAudio) {
      const audioResult = await generateTTSAudio(reply);
      audioUrl = audioResult.audioUrl;
      duration = audioResult.duration;
    }

    return NextResponse.json({
      reply,
      audioUrl,
      duration,
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
