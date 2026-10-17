# 🌎 English Booster : International Communication & Learning Platform

> **"Connect. Speak. Improve."**
> *"Improve your English by speaking with the world."*

English Booster is an EdTech web platform designed to solve a common global challenge: millions of people study English for years in classrooms but lack opportunities to speak fluently and with confidence.

---

## 🌟 Key Features

1. **Crystal Glassmorphism Design System**
   - High-performance vanilla HTML5, CSS3, and ES6+ JavaScript.
   - Deep Navy Blue (`#060a14`) base with Purple-400 (`#c084fc`) and Pure White (`#ffffff`) crystal luminescence.
   - Custom crystallized background engine with floating prisms, radial mesh glow, and frosted backdrop filters (`backdrop-filter: blur(20px)`).
   - Seamless **Dark Mode / Light Mode** toggle persisted in `localStorage`.
   - Web Audio API sound effects synthesizer (gentle clicks, XP celebration chimes, call ringing) without any external audio file dependencies.

2. **International Partner Matching**
   - Curated database of international conversation partners with CEFR proficiency levels (A1 to C2).
   - AI Compatibility Score calculation (e.g. 98% Match) based on learning goals, availability, and shared passions.
   - Granular filtering by country, CEFR level, native language, interests, and real-time online status.

3. **Live Chat & Google Gemini AI Universal Coach (Emma AI 24/7)**
   - 24/7 AI Speaking Coach powered by **Google Gemini** (`gemini-1.5-flash`, `gemini-2.0-flash`).
   - Answers **ANY question** across any domain (culture, science, tech, career, grammar rules, job interviews).
   - Multi-format support: **Written dialogue and real spoken audio voice notes** with interactive waveforms.
   - Built-in **Speech-to-Text Voice Dictation** allowing users to dictate questions directly via microphone.
   - Intelligent pedagogical grammar coaching with gentle corrections and vocabulary enrichment.

4. **Live Audio & Video Calling Room**
   - Audio and video toggles (Mute/Unmute, Camera On/Off, Screen Share).
   - Real-time elapsed duration counter (`12:43`).
   - Direct AI voice and video calls powered by **Google Gemini** with live speech recognition and vocal synthesis.
   - Post-call summary with speaking duration, fluency score, and `+50 XP` reward.

5. **AI English Coach (Emma AI Powered by Gemini)**
   - Universal knowledge mentor capable of answering any question and adapting to CEFR levels (A1 to C2).
   - Instant text-to-speech voice playback in natural British/American English.
   - Radar and bar analytics tracking: Speaking, Vocabulary, Grammar, Fluency, and Confidence.

6. **Daily Challenges & Gamification**
   - Featured daily speaking prompts (e.g., *"What is your dream destination?"*).
   - Interactive audio response submission with confetti explosion and `+100 XP`.
   - Badges collection: *First Conversation*, *7 Day Streak*, *Global Speaker*, *Conversation Master*, *Vocabulary Builder*, and *English Champion*.

7. **Community Social Feed**
   - Global discussion board for questions, idioms (e.g. *"Break a leg!"*), and milestones.
   - Interactive like buttons, comment threads, and post creator.

8. **Global Champions Leaderboard**
   - 3D Podium for top 3 champions (🥇 Alex 12,450 XP, 🥈 Maria 11,820 XP, 🥉 John 10,940 XP).
   - Filterable tabs for Global, Weekly, Country, and Friends.

9. **Founder & Leadership Spotlight**
   - Dedicated spotlight for **Tychique Bongo**:
     - Phone: `+225 07 05 88 46 87`
     - WhatsApp: `+242 905 37 12`
     - Email: `tychiquebongo@gmail.com`

---

## 📁 Project Structure

```text
English Booster/
│
├── index.html                # Premium Landing Page (Hero, Crystal BG, How it Works, Stats, Founder)
│
├── pages/
│   ├── login.html            # Authentication & 1-click demo logins
│   ├── register.html         # Multi-step signup form with real-time validation
│   ├── dashboard.html        # Learner dashboard (CEFR progress, streak, speaking time, XP)
│   ├── partners.html         # Partner matching directory with AI match scores
│   ├── chat.html             # Messaging room with AI grammar corrections
│   ├── call.html             # Live audio/video conversation stage
│   ├── challenges.html       # Daily speaking challenges & XP badges
│   ├── community.html        # Social feed with questions, idioms & comments
│   ├── leaderboard.html      # Global English champions rankings & podium
│   ├── pricing.html          # Free, Premium ($4.99) and Pro ($9.99) tiers
│   ├── profile.html          # User profile, CEFR assessment & badge showcase
│   └── about.html            # Mission, Founder Tychique Bongo & FAQ accordion
│
├── css/
│   ├── style.css             # Design tokens, crystal glassmorphism & layout
│   ├── animations.css        # Keyframes, waveform pulses, particles & reveal
│   └── responsive.css        # Mobile navigation drawer & bottom dock
│
├── js/
│   ├── main.js               # Audio FX engine, theme manager, user state & confetti
│   ├── auth.js               # Form validations & demo account switchers
│   ├── dashboard.js          # Dashboard dynamic metrics & weekly charts
│   ├── matching.js           # Database of global partners & AI match calculation
│   ├── chat.js               # Messaging engine & pedagogical grammar corrector
│   ├── call.js               # Audio/video calling controls, timer & post-call modal
│   ├── coach.js              # AI coach speech recognition & synthesis
│   ├── challenges.js         # Daily voice recording & XP claim system
│   ├── community.js          # Feed interactions, comments & likes
│   ├── leaderboard.js        # Rankings podium and tab filters
│   └── animations.js         # Scroll observer & animated number counters
│
└── assets/
    └── images/
        ├── hero-community.jpg       # High-tech global community illustration
        ├── ai-coach-preview.jpg     # AI Coach visual interface
        └── tychique-bongo.jpg       # Founder photo portrait
```

---

## 🚀 Getting Started

No build step or external dependencies are required. The project runs immediately in any modern web browser.

### Option 1: Direct File Preview
Simply open `index.html` in your browser:
```bash
start index.html
```

### Option 2: Local HTTP Server (Recommended)
You can start a lightweight local web server using Python or Node.js:

Using Node `npx serve`:
```bash
npx serve . -l 3000
```

Using Python:
```bash
python -m http.server 3000
```
Then navigate to `http://localhost:3000`.

---

## ⚡ Real Registered Community Profiles

The platform displays genuine real registered profiles from the database:
- **Tychique Bongo**: Founder & C2 Proficient (Ivory Coast 🇨🇮)
- Real registered members practicing spoken English in real time.

---

## 🛡️ Accessibility & Standards
- Semantic HTML5 structure with landmark roles (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`, `<aside>`).
- Responsive typography with relative `rem` units.
- ARIA labels on all icon-only buttons.
- High contrast compliance on both Crystal Dark and Light themes.
