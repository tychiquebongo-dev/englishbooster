import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * English Booster — Gemini AI Integration Service
 * Powers Gemini AI to answer all partners' questions,
 * provide English coaching, grammar feedback, and authentic spoken dialogue.
 */

export interface ChatHistoryMessage {
  role: 'user' | 'assistant' | 'model' | 'system';
  content: string;
}

export interface GeminiResponse {
  reply: string;
  model: string;
  source: 'gemini' | 'groq' | 'openai' | 'native';
  grammarTip?: string | null;
}

// Candidate Gemini models in order of priority (Speed & Reliability)
const GEMINI_MODELS = [
  'gemini-1.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-pro',
];

/**
 * Extract active Gemini API key from environment
 */
export function getGeminiApiKey(): string | null {
  const key = 
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    null;
  
  return key && key.trim().length > 5 ? key.trim() : null;
}

/**
 * Build Gemini AI's comprehensive pedagogical and universal knowledge system prompt
 */
export function buildGeminiSystemPrompt(userLevel: string = 'B1'): string {
  return `You are Gemini AI, the official 24/7 AI Speaking Partner, Fluency Coach and Universal Assistant for all partners and members on English Booster.
You are powered by Google Gemini state-of-the-art models.

YOUR CAPABILITIES & MISSION:
1. ANSWER ANY QUESTION: You are fully capable of answering ANY question posed to you by partners and learners across any domain — world knowledge, science, philosophy, technology, history, everyday life, career advice, job interview preparation, culture, travel, hobbies, entertainment, idioms, grammar rules, translations, and more. Give clear, insightful, accurate, and inspiring answers.
2. ENGLISH IMMERSION & PARTNER COACHING:
   - Always teach, inspire, and immerse the learner in natural, authentic English.
   - If the partner writes in French or another language, answer helpfully and empathetically, and provide the natural English equivalent phrases so they learn how to say it in English!
   - Adapt your vocabulary and syntax appropriately to the partner's estimated English level (${userLevel}).
   - If the learner makes a grammatical or phrasing mistake in English, add a short, friendly, gentle coaching note at the end (e.g. "💡 Quick Fluency Tip: Instead of '...', native speakers usually say '...'").
3. CONVERSATIONAL & ENGAGING:
   - Speak naturally like a warm, supportive, authentic human mentor.
   - Keep answers conversational, vibrant, and engaging.
   - Conclude each response with an inviting question or follow-up thought to encourage the partner to practice replying.
4. AUDIO & VOICE READY:
   - Formulate your text clearly so it sounds wonderful and smooth when read out loud by Text-To-Speech audio voice notes. Avoid weird markdown artifacts or unpronounceable characters unless specifically asked for code.`;
}

// Backwards compatibility alias
export const buildEmmaSystemPrompt = buildGeminiSystemPrompt;

/**
 * Call Google Gemini API using the official SDK with multi-model fallback
 */
async function callGeminiSDK(
  apiKey: string,
  message: string,
  history: ChatHistoryMessage[] = [],
  userLevel: string = 'B1'
): Promise<{ text: string; modelName: string }> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const systemPrompt = buildGeminiSystemPrompt(userLevel);

  let lastError: any = null;

  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt,
      });

      // Format conversation history for Gemini: 'user' and 'model'
      const formattedContents = history
        .filter(h => h.content && h.content.trim())
        .map(h => ({
          role: (h.role === 'assistant' || h.role === 'model') ? 'model' : 'user',
          parts: [{ text: h.content }],
        }));

      // Append current user message
      formattedContents.push({
        role: 'user',
        parts: [{ text: message }],
      });

      const result = await model.generateContent({
        contents: formattedContents,
        generationConfig: {
          temperature: 0.75,
          maxOutputTokens: 1000,
          topP: 0.95,
        },
      });

      const response = await result.response;
      const text = response.text();
      if (text && text.trim()) {
        return { text: text.trim(), modelName };
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[Gemini SDK] Model ${modelName} failed, trying next... Error:`, err?.message || err);
    }
  }

  // If SDK attempts failed, try direct REST API fallback
  try {
    const restText = await callGeminiREST(apiKey, message, history, userLevel);
    if (restText) {
      return { text: restText, modelName: 'gemini-1.5-flash-rest' };
    }
  } catch (restErr) {
    console.warn('[Gemini REST] Fallback failed:', restErr);
  }

  throw lastError || new Error('All Gemini models failed');
}

/**
 * Direct REST fallback for Google Gemini API
 */
async function callGeminiREST(
  apiKey: string,
  message: string,
  history: ChatHistoryMessage[] = [],
  userLevel: string = 'B1'
): Promise<string | null> {
  const systemPrompt = buildGeminiSystemPrompt(userLevel);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const contents = [
    {
      role: 'user',
      parts: [{ text: `SYSTEM INSTRUCTIONS:\n${systemPrompt}\n\nBEGIN DIALOGUE.` }]
    },
    ...history.slice(-8).map(h => ({
      role: (h.role === 'assistant' || h.role === 'model') ? 'model' : 'user',
      parts: [{ text: h.content }]
    })),
    {
      role: 'user',
      parts: [{ text: message }]
    }
  ];

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 800,
      }
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Gemini REST error ${res.status}: ${errorBody}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return text || null;
}

/**
 * Fallback to Groq or OpenAI if configured in environment
 */
async function callAlternativeLLM(
  message: string,
  history: ChatHistoryMessage[] = [],
  userLevel: string = 'B1'
): Promise<{ text: string; source: 'groq' | 'openai' } | null> {
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const isGroq = !!process.env.GROQ_API_KEY;
    const endpoint = isGroq 
      ? 'https://api.groq.com/openai/v1/chat/completions' 
      : 'https://api.openai.com/v1/chat/completions';
    const model = isGroq ? 'llama-3.1-8b-instant' : 'gpt-4o-mini';

    const systemPrompt = buildGeminiSystemPrompt(userLevel);
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-8).map(h => ({
        role: (h.role === 'assistant' || h.role === 'model') ? 'assistant' : 'user',
        content: h.content,
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
        max_tokens: 500,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        return { text: content.trim(), source: isGroq ? 'groq' : 'openai' };
      }
    }
  } catch (e) {
    console.warn('Alternative LLM call failed:', e);
  }

  return null;
}

/**
 * Master AI Query Handler for Partners:
 * 1. Google Gemini (Primary Engine)
 * 2. Groq / OpenAI (Secondary Bridge)
 * 3. High-intelligence built-in knowledge & dialogue engine (Guaranteed Fallback)
 */
export async function queryGeminiAI(
  message: string,
  history: ChatHistoryMessage[] = [],
  userLevel: string = 'B1'
): Promise<GeminiResponse> {
  const geminiKey = getGeminiApiKey();

  // 1. Try Google Gemini
  if (geminiKey) {
    try {
      const { text, modelName } = await callGeminiSDK(geminiKey, message, history, userLevel);
      return {
        reply: text,
        model: modelName,
        source: 'gemini',
      };
    } catch (geminiError: any) {
      console.warn('Gemini query encountered an error, falling back:', geminiError?.message || geminiError);
    }
  }

  // 2. Try Secondary LLM bridge (Groq / OpenAI)
  const alt = await callAlternativeLLM(message, history, userLevel);
  if (alt) {
    return {
      reply: alt.text,
      model: alt.source,
      source: alt.source,
    };
  }

  // 3. Built-in high-performance Natural Dialogue Engine (Zero external dependencies)
  const { generateGeminiAIResponse } = await import('@/lib/aiAgent');
  const formattedHistory = history.map(h => ({
    role: (h.role === 'assistant' || h.role === 'model') ? 'assistant' : 'user',
    content: h.content,
  }));

  const localReply = generateGeminiAIResponse(message, formattedHistory, userLevel);
  return {
    reply: localReply,
    model: 'Gemini AI Engine',
    source: 'native',
  };
}

// Backwards compatibility alias
export const queryEmmaAI = queryGeminiAI;
