import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function cleanTextForSpeech(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/💡.*?(?=\n|$)/gi, '') // Remove fluency tips note from audio so voice stays conversational
    .replace(/[🤖✨🎉✈️💼☕🎬🌍💡🎙️❤️🔥👍👏]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitIntoChunks(text: string, maxLength: number = 160): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const s of sentences) {
    const trimmed = s.trim();
    if (!trimmed) continue;

    if ((currentChunk + ' ' + trimmed).trim().length <= maxLength) {
      currentChunk = (currentChunk + ' ' + trimmed).trim();
    } else {
      if (currentChunk) chunks.push(currentChunk);
      if (trimmed.length > maxLength) {
        // Subdivide by comma or space
        const words = trimmed.split(' ');
        let temp = '';
        for (const w of words) {
          if ((temp + ' ' + w).trim().length <= maxLength) {
            temp = (temp + ' ' + w).trim();
          } else {
            if (temp) chunks.push(temp);
            temp = w;
          }
        }
        currentChunk = temp;
      } else {
        currentChunk = trimmed;
      }
    }
  }

  if (currentChunk) chunks.push(currentChunk);
  return chunks.filter(c => c.length > 0);
}

async function fetchAudioBuffer(chunk: string, lang: string): Promise<Buffer | null> {
  try {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(lang)}&client=tw-ob&q=${encodeURIComponent(chunk)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://translate.google.com/',
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.warn('TTS chunk fetch failed:', err);
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const text = req.nextUrl.searchParams.get('text');
    const lang = req.nextUrl.searchParams.get('lang') || 'en-GB';

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Text query parameter is required' }, { status: 400 });
    }

    const cleaned = cleanTextForSpeech(text);
    const chunks = splitIntoChunks(cleaned, 150);

    const buffers: Buffer[] = [];
    for (const chunk of chunks) {
      const buf = await fetchAudioBuffer(chunk, lang);
      if (buf) buffers.push(buf);
    }

    if (buffers.length === 0) {
      return NextResponse.json({ error: 'Audio synthesis failed' }, { status: 502 });
    }

    const combined = Buffer.concat(buffers);

    return new Response(combined, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': combined.length.toString(),
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch (err: any) {
    console.error('TTS error:', err);
    return NextResponse.json({ error: err.message || 'TTS failure' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, lang = 'en-GB' } = body;

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const cleaned = cleanTextForSpeech(text);
    const chunks = splitIntoChunks(cleaned, 150);

    const buffers: Buffer[] = [];
    for (const chunk of chunks) {
      const buf = await fetchAudioBuffer(chunk, lang);
      if (buf) buffers.push(buf);
    }

    if (buffers.length === 0) {
      return NextResponse.json({ error: 'Audio synthesis failed' }, { status: 502 });
    }

    const combined = Buffer.concat(buffers);
    const base64Audio = `data:audio/mp3;base64,${combined.toString('base64')}`;

    // Approximate duration in seconds (~16kbps or ~150 words/min)
    const wordCount = cleaned.split(/\s+/).length;
    const estimatedDuration = Math.max(1, Math.round((wordCount / 140) * 60));

    return NextResponse.json({
      success: true,
      audioUrl: base64Audio,
      duration: estimatedDuration,
      wordCount,
    });
  } catch (err: any) {
    console.error('TTS POST error:', err);
    return NextResponse.json({ error: err.message || 'TTS failure' }, { status: 500 });
  }
}
