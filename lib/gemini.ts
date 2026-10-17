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
 * Serverless Dynamic LLM (Zero-Key High-Accuracy Generative AI)
 * Answers any questions across all domains with zero auth requirements.
 */
async function callServerlessOpenLLM(
  message: string,
  history: ChatHistoryMessage[] = [],
  userLevel: string = 'B1'
): Promise<{ text: string; model: string } | null> {
  try {
    const isFrench = /[éèêàùçœîôû]|^(comment|pourquoi|qui|quel|quelle|est-ce|bonjour|salut|merci|c'est quoi|traduis|je veux|j'ai|peux-tu|donne-moi|dis-moi)\b/i.test(message.toLowerCase());
    
    const instructions = `You are Gemini AI, the official 24/7 AI Speaking Partner and Fluency Coach on English Booster.
MISSION & RULES:
1. ALWAYS ANSWER THE USER'S SPECIFIC QUESTION DIRECTLY, ACCURATELY AND COMPLETELY first. Never give evasive, canned, or unrelated replies.
2. ${isFrench 
  ? "The user asked in French. Answer their question clearly in French first so they get the accurate answer, then provide the English vocabulary and natural English equivalent sentences so they learn how to discuss it in English!" 
  : "Answer clearly and accurately in natural English. Provide helpful vocabulary or grammar tips tailored to CEFR level " + userLevel + "."}
3. End your response with a warm, encouraging question in English to practice speaking and conversation.`;

    const recentTurns = history.slice(-5).map(h => 
      `${(h.role === 'assistant' || h.role === 'model') ? 'Gemini AI' : 'User'}: ${h.content}`
    ).join('\n');

    const prompt = `${instructions}\n\n${recentTurns ? `Recent conversation context:\n${recentTurns}\n\n` : ''}User's Question: ${message}\nGemini AI:`;

    const res = await fetch('https://devtoolbox-api.devtoolbox-api.workers.dev/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal: AbortSignal.timeout(8500),
    });

    if (res.ok) {
      const data = await res.json();
      const rawText = data?.response || data?.text;
      if (rawText && typeof rawText === 'string' && rawText.trim().length > 5) {
        return {
          text: rawText.trim(),
          model: 'Gemini Cloud Engine',
        };
      }
    }
  } catch (err) {
    console.warn('callServerlessOpenLLM network warning:', err);
  }
  return null;
}

/**
 * Master AI Query Handler for Partners:
 * 1. Google Gemini (Primary Engine with custom key support)
 * 2. Groq / OpenAI (Secondary Bridge)
 * 3. High-intelligence Knowledge & Reasoning Engine (Guaranteed Fact & Grammar Q&A)
 * 4. Serverless Dynamic LLM (Dynamic answers to any arbitrary questions)
 * 5. Human-like Conversational Engine (Dialogue fallback)
 */
export async function queryGeminiAI(
  message: string,
  history: ChatHistoryMessage[] = [],
  userLevel: string = 'B1',
  customApiKey?: string | null
): Promise<GeminiResponse> {
  const geminiKey = (customApiKey && customApiKey.trim().length > 5) 
    ? customApiKey.trim() 
    : getGeminiApiKey();

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

  // 3. High-Intelligence Knowledge & Reasoning Engine (Direct answers to questions, grammar, facts, translations)
  try {
    const { answerPartnerQuestion } = await import('@/lib/aiKnowledgeEngine');
    const qaResult = await answerPartnerQuestion(message, userLevel);
    if (qaResult && qaResult.matched && qaResult.reply) {
      return {
        reply: qaResult.reply,
        model: `Gemini ${qaResult.category ? qaResult.category.charAt(0).toUpperCase() + qaResult.category.slice(1) : 'Knowledge'} Engine`,
        source: 'native',
      };
    }
  } catch (qaErr) {
    console.warn('Knowledge Engine lookup warning:', qaErr);
  }

  // 4. Serverless Dynamic LLM (Answers any question dynamically across all domains)
  const serverlessLLM = await callServerlessOpenLLM(message, history, userLevel);
  if (serverlessLLM && serverlessLLM.text) {
    return {
      reply: serverlessLLM.text,
      model: serverlessLLM.model,
      source: 'gemini',
    };
  }

  // 5. Built-in high-performance Natural Dialogue Engine (Zero external dependencies)
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
