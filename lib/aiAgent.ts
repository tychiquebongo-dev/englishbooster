/**
 * English Booster — Emma AI Speaking Coach & Conversation Partner
 * 24/7 Intelligent English Dialogue Agent for Spoken Practice & Fluency
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

export const EMMA_AI_PARTNER: AIAgentPartner = {
  id: 'eb-ai-coach',
  name: 'Emma AI • English Coach',
  avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
  country: 'United Kingdom',
  flag: '🇬🇧',
  level: 'Native (C2)',
  specialty: '🤖 24/7 AI Speaking Coach & Partner',
  bio: "Hello! I am Emma, your 24/7 AI English Conversation Partner. Talk with me about any topic, practice speaking, boost your vocabulary, and master natural English with zero fear of mistakes!",
  interests: ['Spoken English', 'Fluency Coaching', 'Pronunciation', 'Business & Travel', 'Everyday Dialogues'],
  is_online: true,
  is_ai: true,
  rating: 5.0,
  reviews_count: 984,
  streak: 99,
};

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
    prompt: "What does your typical morning routine look like? How do you like to start your day?",
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

// Grammar and phrasing correction patterns
interface GrammarTip {
  pattern: RegExp;
  tip: string;
  betterPhrase: string;
}

const COMMON_ENGLISH_TIPS: GrammarTip[] = [
  {
    pattern: /\bi am agree\b|\bi'm agree\b/i,
    tip: 'In English, "agree" is an active verb, not an adjective.',
    betterPhrase: 'I agree with you',
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
    betterPhrase: 'I have lived here for...',
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
 * Intelligent Natural Dialogue Engine for Emma AI
 * Analyzes intent, provides conversational response, optional fluency coaching tip,
 * and engages the learner with an authentic open-ended follow-up question.
 */
export function generateEmmaAIResponse(userMessage: string, conversationHistory: { sender: string; text: string }[] = []): string {
  const msg = (userMessage || '').trim();
  const lower = msg.toLowerCase();

  // 1. Check for specific French translation / help requests
  if (lower.startsWith('comment on dit') || lower.startsWith('comment dit-on') || lower.includes('en anglais')) {
    if (lower.includes('bonjour') || lower.includes('salut')) {
      return "To greet someone in English, you can say: **'Hello'**, **'Hi there'**, or depending on the time of day: **'Good morning'**, **'Good afternoon'**, or **'Good evening'**! 😊 How is your day going so far?";
    }
    if (lower.includes('merci')) {
      return "To express gratitude in English, you can say: **'Thank you very much'**, **'Thanks a lot'**, or in casual talks: **'I really appreciate it!'** What did you want to say thank you for?";
    }
    if (lower.includes('travail') || lower.includes('boulot')) {
      return "For 'travail', you can say **'work'** (uncountable) or **'job'** (countable, e.g., 'I have a great job'). In informal English, people also say **'my gig'** or **'my craft'**. What kind of work do you do?";
    }
    return `That's a great question! In natural English, context is key. You can express that using natural vocabulary. Could you tell me a little bit more about the sentence you want to form? I'd be happy to polish it for you!`;
  }

  // 2. Greetings & Introductions
  if (/^(hello|hi|hey|good morning|good afternoon|good evening|howdy|what's up|sup|salut|bonjour)\b/i.test(lower)) {
    const greetings = [
      "Hello there! It's fantastic to meet you. I'm Emma, your English conversation coach. How are you feeling today?",
      "Hi! Welcome! I'm thrilled to chat with you today. How has your week been so far?",
      "Hello! Great to see you here. I'm ready whenever you are. What's on your mind today — work, travel, or just casual chit-chat?",
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  // 3. How are you / How do you do
  if (/how are you|how are things|how's it going|how do you do/i.test(lower)) {
    return "I'm doing wonderful, thank you for asking! I'm excited to practice English with you. Tell me, how was your day, and did you do anything interesting?";
  }

  // 4. Who are you / What can you do
  if (/who are you|what is your name|tell me about yourself|what can you do/i.test(lower)) {
    return "I'm **Emma**, your 24/7 AI English Conversation Partner on English Booster! My mission is to help you build real speaking confidence, expand your vocabulary, and sound more natural. We can discuss any topic you like, or even practice interview scenarios! What is your main goal in learning English right now?";
  }

  // 5. Travel & Vacations
  if (/travel|vacation|holiday|country|city|flight|airplane|beach|trip|visit|abroad/i.test(lower)) {
    return "Traveling is one of the best ways to practice English! Exploring new cultures always gives you unforgettable stories. What has been the most memorable trip of your life, or which destination is at the very top of your bucket list?";
  }

  // 6. Work, Career & Jobs
  if (/job|work|career|company|interview|boss|project|colleague|office|remote|developer|engineer|teacher|student/i.test(lower)) {
    return "Work and career discussions are essential for professional English fluency! Being able to clearly explain what you do and your projects makes a huge difference. Could you describe your current role or what you enjoy most about your profession?";
  }

  // 7. Food & Cooking
  if (/food|cook|cooking|eat|eating|dish|restaurant|coffee|tea|lunch|dinner|breakfast|delicious/i.test(lower)) {
    return "Oh, food is one of my favorite topics to talk about! Describing tastes, ingredients, and dining experiences is great for descriptive vocabulary. If you had to invite friends over for dinner tonight, what special meal would you cook or order?";
  }

  // 8. Movies, Series, Music & Books
  if (/movie|film|series|netflix|cinema|actor|watch|music|song|singer|book|read|reading/i.test(lower)) {
    return "Entertainment is such a fun way to improve your listening and comprehension! Watching movies with original English audio can do wonders for your accent. Have you watched or read anything recently that you really loved?";
  }

  // 9. Weather & Seasons
  if (/weather|rain|sunny|cold|hot|summer|winter|spring|autumn|fall|temperature/i.test(lower)) {
    return "Talking about the weather is the classic English icebreaker! How is the weather over where you live today — is it warm and sunny, or crisp and rainy?";
  }

  // 10. Language Learning & Fluency
  if (/learn|fluency|practice|accent|pronunciation|grammar|vocabulary|english|mistake/i.test(lower)) {
    return "You're doing fantastic already! Remember: fluency isn't about being 100% perfect, it's about communicating your ideas clearly and with confidence. What do you find most challenging when speaking English — vocabulary, grammar, or accent?";
  }

  // 11. Short answers ("yes", "no", "okay", "good", "fine", "cool")
  if (/^(yes|no|yeah|yep|nope|ok|okay|fine|good|cool|nice|great|sure)$/i.test(lower)) {
    return "Awesome! Let's take it a step further to stretch your speaking skills. Can you share a sentence or two explaining why, or tell me what you're up to today?";
  }

  // 12. Grammar coaching tip check
  const coachingTip = findGrammarCoachingTip(msg);
  let coachingNote = '';
  if (coachingTip) {
    coachingNote = `\n\n💡 *Quick Fluency Tip*: In English, we usually say **"${coachingTip.betterPhrase}"** (${coachingTip.tip}).`;
  }

  // 13. General conversational response
  const generalResponses = [
    `That is such an interesting point! I love how you expressed that. Could you tell me a little bit more about why you feel that way?${coachingNote}`,
    `I totally see what you mean. Practicing expressing your thoughts like this in English is exactly how you reach real fluency! What do you think is the biggest advantage of that?${coachingNote}`,
    `Thank you for sharing that! That sounds really fascinating. How does that usually impact your everyday life or your plans?${coachingNote}`,
    `Great explanation! Your English is coming along nicely. If you had to summarize that in one key takeaway, what would it be?${coachingNote}`,
  ];

  return generalResponses[Math.floor(Math.random() * generalResponses.length)];
}

/**
 * Text-to-Speech synthesizer for Emma AI's voice
 * Uses native Web Speech API with highest quality British/American English voices.
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

    // Clean markdown styling before speaking
    const cleanText = text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/[🤖💡✨🎉✈️💼☕🎬🌍]/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'en-GB';
    utterance.rate = rate; // Slightly slower than 1.0 for optimal learner comprehension
    utterance.pitch = 1.05;

    // Pick a natural British or American voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      (v.lang.startsWith('en-GB') || v.lang.startsWith('en-US')) && 
      (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Jenny') || v.name.includes('Sonia') || v.name.includes('Samantha'))
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
