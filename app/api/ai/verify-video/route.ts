import { NextRequest, NextResponse } from 'next/server';
import { verifyTextLinguisticEnglish } from '@/lib/aiVideoModeration';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title = '', transcript = '', category = '', audioTranscript = '' } = body;

    const fullContent = `${title} ${transcript} ${audioTranscript}`.trim();

    if (!fullContent) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          error: 'Content is empty',
          reasonFr: 'Veuillez renseigner un titre ou une transcription en anglais pour votre vidéo.'
        },
        { status: 400 }
      );
    }

    const verificationResult = verifyTextLinguisticEnglish(fullContent);

    if (!verificationResult.isEnglish) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          error: 'Non-English content rejected by English Sentinel AI',
          details: verificationResult
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      verified: true,
      certificate: verificationResult.certificateId,
      confidence: verificationResult.confidence,
      agent: verificationResult.agentName,
      details: verificationResult
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'AI verification failed' },
      { status: 500 }
    );
  }
}
