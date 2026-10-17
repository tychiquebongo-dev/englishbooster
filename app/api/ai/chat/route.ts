import { NextRequest, NextResponse } from 'next/server';
import { queryGeminiAI, getGeminiApiKey } from '@/lib/gemini';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function cleanTextForSpeech(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/💡.*?(?=\n|$)/gi, '') // Keep TTS clean and spoken naturally
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

    // Synthesize up to first 5 chunks for fast instant voice note delivery
    for (const chunk of chunks.slice(0, 5)) {
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

    // Convert input history to uniform ChatHistoryMessage format
    const formattedHistory = history.map((h: any) => ({
      role: (h.role === 'assistant' || h.role === 'model' || h.sender_id === 'eb-ai-coach' || h.sender === 'assistant') 
        ? 'assistant' 
        : 'user',
      content: h.content || h.text || '',
    }));

    // Query Gemini AI (Google Gemini Primary Engine -> Fallbacks)
    const aiResult = await queryGeminiAI(message, formattedHistory, userLevel);
    const reply = aiResult.reply;

    // Generate Audio Voice Note if requested (message vocal)
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
      agent: 'Gemini AI',
      model: aiResult.model,
      source: aiResult.source,
      hasGeminiKey: !!getGeminiApiKey(),
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
