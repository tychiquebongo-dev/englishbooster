const fs = require('fs');

const content = fs.readFileSync('scratch/i18n.js.bak', 'utf8');
const match = content.match(/const translations = (\{[\s\S]*?\n  \};\n\n  \/\/ 2\.)/);
const code = 'return ' + match[1].replace(/;\n\n  \/\/ 2\.$/, '');
const t = new Function(code)();

// Add or refine keys for Next.js app
t.fr.nav_chat = 'Conversation Internationale';
t.en.nav_chat = 'International Chat';
t.fr.nav_admin = 'Back Office Admin';
t.en.nav_admin = 'Admin Back Office';

// Admin specific keys
t.fr.admin_title = 'Administration Centrale';
t.en.admin_title = 'Central Administration';
t.fr.admin_subtitle = 'Supervision des membres inscrits, abonnements, défis vocaux et modération en temps réel.';
t.en.admin_subtitle = 'Supervision of registered members, subscriptions, voice challenges, and real-time moderation.';
t.fr.admin_tab_overview = "Vue d'Ensemble & Métriques";
t.en.admin_tab_overview = 'Overview & Metrics';
t.fr.admin_tab_users = 'Membres Inscrits';
t.en.admin_tab_users = 'Registered Users';
t.fr.admin_tab_subscriptions = 'Abonnements & Revenus';
t.en.admin_tab_subscriptions = 'Subscriptions & Revenue';
t.fr.admin_tab_challenges = 'Défis Vocaux';
t.en.admin_tab_challenges = 'Voice Challenges';
t.fr.admin_tab_partners = 'Partenaires Mondiaux';
t.en.admin_tab_partners = 'Global Partners';
t.fr.admin_tab_community = 'Modération Communauté';
t.en.admin_tab_community = 'Community Moderation';
t.fr.admin_tab_calls = 'Sessions & Appels Live';
t.en.admin_tab_calls = 'Live Calls & Sessions';
t.fr.admin_tab_settings = 'Configuration & Paramètres';
t.en.admin_tab_settings = 'Settings & Configuration';

const header = `'use client';\n\nimport { useAuth } from '@/context/AuthContext';\n\nexport type Language = 'fr' | 'en';\n\nexport const translations: Record<Language, Record<string, string>> = `;
const footer = `;\n\nexport function translate(key: string, lang: Language = 'fr', fallback?: string): string {\n  const dict = translations[lang] || translations.fr;\n  if (dict && dict[key]) {\n    return dict[key];\n  }\n  const fallbackDict = lang === 'fr' ? translations.en : translations.fr;\n  if (fallbackDict && fallbackDict[key]) {\n    return fallbackDict[key];\n  }\n  return fallback || key;\n}\n\nexport function useTranslation() {\n  const { lang, setLang } = useAuth();\n\n  const t = (key: string, fallback?: string): string => {\n    return translate(key, lang, fallback);\n  };\n\n  return {\n    lang,\n    setLang,\n    t,\n    isFr: lang === 'fr',\n    isEn: lang === 'en',\n    toggleLang: () => setLang(lang === 'fr' ? 'en' : 'fr'),\n  };\n}\n`;

fs.writeFileSync('lib/i18n.ts', header + JSON.stringify(t, null, 2) + footer, 'utf8');
console.log('Successfully created lib/i18n.ts with ' + Object.keys(t.fr).length + ' keys!');
