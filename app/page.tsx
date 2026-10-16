'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { 
  Sparkles, 
  ArrowRight, 
  Users, 
  PhoneCall, 
  CheckCircle2, 
  HeartHandshake,
  Radio,
  Globe,
  ShieldCheck,
  LayoutDashboard
} from 'lucide-react';
import HeroInteractiveHub from '@/components/HeroInteractiveHub';

export default function HomePage() {
  const router = useRouter();
  const { playSound, user, profile, loading, isAdmin } = useAuth();
  const { isFr } = useTranslation();

  const userEmail = (user?.email || '').toLowerCase().trim();
  const isUserAdmin = Boolean(
    isAdmin ||
    profile?.role === 'admin' ||
    userEmail === 'tychiquebongo@gmail.com' ||
    userEmail === 'tychiquebong@gmail.com'
  );

  return (
    <div className="relative overflow-hidden pb-20">
      
      {/* HERO SECTION */}
      <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        
        {/* Admin Quick Switcher Banner */}
        {isUserAdmin && (
          <div className="flex justify-center mb-6 animate-fade-in">
            <Link
              href="/admin"
              onClick={() => playSound('click')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-300 hover:text-white hover:bg-rose-500/25 transition-all text-xs sm:text-sm font-black shadow-lg hover:scale-105"
            >
              <ShieldCheck className="w-4 h-4 text-rose-400" />
              <span>{isFr ? "⚡ Mode Administrateur Actif — Ouvrir le Back Office Admin" : "⚡ Admin Mode Active — Open Back Office"}</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1 text-rose-400" />
            </Link>
          </div>
        )}

        {/* Floating Tag */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-bold tracking-wide shadow-[0_0_20px_rgba(74,222,128,0.2)] animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>{isFr ? "Pratiquez l'anglais oral en direct avec le monde entier" : "Practice live spoken English with the world"}</span>
            <Sparkles className="w-3.5 h-3.5 ml-1" />
          </div>
        </div>

        {/* Main Title */}
        <div className="text-center max-w-4xl mx-auto space-y-6">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.1]">
            {isFr ? "Améliorez votre anglais en " : "Improve Your English by "}
            <span className="bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-500 bg-clip-text text-transparent">
              {isFr ? "parlant en direct" : "Speaking Live"}
            </span>{' '}
            {isFr ? "avec le monde entier." : "With the World."}
          </h1>

          <p className="text-base sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {isFr 
              ? "Fini la théorie passive. Rejoignez notre communauté mondiale, pratiquez lors de véritables conversations 1-on-1 et progressez rapidement avec des interlocuteurs internationaux."
              : "No more passive studying. Connect with global peers, practice authentic 1-on-1 conversations, and build the confidence to speak fluent English naturally."}
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            {isUserAdmin ? (
              <>
                <Link
                  href="/admin"
                  onClick={() => playSound('chime')}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-slate-950 bg-gradient-to-r from-rose-400 via-amber-300 to-emerald-400 hover:opacity-95 shadow-[0_0_30px_rgba(244,63,94,0.35)] transition-all transform hover:scale-[1.03] active:scale-[0.98] flex items-center justify-center gap-3 text-base"
                >
                  <ShieldCheck className="w-5 h-5 text-slate-950" />
                  <span>{isFr ? "Panneau Admin Central" : "Central Admin Panel"}</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>

                <Link
                  href="/dashboard"
                  onClick={() => playSound('click')}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-slate-800 dark:text-white bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] border border-slate-200 dark:border-white/15 transition-all flex items-center justify-center gap-2.5 text-base shadow-sm"
                >
                  <LayoutDashboard className="w-5 h-5 text-emerald-500" />
                  <span>{isFr ? "Mon Dashboard Étudiant" : "My Student Dashboard"}</span>
                </Link>
              </>
            ) : user ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => playSound('chime')}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-blue-400 hover:opacity-95 shadow-[0_0_30px_rgba(74,222,128,0.4)] transition-all transform hover:scale-[1.03] active:scale-[0.98] flex items-center justify-center gap-3 text-base"
                >
                  <span>{isFr ? "Accéder à mon Dashboard" : "Go to Dashboard"}</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>

                <Link
                  href="/partners"
                  onClick={() => playSound('click')}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-slate-800 dark:text-white bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] border border-slate-200 dark:border-white/15 transition-all flex items-center justify-center gap-2.5 text-base shadow-sm"
                >
                  <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>{isFr ? "Trouver un Partenaire" : "Find a Partner"}</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/register"
                  onClick={() => playSound('chime')}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-blue-400 hover:opacity-95 shadow-[0_0_30px_rgba(74,222,128,0.4)] transition-all transform hover:scale-[1.03] active:scale-[0.98] flex items-center justify-center gap-3 text-base"
                >
                  <span>{isFr ? "Commencer Gratuitement" : "Get Started Free"}</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>

                <Link
                  href="/partners"
                  onClick={() => playSound('click')}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-slate-800 dark:text-white bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] border border-slate-200 dark:border-white/15 transition-all flex items-center justify-center gap-2.5 text-base shadow-sm"
                >
                  <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>{isFr ? "Explorer les Partenaires" : "Explore Partners"}</span>
                </Link>
              </>
            )}
          </div>


          {/* Trust Highlights */}
          <div className="pt-10 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{isFr ? "Sans carte de crédit requise" : "No credit card required"}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{isFr ? "Vrais membres inscrits" : "Real registered members"}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{isFr ? "Salons WebRTC temps réel" : "Real-time WebRTC rooms"}</span>
            </div>
          </div>

        </div>

        {/* Dynamic Activity Pulse Strip - 100% Authentic */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 max-w-4xl mx-auto">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-bold shadow-sm backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>{isFr ? "Vrais membres inscrits uniquement" : "Real registered members only"}</span>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-bold shadow-sm backdrop-blur-md">
            <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span>{isFr ? "Salons WebRTC temps réel (6 max)" : "Real-time WebRTC rooms (6 max)"}</span>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-bold shadow-sm backdrop-blur-md">
            <span className="text-amber-400">🔥</span>
            <span>{isFr ? "Espace Statuts & Stories direct" : "Direct Status & Stories space"}</span>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-300 text-xs font-bold shadow-sm backdrop-blur-md">
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span>{isFr ? "Échanges internationaux spontanés" : "Spontaneous international speech"}</span>
          </div>
        </div>

        {/* Hero Interactive Showcase Hub */}
        <HeroInteractiveHub />

      </section>

      {/* PLATFORM ADVANTAGES / FEATURES */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 mb-2">
            {isFr ? "Technologie & Pratique Réelle" : "Technology & Real Practice"}
          </h2>
          <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
            {isFr ? "Tout ce dont vous avez besoin pour parler couramment" : "Everything You Need to Speak English Confidently"}
          </p>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-3">
            {isFr ? "Conçu pour vous sortir de votre zone de confort avec bienveillance et motivation." : "Designed to take you out of your comfort zone with friendliness and motivation."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Card 1 */}
          <div className="saas-card group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              {isFr ? "Partenaires Internationaux" : "International Partners"}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              {isFr 
                ? "Connectez-vous avec des étudiants et professionnels au Japon, en Espagne, au Nigéria, en Allemagne et partagez vos passions communes."
                : "Connect with learners and professionals in Japan, Spain, Nigeria, Germany and share your common passions in fluent English."}
            </p>
            <Link href="/partners" className="text-sm text-emerald-700 dark:text-emerald-400 font-bold hover:underline inline-flex items-center gap-1.5">
              {isFr ? "Explorer le répertoire" : "Browse directory"} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 2 */}
          <div className="saas-card group">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6 group-hover:scale-110 transition-transform">
              <PhoneCall className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              {isFr ? "Appels WebRTC & Salons en Direct" : "WebRTC Calls & Live Rooms"}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              {isFr 
                ? "Salons vidéo et audio ultra-fluides avec incitation de sujets de discussion pour ne jamais manquer d'inspiration."
                : "Ultra-smooth video and audio rooms with guided conversation prompts so you never run out of ideas."}
            </p>
            <Link href="/call" className="text-sm text-blue-600 dark:text-blue-400 font-bold hover:underline inline-flex items-center gap-1.5">
              {isFr ? "Rejoindre un salon" : "Join a room"} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 3 */}
          <div className="saas-card group">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-6 group-hover:scale-110 transition-transform">
              <Radio className="w-6 h-6 text-amber-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              {isFr ? "Espace Statuts & Stories" : "Status & Stories Space"}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              {isFr 
                ? "Partagez vos réflexions quotidiennes, découvrez les vidéos et conseils de prononciation publiés par les membres et le fondateur."
                : "Share daily thoughts, watch short video clips and pronunciation tips published by genuine members and the founder."}
            </p>
            <Link href="/status" className="text-sm text-amber-700 dark:text-amber-400 font-bold hover:underline inline-flex items-center gap-1.5">
              {isFr ? "Explorer les statuts du jour" : "Explore today's statuses"} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </section>

      {/* FOUNDER SPOTLIGHT */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="saas-card p-8 sm:p-12 relative overflow-hidden bg-white dark:bg-gradient-to-r dark:from-[#0a1124] dark:to-[#0d1730] border border-slate-200 dark:border-white/15 shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-4 flex flex-col items-center text-center">
              <div className="relative">
                <img
                  src="https://bolmrscavaeiqzytfzej.supabase.co/storage/v1/object/public/avatars/30c6222c-7d9e-4086-a289-19ca5b81262c/1791825017392.jpeg"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/images/tychique-bongo.jpg'; }}
                  alt="Tychique Bongo - Fondateur"
                  className="w-44 h-44 sm:w-52 sm:h-52 rounded-3xl object-cover ring-4 ring-emerald-500/40 shadow-2xl"
                />
                <span className="absolute -bottom-3 px-3 py-1 bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-full shadow-lg">
                  {isFr ? "Fondateur & CEO" : "Founder & CEO"}
                </span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-5">Tychique Bongo</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Côte d'Ivoire & International 🇨🇮</p>
            </div>

            <div className="lg:col-span-8 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                <HeartHandshake className="w-3.5 h-3.5" />
                <span>{isFr ? "Le Mot du Fondateur" : "Founder's Message"}</span>
              </div>

              <blockquote className="text-lg sm:text-xl text-slate-700 dark:text-slate-200 font-medium leading-relaxed italic">
                {isFr 
                  ? "« Des millions de personnes apprennent l'anglais pendant des années sans jamais oser parler. English Booster a été créé pour briser ce mur du silence. En connectant des humains de cultures différentes dans un cadre stimulant, nous transformons l'hésitation en fluidité naturelle. »"
                  : "« Millions of people study English for years without ever daring to speak. English Booster was built to break through that barrier. By connecting people across cultures in an encouraging space, we turn hesitation into natural fluency. »"}
              </blockquote>

              <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-bold">
                <a
                  href="https://wa.me/242069053712"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 transition-colors flex items-center gap-2 shadow-sm"
                >
                  <span>WhatsApp direct : +242 06 905 37 12</span>
                </a>
                <a
                  href="mailto:tychiquebongo@gmail.com"
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-colors shadow-sm"
                >
                  Email : tychiquebongo@gmail.com
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center">
        <div className="p-10 sm:p-16 rounded-3xl bg-white dark:bg-[#070d1e]/95 border border-slate-200 dark:border-emerald-500/30 backdrop-blur-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8),0_0_40px_rgba(16,185,129,0.15)] space-y-6 relative overflow-hidden">
          {/* Ambient top light line */}
          <div className="absolute -top-px inset-x-12 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent pointer-events-none" />
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight relative z-10">
            {isFr ? "Prêt à parler anglais avec assurance ?" : "Ready to Speak English with Confidence?"}
          </h2>
          <p className="text-slate-800 dark:text-slate-100 font-semibold text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed relative z-10 drop-shadow-sm">
            {isFr 
              ? "Rejoignez English Booster dès aujourd'hui. Votre première session de conversation internationale est à portée de clic."
              : "Join English Booster today. Your first international speaking session is only a click away."}
          </p>
          <div className="pt-4 relative z-10">
            <Link
              href="/register"
              onClick={() => playSound('chime')}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-blue-400 hover:opacity-95 text-base shadow-[0_0_35px_rgba(74,222,128,0.45)] transition-all transform hover:scale-105"
            >
              <span>{isFr ? "Créer mon profil gratuit" : "Create Free Profile"}</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
