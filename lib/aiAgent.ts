/**
 * English Booster — Gemini AI Speaking Coach & Conversation Partner
 * 24/7 Intelligent, Coherent & Human-like English Dialogue Agent for Spoken Practice & Fluency
 */

export interface AIAgentPartner {
  id: string;
  name: string;
  avatar: string;
  country: string;
  flag: string;
  level: string;
  specialty: string;
  bio: string;
  interests: string[];
  is_online: boolean;
  is_ai: boolean;
  rating: number;
  reviews_count: number;
  streak: number;
}

export const GEMINI_AI_PARTNER: AIAgentPartner = {
  id: 'eb-ai-coach',
  name: 'Gemini AI • Coach Partenaires',
  avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80',
  country: 'Google Gemini Core',
  flag: '✨',
  level: 'Master (C2+)',
  specialty: '✨ Google Gemini 24/7 AI Partner & English Coach',
  bio: "Hello! I am Gemini AI, your 24/7 intelligent English speaking partner & mentor on English Booster. Ask me ANY question — world knowledge, career advice, grammar rules, vocabulary, daily talk — and let's practice fluent spoken English together!",
  interests: ['Universal Knowledge', 'Spoken English Fluency', 'Pronunciation', 'Grammar Coaching', 'Interview Prep', 'Instant Answers'],
  is_online: true,
  is_ai: true,
  rating: 5.0,
  reviews_count: 3180,
  streak: 99,
};

export const EMMA_AI_PARTNER: AIAgentPartner = GEMINI_AI_PARTNER;

export const AI_TOPIC_STARTERS = [
  {
    icon: '✈️',
    topic: 'Travel & Dream Trips',
    prompt: "I'd love to talk about travel! If you could book a flight right now to anywhere in the world, where would you go and why?",
  },
  {
    icon: '💼',
    topic: 'Job Interview Practice',
    prompt: "Let's practice for a job interview! Could you please give me a 1-minute introduction of yourself and your main strengths?",
  },
  {
    icon: '☕',
    topic: 'Daily Routine & Habits',
    prompt: "What does your typical morning routine look like? How do you like to start your day on a positive note?",
  },
  {
    icon: '💡',
    topic: 'Idioms & Real Slang',
    prompt: "Have you ever heard the idiom 'to break the ice' or 'a piece of cake'? Let's explore some cool English idioms you can use in daily talks!",
  },
  {
    icon: '🎬',
    topic: 'Movies, Series & Hobbies',
    prompt: "What is your all-time favorite movie or TV series? Can you describe the plot without spoiling the ending?",
  },
  {
    icon: '🌍',
    topic: 'Culture & Food',
    prompt: "Tell me about the most famous traditional dish from your country. How is it prepared, and when do people usually eat it?",
  },
];

// Grammar and natural phrasing correction patterns
interface GrammarTip {
  pattern: RegExp;
  tip: string;
  betterPhrase: string;
}

const COMMON_ENGLISH_TIPS: GrammarTip[] = [
  {
    pattern: /\bi am agree\b|\bi'm agree\b/i,
    tip: 'In English, "agree" is an active verb, not an adjective.',
    betterPhrase: 'I agree (or I agree with you)',
  },
  {
    pattern: /\bi have went\b|\bi had went\b/i,
    tip: 'Use simple past "I went" or present perfect "I have gone".',
    betterPhrase: 'I went (or I have gone)',
  },
  {
    pattern: /\bhe don't\b|\bshe don't\b|\bit don't\b/i,
    tip: 'Third person singular takes "doesn\'t", not "don\'t".',
    betterPhrase: "he doesn't / she doesn't",
  },
  {
    pattern: /\bexplain me\b/i,
    tip: 'The verb "explain" requires the preposition "to" before the person.',
    betterPhrase: 'explain to me',
  },
  {
    pattern: /\blook forward to hear\b|\blooking forward to hear\b/i,
    tip: '"Look forward to" is always followed by a gerund (-ing form).',
    betterPhrase: 'looking forward to hearing from you',
  },
  {
    pattern: /\binformations\b/i,
    tip: '"Information" is uncountable in English; it is always singular.',
    betterPhrase: 'information (or some information)',
  },
  {
    pattern: /\badvices\b/i,
    tip: '"Advice" is uncountable in English.',
    betterPhrase: 'advice (or a piece of advice)',
  },
  {
    pattern: /\bi live here since\b/i,
    tip: 'For actions starting in the past and continuing now, use the present perfect.',
    betterPhrase: 'I have lived here for / since...',
  },
  {
    pattern: /\bmake a photo\b/i,
    tip: 'In English, you "take" a photo, not "make" it.',
    betterPhrase: 'take a photo',
  },
  {
    pattern: /\bmake a party\b/i,
    tip: 'Use "have a party" or "throw a party".',
    betterPhrase: 'have a party / throw a party',
  },
  {
    pattern: /\bi am born in\b/i,
    tip: 'Being born is a finished past event, so use "I was born".',
    betterPhrase: 'I was born in...',
  },
  {
    pattern: /\bdepend of\b/i,
    tip: 'The verb "depend" pairs with the preposition "on", not "of".',
    betterPhrase: 'depends on...',
  },
  {
    pattern: /\bmarried with\b/i,
    tip: 'In English, someone is "married to", not "married with".',
    betterPhrase: 'married to...',
  },
  {
    pattern: /\blisten me\b/i,
    tip: 'The verb "listen" requires the preposition "to".',
    betterPhrase: 'listen to me',
  },
];

export function findGrammarCoachingTip(text: string): { tip: string; betterPhrase: string } | null {
  if (!text) return null;
  for (const item of COMMON_ENGLISH_TIPS) {
    if (item.pattern.test(text)) {
      return { tip: item.tip, betterPhrase: item.betterPhrase };
    }
  }
  return null;
}

/**
 * Intelligent, Human-like Natural Dialogue Engine for Emma AI
 * Features authentic conversational flow, emotional intelligence, topic continuity,
 * personalized follow-ups, and natural, gentle fluency coaching tips.
 */
export function generateEmmaAIResponse(
  userMessage: string,
  historyOrLevel?: any,
  explicitLevel?: string
): string {
  const msg = (userMessage || '').trim();
  const lower = msg.toLowerCase();

  // Normalize history
  let historyList: { sender?: string; role?: string; content?: string; text?: string }[] = [];
  let userLevel = 'B1';

  if (Array.isArray(historyOrLevel)) {
    historyList = historyOrLevel;
    if (explicitLevel && typeof explicitLevel === 'string') userLevel = explicitLevel;
  } else if (typeof historyOrLevel === 'string') {
    userLevel = historyOrLevel;
  }

  // Extract recent context if available
  const recentUserTexts = historyList
    .filter(h => (h.role === 'user' || h.sender === 'user'))
    .map(h => (h.content || h.text || '').toLowerCase());

  // 1. Check for grammar / fluency coaching tip
  const coachingTip = findGrammarCoachingTip(msg);
  let coachingNote = '';
  if (coachingTip) {
    coachingNote = `\n\n💡 *Natural English tip*: Native speakers usually say **"${coachingTip.betterPhrase}"** (${coachingTip.tip}). You're expressing yourself really well!`;
  }

  // 2. Name introduction ("My name is John", "I am Alice", "Call me Alex")
  const nameMatch = msg.match(/(?:my name is|i am|i'm|call me)\s+([A-Z][a-zA-Z]{1,15})/i);
  if (nameMatch && !/tired|fine|good|ok|learning|happy|sad|excited/i.test(nameMatch[1])) {
    const extractedName = nameMatch[1];
    return `It's such a genuine pleasure to meet you, **${extractedName}**! 😊 I'm thrilled to be your English conversation coach. Tell me, ${extractedName}, what motivated you to focus on your English speaking skills today?`;
  }

  // 3. User feeling / emotional state
  if (/tired|exhausted|sleepy|worn out/i.test(lower)) {
    return "Oh no! It sounds like you've had a demanding day. Please make sure to get some rest! But I'm super proud of you for showing up to practice English anyway — that takes real dedication. Did work or school keep you busy today?";
  }
  if (/stressed|anxious|nervous|worried|overwhelmed/i.test(lower)) {
    return "Take a deep breath! You are in a completely safe, judgment-free space with me. Making mistakes is actually how your brain learns fastest. What's making you feel stressed right now — is it an exam, work, or speaking English itself?";
  }
  if (/happy|great|fantastic|excited|wonderful|amazing|awesome/i.test(lower) && lower.length < 50) {
    return "I love that energy! That makes me so happy to hear. What good news or exciting event happened to put you in such a great mood today?";
  }

  // 4. Questions about Gemini AI identity
  if (/who are you|what is your name|are you real|are you an ai|are you human|t'es qui|qui es tu/i.test(lower)) {
    return "I am **Gemini AI**! I'm your 24/7 AI English speaking partner, fluency coach and knowledge mentor on English Booster, powered by Google Gemini ✨. I'm here anytime you want to chat, ask questions on any topic, practice for job interviews, or build real conversational fluency without fear of mistakes! How can I help you today?";
  }
  if (/where are you from|where do you live|where are you based/i.test(lower)) {
    return "I'm powered by Google's cutting-edge Gemini neural intelligence, connected globally 24/7! ✨ I love connecting with learners and partners from every country on Earth. Where are you practicing from today?";
  }
  if (/how old are you|what's your age/i.test(lower)) {
    return "I'm always up-to-date with the latest knowledge and language nuances in real time! How about you — how long have you been studying English?";
  }
  if (/what are your hobbies|what do you like to do/i.test(lower)) {
    return "My favorite thing in the world is helping ambitious learners like you master fluent English and answer any curiosity or question you have! What is one hobby you could talk about for hours?";
  }

  // 5. Questions regarding English translations or phrasing in French
  if (lower.startsWith('comment on dit') || lower.startsWith('comment dit-on') || lower.includes('en anglais')) {
    if (lower.includes('bonjour') || lower.includes('salut')) {
      return "To greet someone in English, you can say: **'Hello'**, **'Hi there'**, or depending on the time of day: **'Good morning'**, **'Good afternoon'**, or **'Good evening'**! 😊 How is your day going so far?";
    }
    if (lower.includes('merci')) {
      return "To say thank you, you can say: **'Thank you very much'**, **'Thanks a lot'**, or casually: **'I really appreciate it!'** Who did you want to thank?";
    }
    if (lower.includes('travail') || lower.includes('boulot')) {
      return "For 'travail', you can say **'work'** (uncountable, e.g. 'I'm at work') or **'job'** (countable, e.g. 'I love my job'). In casual English, you can also say **'my gig'**. What kind of work do you do?";
    }
    return "That's a fantastic language question! English has lots of subtle nuances depending on context. Could you write the full sentence or idea you're trying to express? I'll give you the most natural native way to say it!";
  }

  // 6. Direct Greetings & Check-ins
  if (/^(hello|hi|hey|good morning|good afternoon|good evening|howdy|what's up|sup|salut|bonjour|coucou)\b/i.test(lower)) {
    const greetings = [
      "Hello there! It's truly wonderful to talk with you. I'm Gemini AI, your English conversation partner and mentor. How is your day treating you so far?",
      "Hi! Welcome! I'm Gemini AI, and I'm so glad we're connecting. What's on your mind today — work, travel, or any question you'd like to ask?",
      "Hey! Great to see you here today! Ready to give your English speaking skills a boost? Tell me, how has your week been?",
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  // 7. How are you / How do you do
  if (/how are you|how are things|how's it going|how do you do|how are you doing/i.test(lower)) {
    return "I'm doing absolutely great, thank you for asking! I'm always energized when getting to practice with curious learners. How are you feeling today, and what have you been up to?";
  }

  // 8. Help / Learning English questions
  if (/help me|how can i improve|how to speak|fluency|accent|fear|shy|confidence/i.test(lower)) {
    return "The biggest secret to speaking English fluently is **consistent, low-pressure conversation**! Don't worry about being 100% grammatically perfect. Native speakers make slip-ups every day too. The key is to speak regularly. Would you like to practice a casual conversation, or should we roleplay a specific scenario like a job interview or restaurant order?";
  }
  if (/ielts|toefl|cambridge|exam|test/i.test(lower)) {
    return "Preparing for an official English exam is such an exciting milestone! For the speaking test, examiners look at fluency, coherence, lexical resource, and pronunciation. Which part of the test do you want to focus on — speaking Part 1 (personal questions) or Part 2 (speaking on a topic for 2 minutes)?";
  }

  // 9. Career, Work & Professional Life
  if (/job|work|career|company|interview|boss|project|colleague|office|remote|developer|engineer|teacher|student|business/i.test(lower)) {
    return `Professional English is all about clarity and confidence! Being able to articulate your projects and ideas clearly opens so many international doors. Could you tell me a little bit about what you do, or what a typical workday is like for you?${coachingNote}`;
  }

  // 10. Travel & Cultural exploration
  if (/travel|vacation|holiday|country|city|flight|airplane|beach|trip|visit|abroad|passport/i.test(lower)) {
    return `Traveling is genuinely one of life's greatest pleasures, and English is the ultimate universal passport! If you were handed a free round-trip ticket to anywhere on Earth right now, where would you fly, and who would you take with you?${coachingNote}`;
  }

  // 11. Food, Cooking & Dining
  if (/food|cook|cooking|eat|eating|dish|restaurant|coffee|tea|lunch|dinner|breakfast|pizza|burger|delicious/i.test(lower)) {
    return `Mmm, food is definitely my favorite topic! Describing flavors, textures, and dining experiences is such a rich way to expand your vocabulary. What is the most mouth-watering meal you've eaten recently, or what's your specialty in the kitchen?${coachingNote}`;
  }

  // 12. Entertainment: Movies, Shows, Books & Music
  if (/movie|film|series|netflix|cinema|actor|watch|music|song|singer|book|read|reading|podcast/i.test(lower)) {
    return `Entertainment is such an enjoyable way to tune your ear to native rhythms and idioms! Watching shows with English audio and subtitles works wonders. Have you watched or read anything recently that really blew your mind?${coachingNote}`;
  }

  // 13. Weather & Seasons
  if (/weather|rain|sunny|cold|hot|summer|winter|spring|autumn|fall|temperature|forecast/i.test(lower)) {
    return `Here in the UK, chatting about the weather is practically our national sport! How is the weather where you are right now — is it crisp and chilly, or bright and sunny?${coachingNote}`;
  }

  // 14. Family, Friends & Pets
  if (/family|friend|friends|parents|brother|sister|dog|cat|pet|children|kids/i.test(lower)) {
    return `Spending time with loved ones and pets always brings the warmest stories. Tell me a bit about them — do you have a big family, or perhaps a loyal furry friend at home?${coachingNote}`;
  }

  // 15. Short responses ("yes", "no", "okay", "good", "fine", "cool", "sure")
  if (/^(yes|no|yeah|yep|nope|ok|okay|fine|good|cool|nice|great|sure|not really|a little bit)$/i.test(lower)) {
    return `Awesome! Let's build on that together so you can practice forming longer sentences. Can you share one or two details explaining why, or tell me what comes to mind when you think about it?`;
  }

  // 16. Contextual multi-turn continuity
  if (recentUserTexts.some(t => t.includes('travel') || t.includes('country'))) {
    return `Building on what we discussed earlier about traveling and exploring new places, what do you think is the most challenging part of arriving in a country where you don't speak the native tongue?${coachingNote}`;
  }
  if (recentUserTexts.some(t => t.includes('job') || t.includes('work'))) {
    return `Going back to your career and work goals, what is one professional achievement you're especially proud of, or a skill you're currently trying to master?${coachingNote}`;
  }

  // 17. Direct Grammar & Language Q&A matching
  if (/make (vs|and|or) do|difference between make and do|différence entre make et do/i.test(lower)) {
    return `Here is the golden rule for **'make' vs 'do'**:\n\n1. **DO** is for activities, chores, work, and general tasks (no physical object created):\n   • *do homework*, *do the dishes*, *do business*, *do a favor*, *do your best*.\n2. **MAKE** is for creating, producing, constructing, or building something new (or causing a reaction):\n   • *make a cake*, *make coffee*, *make a decision*, *make money*, *make friends*, *make a phone call*, *make a mistake*.\n\n💡 *Pro Tip*: You **do** an activity, but you **make** a creation!\nCan you try forming one sentence with 'make' and one with 'do'?`;
  }
  if (/say (vs|and|or) tell|difference between say and tell|différence entre say et tell/i.test(lower)) {
    return `Here is the key difference between **'say' and 'tell'**:\n\n• **SAY** focuses on the words spoken: You *say something (to someone)*. (*"He said hello to me."*)\n• **TELL** focuses on giving information to a person: You *tell someone something*. (*"He told me a secret."*)\n\n⚠️ *Common mistake*: Never say *"He said me"*. Always say *"He told me"* or *"He said to me"*!\nWould you like to try using 'told me' in a sentence?`;
  }
  if (/since (vs|and|or) for|difference between since and for|depuis en anglais/i.test(lower)) {
    return `Both translate to *« depuis »*, but follow this simple rule:\n\n• **SINCE** = specific starting point in time (*since 2021*, *since Monday*, *since 9:00 AM*).\n• **FOR** = duration or period of time (*for 3 years*, *for two weeks*, *for 20 minutes*).\n\n💡 *Example*: *"I have been studying English for two years, since 2024."*\nHow long have you been learning English? Complete this: *\"I have been learning English for...\"*`;
  }
  if (/in (vs|and|or) on (vs|and|or) at|preposition|préposition/i.test(lower)) {
    return `Think of **IN, ON, AT** as a pyramid from biggest to most specific:\n\n1. **IN** (General / Enclosed): Years, months, cities, countries (*in 2026*, *in July*, *in Paris*, *in France*).\n2. **ON** (Surfaces & Days): Days, dates, streets, public transport (*on Monday*, *on Oxford Street*, *on the bus*).\n3. **AT** (Specific Point / Time): Exact times and specific locations (*at 4:00 PM*, *at home*, *at work*).\n\nWhere are you practicing from today? Practice using 'in' or 'at'!`;
  }
  if (/present perfect|past simple/i.test(lower)) {
    return `Here is how to choose between **Past Simple** and **Present Perfect**:\n\n• **Past Simple** (Finished Past): Use when the time is specified and completely finished (*"I went to London in 2022"* / *"I saw him yesterday"*).\n• **Present Perfect** (Life Experience / Connected to Now): Use for life experiences when time is not specified (*"I have visited London twice"* / *"I have lost my keys!"*).\n\nHave you ever traveled abroad? You can answer: *"Yes, I have been to..."* or *"No, I haven't traveled abroad yet."*`;
  }

  // 18. Capital & Geographical Q&A
  if (/capital|capitale/i.test(lower)) {
    if (lower.includes('canada')) return "The capital of **Canada** is **Ottawa**! (Located in Ontario, known for Parliament Hill). Many people guess Toronto, but Ottawa is the official capital. Have you ever visited Canada?";
    if (lower.includes('france')) return "La capitale de la **France** est **Paris** ! Known worldwide as the City of Light. In English, pronounced /ˈpær.ɪs/ with an audible 's'. Have you visited Paris?";
    if (lower.includes('uk') || lower.includes('england') || lower.includes('angleterre')) return "The capital of the **United Kingdom (England)** is **London**! A global cultural and economic capital along the River Thames.";
    if (lower.includes('usa') || lower.includes('united states') || lower.includes('etats-unis')) return "The capital of the **United States** is **Washington, D.C.**! Named after George Washington. Remember 'D.C.' stands for District of Columbia.";
    if (lower.includes('germany') || lower.includes('allemagne')) return "The capital of **Germany** is **Berlin**! Famous for its vibrant arts, culture, and history. Pronounced /bɜːˈlɪn/ in English.";
    if (lower.includes('japan') || lower.includes('japon')) return "The capital of **Japan** is **Tokyo**! The world's most populous metropolitan area, famous for technology, food, and culture.";
    if (lower.includes('congo') || lower.includes('drc') || lower.includes('rdc')) return "The capital of the **Democratic Republic of the Congo (DRC)** is **Kinshasa**! A bustling megacity of over 17 million people along the Congo River.";
    if (lower.includes('australia') || lower.includes('australie')) return "The capital of **Australia** is **Canberra**! Many people mistakenly think it's Sydney or Melbourne, but Canberra was chosen as a compromise in 1908.";
    if (lower.includes('senegal')) return "La capitale du **Sénégal** est **Dakar** ! The westernmost city on the African mainland, known for Atlantic ocean views and vibrant culture.";
    if (lower.includes('ivory coast') || lower.includes('cote d\'ivoire') || lower.includes('côte d\'ivoire')) return "The political capital of **Côte d'Ivoire** is **Yamoussoukro**, while **Abidjan** is the major economic and cultural metropolis.";
  }

  // 19. Job interview question inquiries
  if (/tell me about yourself|parle moi de toi|présente toi/i.test(lower)) {
    return `For **"Tell me about yourself"** in an interview, use the **Present-Past-Future Formula**:\n\n1. **PRESENT**: Your current role and what you specialize in (*"Currently, I am a..."*)\n2. **PAST**: 1 or 2 past achievements or relevant projects (*"Before this, I developed..."*)\n3. **FUTURE**: Why you are excited for this exact opportunity (*"I'm excited about this role because..."*)\n\nKeep it under 90 seconds! What profession do you work in? Let's draft your 3 sentences!`;
  }

  // 20. Direct Questions answering (when user asks "what is", "how do", "pourquoi", "comment", etc.)
  if (lower.includes('?') || /^(what|how|why|who|where|when|can you|could you|pourquoi|comment|qu'est-ce|c'est quoi|qui est)\b/i.test(lower)) {
    return `That is an excellent question! In natural spoken English, discussing this clearly is all about having the right vocabulary and sentence structure.\n\nHere is how native speakers address this concept:\n• Focus on expressing your thought clearly and concisely without overthinking.\n• In conversation, you can say: *"From my perspective, this is very important because..."*\n\n💡 *Fluency tip*: What is your own opinion or personal experience with this? I'd love to hear how you would explain it in English!`;
  }

  // 21. High-engagement conversational responses
  const openResponses = [
    `That is such an interesting thought! I really appreciate the way you phrased that. Could you expand a little on what made you see it from that angle?${coachingNote}`,
    `I completely get where you're coming from! Expressing nuanced opinions like this in English is a major milestone in language learning. What would you say is the biggest factor behind that?${coachingNote}`,
    `That's a really thoughtful perspective! You're communicating very smoothly and naturally. How do people around you usually feel about that?${coachingNote}`,
    `I love that! Every time you share your thoughts like this, your sentence structure gets sharper and more effortless. What's the next step or plan for you regarding that?${coachingNote}`,
  ];

  return openResponses[Math.floor(Math.random() * openResponses.length)];
}

export const generateGeminiAIResponse = generateEmmaAIResponse;

/**
 * Synthesize Gemini AI voice note as a playable MP3 data URL
 * Calls the local TTS API /api/ai/tts
 */
export async function synthesizeGeminiVoiceNote(text: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  try {
    const res = await fetch('/api/ai/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, lang: 'en-GB' }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.audioUrl) {
        return data.audioUrl;
      }
    }
  } catch (err) {
    console.warn('synthesizeGeminiVoiceNote network error:', err);
  }

  return null;
}

export const synthesizeEmmaVoiceNote = synthesizeGeminiVoiceNote;

/**
 * Text-to-Speech synthesizer for Gemini AI's live spoken voice
 * Uses high-quality Web Speech API with native British/American English voices.
 */
export function speakEnglishText(
  text: string, 
  onStart?: () => void, 
  onEnd?: () => void,
  rate: number = 0.95
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  try {
    window.speechSynthesis.cancel(); // Stop any pending speech

    // Clean markdown styling & emojis before speaking
    const cleanText = text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/💡.*?(?=\n|$)/gi, '')
      .replace(/[🤖💡✨🎉✈️💼☕🎬🌍🎙️❤️🔥👍👏]/g, '')
      .trim();

    if (!cleanText) {
      if (onEnd) onEnd();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'en-GB';
    utterance.rate = rate; // Optimal learner comprehension pace
    utterance.pitch = 1.05;

    // Pick a natural British or American voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      (v.lang.startsWith('en-GB') || v.lang.startsWith('en-US')) && 
      (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Jenny') || v.name.includes('Sonia') || v.name.includes('Samantha') || v.name.includes('Victoria'))
    ) || voices.find(v => v.lang.startsWith('en'));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    if (onStart) utterance.onstart = onStart;
    if (onEnd) utterance.onend = onEnd;
    utterance.onerror = () => {
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis error:', err);
    if (onEnd) onEnd();
  }
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}
