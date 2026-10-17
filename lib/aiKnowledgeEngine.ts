/**
 * English Booster — Gemini AI Knowledge & Pedagogical Reasoning Engine
 * High-intelligence question answering, grammar coaching, vocabulary explanations,
 * general knowledge, translations, and conversational fluency guidance.
 * 
 * Works 100% reliably in zero-dependency native mode AND as an ultra-smart fallback
 * whenever an external LLM API key is absent, rate-limited, or network-restricted.
 */

export interface AnswerResult {
  matched: boolean;
  reply: string;
  category?: string;
  source: 'knowledge_engine' | 'wiki' | 'translation' | 'conversational';
}

// -----------------------------------------------------------------------------
// 1. COUNTRY & CAPITAL GEOGRAPHICAL DATABASE
// -----------------------------------------------------------------------------
const COUNTRIES_AND_CAPITALS: Record<string, { capital: string; facts: string; tip: string }> = {
  canada: {
    capital: 'Ottawa',
    facts: 'Located in the province of Ontario, known for Parliament Hill and the historic Rideau Canal.',
    tip: "A common mistake is thinking Toronto or Montreal is the capital because they're bigger, but Ottawa is the official capital!",
  },
  france: {
    capital: 'Paris',
    facts: 'Known as the City of Light, famous for the Eiffel Tower, the Louvre Museum, and world-class gastronomy.',
    tip: "In English, remember that 'Paris' is pronounced with an audible 's' at the end: /ˈpær.ɪs/.",
  },
  'united kingdom': {
    capital: 'London',
    facts: 'A global cultural and financial capital situated on the River Thames, home to Big Ben and Buckingham Palace.',
    tip: "You can say: 'London is the bustling capital of the UK.'",
  },
  england: {
    capital: 'London',
    facts: 'A global cultural and financial capital situated on the River Thames, home to Big Ben and Buckingham Palace.',
    tip: "In conversation: 'Have you ever had the chance to visit London?'",
  },
  'united states': {
    capital: 'Washington, D.C.',
    facts: 'A federal district bordering Maryland and Virginia, named after George Washington.',
    tip: "Remember that 'D.C.' stands for 'District of Columbia', distinguishing it from Washington State on the Pacific coast!",
  },
  usa: {
    capital: 'Washington, D.C.',
    facts: 'A federal district bordering Maryland and Virginia, named after George Washington.',
    tip: "Remember that 'D.C.' stands for 'District of Columbia', distinguishing it from Washington State!",
  },
  germany: {
    capital: 'Berlin',
    facts: 'Famous for its vibrant arts scene, modern architecture, and pivotal 20th-century history.',
    tip: "In English, Germany's capital is pronounced /bɜːˈlɪn/ with the stress on the second syllable.",
  },
  italy: {
    capital: 'Rome',
    facts: 'The Eternal City, steeped in nearly 3,000 years of globally influential art, architecture, and culture.',
    tip: "Native idiom: 'When in Rome, do as the Romans do!' (meaning adapt to the local customs).",
  },
  spain: {
    capital: 'Madrid',
    facts: 'Known for its elegant boulevards, expansive parks like El Retiro, and rich European art collections.',
    tip: "Notice the English pronunciation of Madrid puts emphasis on the second syllable: /məˈdrɪd/.",
  },
  japan: {
    capital: 'Tokyo',
    facts: 'A dazzling blend of ultramodern neon skyscrapers and historic temples, the world’s most populous metropolitan area.',
    tip: "Conversational phrase: 'Tokyo is famous for its incredible food and punctual bullet trains.'",
  },
  china: {
    capital: 'Beijing',
    facts: 'One of the world’s oldest continuously inhabited capitals, home to the Forbidden City and Summer Palace.',
    tip: "In English, historical texts used to write 'Peking', but 'Beijing' is the standard modern pronunciation: /beɪˈdʒɪŋ/.",
  },
  india: {
    capital: 'New Delhi',
    facts: 'The administrative heart of India, featuring iconic landmarks like the India Gate and Rashtrapati Bhavan.',
    tip: "Notice that while Delhi is the massive territory, 'New Delhi' is specifically the designated capital city.",
  },
  australia: {
    capital: 'Canberra',
    facts: 'A planned city nestled between Sydney and Melbourne, featuring Lake Burley Griffin and the Parliament House.',
    tip: "Many people guess Sydney or Melbourne, but Canberra was selected as a compromise between both rival cities in 1908!",
  },
  brazil: {
    capital: 'Brasília',
    facts: 'A planned federal capital inaugurated in 1960, famous for its airplane-shaped layout designed by Oscar Niemeyer.',
    tip: "People often mistake Rio de Janeiro or São Paulo for the capital, but Brasília has been the official capital since 1960.",
  },
  'democratic republic of the congo': {
    capital: 'Kinshasa',
    facts: 'A megacity of over 17 million people situated along the Congo River, directly facing Brazzaville.',
    tip: "Kinshasa and Brazzaville are the two closest national capital cities in the world, separated only by the Congo River!",
  },
  congo: {
    capital: 'Kinshasa (DRC) / Brazzaville (Republic of the Congo)',
    facts: 'Kinshasa is the capital of the Democratic Republic of the Congo, while Brazzaville is the capital of the Republic of the Congo.',
    tip: "In English: 'Kinshasa is the third-largest metropolitan area on the African continent.'",
  },
  drc: {
    capital: 'Kinshasa',
    facts: 'A megacity of over 17 million people along the Congo River, famous for music, culture, and vibrant energy.',
    tip: "Pronunciation in English: /kɪnˈʃɑː.sə/.",
  },
  senegal: {
    capital: 'Dakar',
    facts: 'The westernmost city on the African mainland, a vibrant hub of Atlantic trade, art, and Teranga hospitality.',
    tip: "English sentence: 'Dakar is known for its legendary music culture and ocean breezes.'",
  },
  'ivory coast': {
    capital: 'Yamoussoukro (political) / Abidjan (economic)',
    facts: 'Yamoussoukro is the official political capital, home to the Basilica of Our Lady of Peace, while Abidjan is the economic powerhouse.',
    tip: "In English, you can refer to it as Côte d'Ivoire or Ivory Coast.",
  },
  cameroon: {
    capital: 'Yaoundé',
    facts: 'Known as the City of Seven Hills, Yaoundé is the political capital, while Douala is the major port and economic hub.',
    tip: "English sentence: 'Yaoundé is located right in the lush heart of Cameroon.'",
  },
  nigeria: {
    capital: 'Abuja',
    facts: 'A planned federal capital established in 1991 to replace Lagos, centered around the majestic Aso Rock monolith.',
    tip: "Lagos was the former capital until 1991, but Abuja was custom-built in the geographical center of Nigeria.",
  },
  'south africa': {
    capital: 'Pretoria (Executive), Cape Town (Legislative), Bloemfontein (Judicial)',
    facts: 'South Africa uniquely has three official capital cities dividing its governmental branches!',
    tip: "Did you know South Africa is the only nation in the world with three official constitutional capitals?",
  },
  egypt: {
    capital: 'Cairo',
    facts: 'The historic City of a Thousand Minarets situated along the Nile, located right next to the Giza Pyramids.',
    tip: "English pronunciation: /ˈkaɪ.roʊ/.",
  },
  morocco: {
    capital: 'Rabat',
    facts: 'An Atlantic coastal city known for the Kasbah of the Udayas and the Hassan Tower.',
    tip: "While Casablanca is the largest city and economic center, Rabat is the royal capital.",
  },
  kenya: {
    capital: 'Nairobi',
    facts: 'Dubbed the Green City in the Sun, famous for having a wild national park right on the city border.',
    tip: "Sentence practice: 'Nairobi is a thriving tech hub often called the Silicon Savannah.'",
  },
  belgium: {
    capital: 'Brussels',
    facts: 'The de facto capital of the European Union and headquarters of NATO.',
    tip: "In English: 'Brussels is renowned for delicious waffles, fine chocolate, and historic grand squares.'",
  },
  switzerland: {
    capital: 'Bern',
    facts: 'A picturesque medieval city surrounded by the loop of the turquoise Aare River.',
    tip: "Switzerland doesn't technically have a formal capital in its constitution, but Bern acts as the federal seat ('Bundesstadt').",
  },
  portugal: {
    capital: 'Lisbon',
    facts: 'One of the oldest cities in Western Europe, famous for pastel buildings, historic yellow trams, and Fado music.',
    tip: "Pronounced /ˈlɪz.bən/ in English.",
  },
  russia: {
    capital: 'Moscow',
    facts: 'Home to the Red Square, Saint Basil’s Cathedral, and the Kremlin complex.',
    tip: "In English, Moscow is pronounced /ˈmɒs.koʊ/ (or /ˈmɑːs.kaʊ/).",
  },
};

// -----------------------------------------------------------------------------
// 2. ENGLISH GRAMMAR & SYNTAX EXPLANATIONS BANK
// -----------------------------------------------------------------------------
interface GrammarTopic {
  matchKeywords: string[];
  title: string;
  rule: string;
  examples: string[];
  proTip: string;
  practicePrompt: string;
}

const GRAMMAR_TOPICS: GrammarTopic[] = [
  {
    matchKeywords: ['make vs do', 'make and do', 'difference between make and do', 'do vs make', 'différence entre make et do'],
    title: "The Ultimate Guide: 'Make' vs 'Do'",
    rule: `Here is the golden rule native speakers use:
1. **DO** is used for actions, duties, obligations, chores, and non-physical tasks:
   • *do homework*, *do the dishes*, *do laundry*, *do a favor*, *do your best*, *do business*.
2. **MAKE** is used for creating, producing, constructing, or bringing something new into existence (or creating an emotional reaction):
   • *make a cake*, *make coffee*, *make a decision*, *make money*, *make friends*, *make a phone call*, *make a mistake*.`,
    examples: [
      "✓ *I need to **do** my English homework before I **make** dinner.*",
      "✓ *Don't worry about **making** mistakes when speaking English!*",
      "✓ *Could you **do** me a favor and review this email?*"
    ],
    proTip: "Memory trick: You **do** an activity, but you **make** a creation!",
    practicePrompt: "Can you create one sentence using 'make' and one sentence using 'do' to practice right now?"
  },
  {
    matchKeywords: ['say vs tell', 'say and tell', 'speak vs talk', 'difference between say and tell', 'différence entre say et tell'],
    title: "Mastering 'Say', 'Tell', 'Speak', and 'Talk'",
    rule: `Here is the quick breakdown:
1. **SAY** focuses on the words spoken. You **say something (to someone)**:
   • *She said she was tired.* / *He said hello to me.*
2. **TELL** focuses on giving information to a specific person. You **tell someone something**:
   • *She told **me** a secret.* / *Please tell **him** the time.* (Requires an object: tell me, tell us, tell John).
3. **SPEAK** is more formal and used for languages or one-way communication:
   • *I speak English and French.* / *The CEO spoke at the conference.*
4. **TALK** is informal and implies a two-way conversational exchange:
   • *Let's talk about our plans tonight.*`,
    examples: [
      "✓ *He **told me** he loved learning English.* (Not: He said me)",
      "✓ *She **said** that English Booster is fantastic.*",
      "✓ *Can we **talk** for five minutes?*"
    ],
    proTip: "Remember: You never say *'He said me'*. It is always *'He said TO me'* or simply *'He told me'*!",
    practicePrompt: "Try writing a short sentence using 'told me' and one using 'said'!"
  },
  {
    matchKeywords: ['since vs for', 'since and for', 'difference between since and for', 'depuis en anglais'],
    title: "How to Choose Between 'Since' and 'For'",
    rule: `Both translate to *« depuis »* in French, but they follow a strict rule:
1. **SINCE** is used with a specific starting point in time:
   • *since 2020*, *since Monday*, *since 9:00 AM*, *since I was a child*, *since yesterday*.
2. **FOR** is used with a duration or period of time:
   • *for 3 years*, *for two weeks*, *for 20 minutes*, *for a long time*, *for several months*.`,
    examples: [
      "✓ *I have been practicing English **since** last year.*",
      "✓ *I have lived here **for** five years.* (Duration)",
      "✓ *We haven't spoken **since** Tuesday.* (Starting point)"
    ],
    proTip: "If you can count the time units (hours, days, years), use **FOR**. If it's a specific date on a calendar or clock, use **SINCE**!",
    practicePrompt: "How long have you been studying English? Complete this: 'I have been studying English for... / since...'"
  },
  {
    matchKeywords: ['in on at', 'prepositions of time', 'prepositions of place', 'in vs on vs at', 'prépositions in on at'],
    title: "The Pyramid Method: 'In', 'On', and 'At'",
    rule: `Visualize an upside-down pyramid from broadest to most specific:
1. **IN (Biggest / Most General)**:
   • *Time*: Centuries, decades, years, months, seasons (*in 2026*, *in July*, *in summer*, *in the morning*).
   • *Place*: Countries, cities, enclosed spaces (*in Paris*, *in the kitchen*, *in a car*).
2. **ON (More Specific / Surface & Days)**:
   • *Time*: Specific days and dates (*on Monday*, *on October 17th*, *on my birthday*).
   • *Place*: Streets, surfaces, public transit (*on Oxford Street*, *on the table*, *on the bus*, *on the train*).
3. **AT (Most Specific / Precise Points)**:
   • *Time*: Exact times and moments (*at 5:30 PM*, *at midnight*, *at noon*, *at the moment*).
   • *Place*: Specific addresses or exact locations (*at 221B Baker Street*, *at home*, *at school*, *at work*).`,
    examples: [
      "✓ *I was born **in** 2000, **on** a Tuesday, **at** 3:00 PM.*",
      "✓ *She lives **in** London, **on** Regent Street, and works **at** the hospital.*"
    ],
    proTip: "Why *'on the bus'* but *'in the car'*? If you can stand up and walk inside the vehicle (bus, train, plane), use **ON**. If you must crouch to enter (car, taxi), use **IN**!",
    practicePrompt: "Where are you right now? Tell me using 'in', 'on', or 'at'!"
  },
  {
    matchKeywords: ['present perfect', 'past simple vs present perfect', 'have been vs went', 'passé composé en anglais'],
    title: "Past Simple vs. Present Perfect: Finally Made Easy",
    rule: `This is the #1 challenge for French speakers! Here is how to master it:
1. **PAST SIMPLE** (Finished time):
   • Use when the action happened at a specific, completed time in the past (yesterday, last year, in 2019, 5 minutes ago).
   • *Formula*: Subject + verb-ed (or irregular past).
   • *Example*: *I **went** to New York last year.* (The trip is completely finished and dated).
2. **PRESENT PERFECT** (Connected to Now / Life Experience / Unfinished time):
   • Use when the exact time doesn't matter, when talking about life experiences (*Have you ever...?*), or an action continuing up to now.
   • *Formula*: Subject + **have/has** + past participle.
   • *Example*: *I **have visited** New York twice.* (In my life so far).`,
    examples: [
      "✓ *I **lost** my keys yesterday, but I found them.* (Past Simple - finished)",
      "✓ *I **have lost** my keys! Can you help me find them?* (Present Perfect - result is right now!)",
      "✓ *She **has worked** here for three years.* (She still works here now)."
    ],
    proTip: "If you have time markers like *yesterday, last night, in 2021, ago*, NEVER use Present Perfect — always use Past Simple!",
    practicePrompt: "Have you ever traveled to an English-speaking country? Answer using: 'Yes, I have...' or 'No, I have never...'"
  },
  {
    matchKeywords: ['past continuous', 'was doing', 'were doing', 'imparfait en anglais'],
    title: "Past Continuous: Setting the Scene",
    rule: `The Past Continuous (*was/were + verb-ing*) describes an action that was ongoing in the past, often interrupted by another event:
• *Formula*: **was/were + verb-ing**
• *Key usage*: Action in progress in the past when another action occurred (in Past Simple).
• *Example*: *I **was studying** English when my phone rang.*`,
    examples: [
      "✓ *What were you doing yesterday at 8:00 PM?*",
      "✓ *While she was cooking dinner, the power went out.*",
      "✓ *They were discussing the project all afternoon.*"
    ],
    proTip: "Use *'while'* with past continuous (*while I was walking*) and *'when'* with past simple (*when I met him*)!",
    practicePrompt: "What were you doing earlier today before you logged onto English Booster?"
  },
  {
    matchKeywords: ['conditional', 'if clause', 'first conditional', 'second conditional', 'conditionnel en anglais'],
    title: "Mastering the English Conditionals (If Sentences)",
    rule: `Conditionals express cause and effect:
1. **First Conditional (Real & Likely future)**:
   • *Structure*: If + Present Simple, will + base verb.
   • *Example*: *If it rains tomorrow, I **will stay** home.*
2. **Second Conditional (Imaginary / Hypothetical present)**:
   • *Structure*: If + Past Simple, would + base verb.
   • *Example*: *If I **won** the lottery, I **would travel** the entire world.*
3. **Third Conditional (Past regrets / Impossible past)**:
   • *Structure*: If + Past Perfect, would have + past participle.
   • *Example*: *If I **had studied** harder, I **would have passed** the test.*`,
    examples: [
      "✓ *If you practice every day, your English **will improve** rapidly.*",
      "✓ *If I had more free time, I **would read** more books.*"
    ],
    proTip: "In hypothetical conditionals, native speakers traditionally say *'If I **were** you'* instead of *'If I was you'*!",
    practicePrompt: "Finish this sentence: 'If I could speak English completely fluently tomorrow, I would...'"
  },
  {
    matchKeywords: ['phrasal verb', 'phrasal verbs', 'verbes à particule'],
    title: "Top 10 Essential Phrasal Verbs Used Every Day",
    rule: `A phrasal verb is a **verb + preposition/adverb** that creates a completely new meaning:
1. **Look forward to**: To feel excited about a future event (*I look forward to meeting you*).
2. **Give up**: To quit or surrender (*Never give up on your goals*).
3. **Figure out**: To understand or solve a problem (*I finally figured it out*).
4. **Put off**: To postpone or delay (*Don't put off practicing English*).
5. **Get along with**: To have a friendly relationship with someone (*I get along well with my colleagues*).
6. **Run out of**: To have none left (*We ran out of coffee*).
7. **Find out**: To discover information (*I just found out the great news*).
8. **Carry out**: To perform or conduct (*They carried out the experiment*).
9. **Bring up**: To mention a topic in conversation (*Thanks for bringing that up*).
10. **Break down**: To stop functioning (*My car broke down*).`,
    examples: [
      "✓ *I'm really **looking forward to** our live speaking session!*",
      "✓ *Don't **give up**! Fluency comes with consistency.*"
    ],
    proTip: "After *'look forward to'*, always use an -ING verb: *'I look forward to hear**ing** from you'*!",
    practicePrompt: "Try picking one phrasal verb from the list and use it in a sentence!"
  },
  {
    matchKeywords: ['much vs many', 'much or many', 'différence entre much et many', 'uncountable', 'countable'],
    title: "Countable vs. Uncountable: 'Much' vs. 'Many'",
    rule: `1. **MANY** is for COUNTABLE nouns (things you can count one by one):
   • *many books*, *many people*, *many questions*, *many countries*, *many days*.
2. **MUCH** is for UNCOUNTABLE nouns (liquids, concepts, materials, collective nouns):
   • *much time*, *much water*, *much money*, *much information*, *much advice*.
3. **A LOT OF**: Works for BOTH! When in doubt in affirmative sentences, you can safely use *'a lot of'*!`,
    examples: [
      "✓ *How **many** languages do you speak?* (Languages are countable)",
      "✓ *I don't have **much** free time today.* (Time is uncountable)",
      "✓ *I have **a lot of** goals for this year.* (Universal)"
    ],
    proTip: "Warning for French speakers: In English, **'information'** and **'advice'** are ALWAYS uncountable! Never say *'informations'* or *'an advice'*. Say: *'some advice'* or *'a piece of advice'*!",
    practicePrompt: "Do you have many questions about English? Ask me one!"
  },
];

// -----------------------------------------------------------------------------
// 3. JOB INTERVIEW & PROFESSIONAL PREPARATION BANK
// -----------------------------------------------------------------------------
const INTERVIEW_TOPICS: { keywords: string[]; answer: string; example: string; tip: string }[] = [
  {
    keywords: ['tell me about yourself', 'parle moi de toi', 'présente toi', 'present yourself', 'introduce yourself'],
    answer: `Here is the winning **Present-Past-Future Formula** used by top international candidates:

1. **PRESENT**: Start with who you are right now, your current role, and your core expertise.
   • *"Currently, I am a [your profession/background] with a focus on [key skill or passion]."*
2. **PAST**: Highlight 1 or 2 relevant past experiences or achievements that built your foundation.
   • *"Before this, I gained valuable experience working on [project/field], where I successfully developed [key achievement]."*
3. **FUTURE**: Connect the dots to why you are here today and what you want to achieve next.
   • *"I'm really excited about this opportunity because I want to bring my skills in [area] to help your team grow."*`,
    example: `"Certainly! Currently, I am a passionate software engineer specializing in modern web applications. In my previous role, I led the migration of a customer portal that boosted user satisfaction by 30%. I'm excited about this opportunity because your company's mission aligns with my ambition to build scalable, impactful digital solutions."`,
    tip: "Keep your answer between 60 and 90 seconds. Don't recite your entire CV — tell a compelling, professional story!"
  },
  {
    keywords: ['why should we hire you', 'pourquoi devrions nous vous recruter', 'pourquoi vous choisir', 'why hire you'],
    answer: `The best answer combines **3 elements**:
1. You have the exact skills to do the job.
2. You will deliver measurable results.
3. You fit the culture and are genuinely passionate about their mission.`,
    example: `"You should hire me because I combine the technical skills required for this position with a proactive problem-solving mindset. In my past roles, I didn't just execute tasks — I identified bottlenecks and improved team efficiency by 25%. I'm enthusiastic about joining a forward-thinking team where I can deliver immediate value."`,
    tip: "Focus on what YOU can do for the company, not what the company can do for you!"
  },
  {
    keywords: ['strength', 'strengths', 'forces', 'points forts'],
    answer: `When presenting your strengths, always follow the **Strength + Context + Result** framework:
• State your strength clearly (e.g., adaptability, attention to detail, leadership).
• Give a 1-sentence real-world story showing it in action.
• State the positive outcome.`,
    example: `"One of my greatest strengths is clear communication and collaboration. In my last team project with tight deadlines, I established daily stand-ups that kept all stakeholders aligned, enabling us to deliver the project two weeks ahead of schedule."`,
    tip: "Avoid vague clichés like 'I am a perfectionist' without providing a tangible example."
  },
  {
    keywords: ['weakness', 'weaknesses', 'faiblesses', 'points faibles', 'défauts'],
    answer: `The secret to the 'weakness' question is: **Choose a genuine professional skill, and immediately explain the active steps you are taking to improve it!**
• Never say 'I don't have any weaknesses'.
• Never choose a fatal flaw that disqualifies you for the specific job.`,
    example: `"In the past, I sometimes found it challenging to delegate tasks because I wanted to ensure everything was done thoroughly. However, I realized this could slow the team down. Recently, I have adopted agile project management tools and focused on empowering teammates, which has significantly improved our overall productivity."`,
    tip: "Always end your answer on a positive note of continuous learning and growth!"
  },
];

// -----------------------------------------------------------------------------
// 4. FLUENCY & SPEAKING CONFIDENCE COACHING
// -----------------------------------------------------------------------------
const FLUENCY_TIPS = [
  {
    keywords: ['fear', 'shy', 'confidence', 'peur de parler', 'timide', 'accent', 'nervous', 'stress'],
    title: "How to Conquer Fear and Speak English with Confidence",
    advice: `The #1 obstacle to speaking English is not your vocabulary — it's the **fear of making mistakes**!
Here is the mindset shift that changes everything:
1. **Communication > Perfection**: Native speakers make grammatical errors every single day. The goal is to be understood, not to pass a written exam.
2. **The 3-Second Rule**: When speaking, don't mentally translate every word from French to English. Start with simple Subject-Verb-Object sentences (*I want... / I think... / We did...*).
3. **Celebrate Small Wins**: Speaking out loud with me today is already a victory! Every single minute you practice builds neural connections in your brain.`,
    proTip: "Try the 'Shadowing Technique': Listen to 10 seconds of a podcast or video, pause it, and imitate the exact rhythm and intonation out loud!"
  },
  {
    keywords: ['how to improve', 'comment progresser', 'comment m\'améliorer', 'fluent', 'fluency', 'conseils anglais'],
    title: "The 3 Golden Habits to Reach Conversational Fluency",
    advice: `Fluency is like building physical fitness. You don't need 5 hours on Sunday — you need **15 minutes every single day**:
1. **Speak Out Loud Daily**: Talk to yourself in English while cooking or getting ready. Describe what you are doing (*'Now I'm making breakfast, the weather looks nice today'*) to train your mouth muscles.
2. **Consume English with Subtitles in English**: Turn off French subtitles! When reading and hearing the words simultaneously, your vocabulary retention doubles.
3. **Practice Live Conversation with Real Partners & AI**: Engage in live voice notes, calls, and chats right here on English Booster. Consistent speaking is the single fastest path to fluency.`,
    proTip: "Consistency always beats intensity. 15 minutes every day is 10x more effective than one long weekend cram session!"
  }
];

// -----------------------------------------------------------------------------
// 5. EXTERNAL LIVE LOOKUP (TRANSLATION & WIKIPEDIA FACT EXTRACTION)
// -----------------------------------------------------------------------------

/**
 * Free instant translation API helper
 */
async function fetchTranslation(query: string, sourceLang: string = 'fr', targetLang: string = 'en'): Promise<string | null> {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(query.slice(0, 300))}&langpair=${sourceLang}|${targetLang}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
    if (res.ok) {
      const data = await res.json();
      const translated = data?.responseData?.translatedText;
      if (translated && !translated.includes('MYMEMORY WARNING')) {
        return translated.trim();
      }
    }
  } catch (err) {
    // Network fallback
  }
  return null;
}

/**
 * Free Wikipedia summary API for real-time general knowledge & world trivia
 */
async function fetchWikiFact(topic: string): Promise<string | null> {
  try {
    const cleaned = topic
      .replace(/^(what is|who is|where is|tell me about|c'est quoi|qu'est-ce que|qui est)\s+/i, '')
      .replace(/[?.,!]/g, '')
      .trim();

    if (!cleaned || cleaned.length < 2) return null;

    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleaned)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'EnglishBoosterAI/2.0 (partner-coach@englishbooster.com)' },
      signal: AbortSignal.timeout(3500),
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.extract && data.type !== 'disambiguation') {
        return data.extract;
      }
    }
  } catch (err) {
    // Fallback silently
  }
  return null;
}

// -----------------------------------------------------------------------------
// 6. MAIN COMPREHENSIVE QUESTION ANSWERING LOGIC
// -----------------------------------------------------------------------------

export async function answerPartnerQuestion(
  userMessage: string,
  userLevel: string = 'B1'
): Promise<AnswerResult> {
  const msg = (userMessage || '').trim();
  const lower = msg.toLowerCase();
  const isFrench = /[éèêàùçœîôû]|^(comment|pourquoi|qui|quel|quelle|est-ce|bonjour|salut|merci|c'est quoi|traduis|je veux|j'ai)\b/i.test(lower);

  // ---------------------------------------------------------------------------
  // Check 1: Capital & Country Questions ("capital of Canada", "capitale de la France", etc.)
  // ---------------------------------------------------------------------------
  if (/capital|capitale/i.test(lower)) {
    for (const [country, info] of Object.entries(COUNTRIES_AND_CAPITALS)) {
      if (lower.includes(country)) {
        const countryDisplayName = country.charAt(0).toUpperCase() + country.slice(1);
        const reply = isFrench
          ? `La capitale de **${countryDisplayName}** est **${info.capital}** ! 🏛️\n\n${info.facts}\n\n💡 *Note linguistique & prononciation* : ${info.tip}\n\nEn anglais, on dit : *"The capital of ${countryDisplayName} is ${info.capital}."*\n\nAs-tu déjà visité ce pays ou aimerais-tu y voyager un jour ?`
          : `The capital of **${countryDisplayName}** is **${info.capital}**! 🏛️\n\n${info.facts}\n\n💡 *Fluency & Pronunciation Note*: ${info.tip}\n\nHave you ever traveled there, or is it on your bucket list to visit one day?`;
        
        return {
          matched: true,
          reply,
          category: 'geography',
          source: 'knowledge_engine',
        };
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Check 2: Direct Translation Inquiries ("comment on dit...", "how do I say...", "traduis...")
  // ---------------------------------------------------------------------------
  let phraseToTranslate = '';
  let srcLang = 'fr';
  let tgtLang = 'en';

  const frMatch = msg.match(/(?:comment (?:on dit|dit-on|dire)|traduis(?:-moi)?|qu'est-ce que veut dire)\s+(.+?)(?:\s+en anglais|\?|$)/i);
  const enMatch = msg.match(/(?:how (?:do you|can i) say|translate|what does)\s+(.+?)(?:\s+(?:mean|in french|in english)|\?|$)/i);

  if (frMatch && frMatch[1]) {
    phraseToTranslate = frMatch[1].replace(/^["'«»\s]+|["'«»\s]+$/g, '').trim();
    srcLang = 'fr';
    tgtLang = 'en';
  } else if (enMatch && enMatch[1]) {
    phraseToTranslate = enMatch[1].replace(/^["'«»\s]+|["'«»\s]+$/g, '').trim();
    srcLang = 'en';
    tgtLang = 'fr';
  }

  if (phraseToTranslate && phraseToTranslate.length >= 2) {
    const liveTranslation = await fetchTranslation(phraseToTranslate, srcLang, tgtLang);

    if (liveTranslation) {
      const reply = isFrench
        ? `Pour dire **"${phraseToTranslate}"** en anglais naturel, on dit :\n\n👉 **"${liveTranslation}"**\n\n💡 *Conseil de prononciation & fluidité* : Répète cette phrase 3 fois à voix haute pour habituer tes cordes vocales et ta mémoire musculaire !\n\nExemple en contexte : *"I want to make sure I say '${liveTranslation}' naturally."*\n\nDans quelle situation souhaites-tu utiliser cette expression ?`
        : `To say **"${phraseToTranslate}"**, the most natural expression is:\n\n👉 **"${liveTranslation}"**\n\n💡 *Spoken English Tip*: Say it out loud three times with natural rhythm and intonation!\n\nContext example: *"It's great to know that '${liveTranslation}' expresses this accurately."*\n\nWould you like to try using it in a full sentence right now?`;

      return {
        matched: true,
        reply,
        category: 'translation',
        source: 'translation',
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Check 3: Grammar & Syntax Questions (Make vs Do, Since vs For, Conditionals, etc.)
  // ---------------------------------------------------------------------------
  for (const topic of GRAMMAR_TOPICS) {
    const hasMatch = topic.matchKeywords.some(kw => lower.includes(kw));
    if (hasMatch) {
      const reply = `### 📚 ${topic.title}\n\n${topic.rule}\n\n**Examples in authentic spoken English:**\n${topic.examples.join('\n')}\n\n💡 *Pro Coach Tip*: ${topic.proTip}\n\n🎯 **Your Turn**: ${topic.practicePrompt}`;
      return {
        matched: true,
        reply,
        category: 'grammar',
        source: 'knowledge_engine',
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Check 4: Job Interview & Professional English Coaching
  // ---------------------------------------------------------------------------
  for (const interview of INTERVIEW_TOPICS) {
    const hasMatch = interview.keywords.some(kw => lower.includes(kw));
    if (hasMatch) {
      const reply = `### 💼 Job Interview Masterclass Coaching\n\n${interview.answer}\n\n**Example of an impressive native answer:**\n> *${interview.example}*\n\n💡 *Expert Interviewer Tip*: ${interview.tip}\n\nHow would you tailor this framework to your own background? Tell me about your profession!`;
      return {
        matched: true,
        reply,
        category: 'interview',
        source: 'knowledge_engine',
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Check 5: Fluency, Shyness & Learning Advice
  // ---------------------------------------------------------------------------
  for (const f of FLUENCY_TIPS) {
    const hasMatch = f.keywords.some(kw => lower.includes(kw));
    if (hasMatch) {
      const reply = `### 🌟 ${f.title}\n\n${f.advice}\n\n💡 *Actionable Daily Technique*: ${f.proTip}\n\nHow do you feel when you speak English right now — what is the biggest challenge holding you back?`;
      return {
        matched: true,
        reply,
        category: 'fluency',
        source: 'knowledge_engine',
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Check 6: General Knowledge / Fact Inquiries via Real-time Knowledge Extraction
  // (e.g. "What is photosynthesis?", "Who was Nelson Mandela?", "C'est quoi l'intelligence artificielle ?")
  // ---------------------------------------------------------------------------
  const isQuestion = lower.includes('?') || 
    /^(what|who|where|when|why|how|which|can you|could you|explain|tell me|qu'est-ce|c'est quoi|qui est|pourquoi|comment|peux-tu|explique)\b/i.test(lower);

  if (isQuestion && lower.length > 8) {
    // Attempt real-time factual lookup
    const wikiExtract = await fetchWikiFact(msg);
    if (wikiExtract && wikiExtract.length > 40) {
      const trimmedExtract = wikiExtract.length > 400 ? wikiExtract.slice(0, 390) + '...' : wikiExtract;
      
      const reply = isFrench
        ? `Voici l'explication complète à votre question :\n\n📖 **${trimmedExtract}**\n\n💡 *En anglais* : C'est une excellente opportunité pour enrichir votre vocabulaire thématique et pratiquer des explications structurées.\n\nQuel aspect de ce sujet vous intéresse le plus ou aimeriez-vous approfondir ensemble ?`
        : `Here is the comprehensive answer to your question:\n\n📖 **${trimmedExtract}**\n\n💡 *Fluency & Vocabulary Note*: Discussing complex topics like this is one of the highest-leverage ways to elevate your English from B1/B2 to C1 fluency!\n\nWhat are your thoughts on this, or is there a specific part you'd like to explore further together?`;

      return {
        matched: true,
        reply,
        category: 'general_knowledge',
        source: 'wiki',
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Check 7: If not matched by specific knowledge bank, return matched: false
  // ---------------------------------------------------------------------------
  return {
    matched: false,
    reply: '',
    source: 'conversational',
  };
}
