'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { 
  Globe, 
  Sparkles, 
  Heart, 
  ShieldCheck, 
  Phone, 
  MessageSquare, 
  Mail, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight,
  Flame
} from 'lucide-react';

export default function AboutPage() {
  const { playSound } = useAuth();
  const { isFr } = useTranslation();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    playSound('click');
    setOpenFaq(openFaq === index ? null : index);
  };

  const FAQS = [
    {
      q: isFr ? "Qu'est-ce que le système de niveaux CEFR ?" : "What is the CEFR level system?",
      a: isFr 
        ? "Le Cadre Européen Commun de Référence pour les Langues (CEFR) standardise la maîtrise linguistique de A1 (débutant) à C2 (bilingue/maîtrise). English Booster adapte les sujets de discussion et vos partenaires selon votre niveau exact pour garantir des échanges confortables."
        : "The Common European Framework of Reference for Languages (CEFR) standardizes proficiency from A1 (beginner) to C2 (mastery/bilingual). English Booster tailors conversation prompts and partners to your exact level for optimal comfort."
    },
    {
      q: isFr ? "Comment fonctionne la correction pédagogique IA ?" : "How does AI pedagogical feedback work?",
      a: isFr
        ? "Pendant vos conversations écrites ou vos défis vocaux, notre algorithme détecte les fautes de temps, les verbes irréguliers et les prépositions trompeuses. Il ne se contente pas de corriger : il vous explique la règle grammaticale sous-jacente en un clic."
        : "During your written chats or voice challenges, our system evaluates tense consistency, irregular verbs, and linking prepositions. Beyond mere corrections, it clarifies the underlying grammatical rationale in one click."
    },
    {
      q: isFr ? "Puis-je annuler mon abonnement SaaS à tout moment ?" : "Can I cancel my SaaS subscription anytime?",
      a: isFr
        ? "Absolument. Nos abonnements Premium et Pro sont sans engagement de durée. Vous pouvez résilier ou changer de plan directement depuis votre espace profil en un seul clic."
        : "Absolutely. Our Premium and Pro tiers carry no lock-in commitments. You can cancel or upgrade directly from your profile dashboard in a single click."
    },
    {
      q: isFr ? "Les appels vidéo sont-ils sécurisés et privés ?" : "Are video and audio calls secure and private?",
      a: isFr
        ? "Oui. Toutes les connexions pair-à-pair utilisent le protocole WebRTC avec chiffrement de bout en bout (DTLS/SRTP). Aucune vidéo n'est enregistrée sans votre accord explicite."
        : "Yes. All peer-to-peer sessions leverage the WebRTC protocol with end-to-end DTLS/SRTP encryption. No calls are recorded without your explicit agreement."
    }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 space-y-16">
      
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
          <Globe className="w-3.5 h-3.5" />
          <span>{isFr ? "Notre Vision & Mission" : "Our Vision & Mission"}</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          {isFr ? "Connecter le Monde par la Parole" : "Connecting the World Through Spoken Words"}
        </h1>
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
          {isFr 
            ? "English Booster est né d'un constat universel : apprendre une langue dans des livres ne suffit pas. C'est en osant parler que naît la véritable confiance."
            : "English Booster was created from a universal truth: learning a language through textbooks alone is never enough. True confidence is born when you dare to speak."}
        </p>
      </div>

      {/* FOUNDER SPOTLIGHT SECTION */}
      <div className="saas-card p-8 sm:p-12 relative overflow-hidden bg-gradient-to-br from-[#0c1630] to-[#0a1124] border border-emerald-400/30 shadow-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          <div className="lg:col-span-5 flex flex-col items-center text-center">
            <div className="relative">
              <img
                src="https://bolmrscavaeiqzytfzej.supabase.co/storage/v1/object/public/avatars/30c6222c-7d9e-4086-a289-19ca5b81262c/1791825017392.jpeg"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/images/tychique-bongo.jpg'; }}
                alt="Tychique Bongo - Fondateur"
                className="w-52 h-52 sm:w-60 sm:h-60 rounded-3xl object-cover ring-4 ring-emerald-400/50 shadow-2xl"
              />
              <span className="absolute -bottom-3 px-4 py-1 bg-gradient-to-r from-emerald-400 to-teal-300 text-slate-950 font-black text-xs uppercase tracking-wider rounded-full shadow-lg">
                {isFr ? "Fondateur & CEO" : "Founder & CEO"}
              </span>
            </div>
            <h2 className="text-2xl font-black text-white mt-6">Tychique Bongo</h2>
            <p className="text-xs text-emerald-300 font-bold mt-1">
              {isFr ? "Directeur Général • Côte d'Ivoire 🇨🇮" : "Executive Director • Côte d'Ivoire 🇨🇮"}
            </p>
          </div>

          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isFr ? "Leadership & Vision Internationale" : "Global Leadership & Vision"}</span>
            </div>

            <p className="text-slate-200 text-base sm:text-lg leading-relaxed italic">
              {isFr
                ? "« J'ai vu tant de talents brillants freinés dans leur carrière simplement parce qu'ils n'osaient pas s'exprimer en anglais devant un public international. Mon engagement avec English Booster est d'offrir à chaque apprenant un environnement stimulant, bienveillant et technologique pour libérer son potentiel oral. »"
                : "« I have seen countless brilliant individuals held back in their careers simply because they hesitated to speak English in front of an international audience. My mission with English Booster is to provide every learner with an encouraging, welcoming, high-tech space to unlock their spoken voice. »"}
            </p>

            <div className="pt-4 border-t border-white/10 space-y-2.5 text-xs text-slate-300">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-emerald-400" />
                <a href="mailto:tychiquebongo@gmail.com" className="hover:text-emerald-400 font-bold transition-colors">
                  tychiquebongo@gmail.com
                </a>
              </div>
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <a href="https://wa.me/242069053712" target="_blank" rel="noreferrer" className="hover:text-emerald-400 font-bold transition-colors">
                  WhatsApp Direct : +242 06 905 37 12
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-emerald-400" />
                <a href="tel:+2250705884687" className="hover:text-emerald-400 font-bold transition-colors">
                  {isFr ? "Téléphone" : "Phone"} : +225 07 05 88 46 87
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* CORE VALUES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="saas-card bg-[#080d1a] border-white/10 shadow-sm p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Flame className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-base">
            {isFr ? "Pratique Active" : "Active Practice"}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {isFr
              ? "La parole prime sur la théorie. Plus vous pratiquez, plus les automatismes linguistiques s'ancrent naturellement dans votre esprit."
              : "Speaking takes precedence over passive theory. The more you speak, the faster conversational fluency becomes second nature."}
          </p>
        </div>

        <div className="saas-card bg-[#080d1a] border-white/10 shadow-sm p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-base">
            {isFr ? "Assistance IA Pédagogique" : "AI Pedagogical Support"}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {isFr
              ? "L'intelligence artificielle vous accompagne sans jamais juger, en suggérant des corrections précises et des thèmes de débats captivants."
              : "AI accompanies your progress with supportive feedback, suggesting precise phrasing alternatives and engaging discussion prompts."}
          </p>
        </div>

        <div className="saas-card bg-[#080d1a] border-white/10 shadow-sm p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Globe className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-base">
            {isFr ? "Fraternité Mondiale" : "Global Community"}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {isFr
              ? "Nos membres viennent de nombreux pays. Chaque appel est une opportunité de découvrir une culture et d'élargir ses horizons."
              : "Our members connect from across the world. Every call is an opportunity to discover new perspectives and build global friendships."}
          </p>
        </div>
      </div>

      {/* FAQ SECTION */}
      <div className="saas-card bg-[#080d1a] border-white/10 shadow-sm p-6 sm:p-10 space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl font-black text-white">
            {isFr ? "Questions Fréquemment Posées" : "Frequently Asked Questions"}
          </h2>
          <p className="text-xs text-slate-400">
            {isFr ? "Tout ce que vous devez savoir pour démarrer sereinement." : "Everything you need to know to get started smoothly."}
          </p>
        </div>

        <div className="space-y-3 max-w-3xl mx-auto">
          {FAQS.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden transition-all"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full p-4 text-left font-bold text-sm text-white flex items-center justify-between gap-4 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 text-xs text-slate-300 leading-relaxed border-t border-white/10 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
